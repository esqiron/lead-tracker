import { captureLead, notifyLeadOwner, validateCapture } from "@/lib/capture";
import { checkFormToken, FORM_ERRORS, getPublicForm, isSafeRedirect, siteOrigin, toOrigin, type FormErrorCode } from "@/lib/capture-forms";
import { clientIp, withinRateLimit } from "@/lib/rate-limit";

// Submissions for hosted forms. Accepts a normal HTML form post (answers with a
// redirect) or JSON via fetch (answers with JSON and CORS headers).

const MAX_BODY_BYTES = 64 * 1024;

type Form = NonNullable<Awaited<ReturnType<typeof getPublicForm>>>;

// The form's own page is always allowed. With no allowed origins configured,
// any site may post. This stops other sites embedding the form; it is not
// spam protection (scripts can omit the Origin header).
function originAllowed(form: Form, origin: string | null) {
  if (!origin) return true;
  if (origin === siteOrigin()) return true;
  if (!form.allowed_origins.length) return true;
  return form.allowed_origins.some((o) => toOrigin(o) === origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  return origin ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" } : {};
}

export async function OPTIONS(request: Request, ctx: RouteContext<"/api/v1/forms/[publicId]">) {
  const { publicId } = await ctx.params;
  const form = await getPublicForm(publicId);
  const origin = request.headers.get("origin");
  if (!form || !originAllowed(form, origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request, ctx: RouteContext<"/api/v1/forms/[publicId]">) {
  const { publicId } = await ctx.params;
  const origin = request.headers.get("origin");
  const contentType = request.headers.get("content-type") ?? "";
  const wantsJson = contentType.includes("application/json") || (request.headers.get("accept") ?? "").includes("application/json");

  const form = await getPublicForm(publicId);
  const formPage = new URL(`/f/${publicId}`, siteOrigin());

  const respond = (ok: boolean, code: FormErrorCode | null, status: number) => {
    if (wantsJson) {
      return Response.json(ok ? { ok: true } : { ok: false, error: code ? FORM_ERRORS[code] : "" }, {
        status,
        headers: corsHeaders(form && originAllowed(form, origin) ? origin : null),
      });
    }
    if (ok && form && isSafeRedirect(form.redirect_url)) return Response.redirect(form.redirect_url, 303);
    const target = new URL(formPage);
    if (ok) target.searchParams.set("sent", "1");
    else if (code) target.searchParams.set("error", code);
    return Response.redirect(target, 303);
  };

  if (!form) return respond(false, "unavailable", 404);
  if (!originAllowed(form, origin)) return respond(false, "origin", 403);

  // Size check before reading anything.
  const length = Number(request.headers.get("content-length"));
  if (!length || length > MAX_BODY_BYTES) return respond(false, length ? "too_large" : "unreadable", length ? 413 : 411);

  // Limits come before parsing, and fail closed: anonymous traffic shouldn't
  // be able to switch them off by overloading the limiter.
  const ip = clientIp(request);
  const limited =
    !(await withinRateLimit(["form-ip-m", form.id, ip], 5, 60, { failClosed: true })) ||
    !(await withinRateLimit(["form-ip-h", form.id, ip], 30, 3600, { failClosed: true })) ||
    !(await withinRateLimit(["form-h", form.id], 500, 3600, { failClosed: true }));
  if (limited) return respond(false, "rate", 429);

  let raw: Record<string, unknown>;
  try {
    raw = contentType.includes("application/json")
      ? ((await request.json()) as Record<string, unknown>)
      : Object.fromEntries([...(await request.formData()).entries()].filter(([, v]) => typeof v === "string"));
  } catch {
    return respond(false, "unreadable", 400);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return respond(false, "unreadable", 400);

  // Bots: a filled hidden field, or a forged/too-fast render token. They get a
  // normal-looking success so they don't adapt.
  if ((typeof raw._gotcha === "string" && raw._gotcha) || checkFormToken(form.public_id, raw._t) === "bot") {
    return respond(true, null, 200);
  }

  // Only the fields this form shows are accepted, so visitors can't set the
  // owner, stage, value or source.
  const picked: Record<string, unknown> = {};
  for (const field of form.fields) {
    const value = typeof raw[field.key] === "string" ? (raw[field.key] as string).trim() : "";
    if (field.required && !value) return respond(false, "required", 422);
    if (value) picked[field.key] = value;
  }
  if (form.consent_text) {
    const consent = raw.consent === true || (typeof raw.consent === "string" && ["on", "true", "yes", "1"].includes(raw.consent.toLowerCase()));
    if (!consent) return respond(false, "consent", 422);
    picked.consent = true;
  }

  const validated = validateCapture(picked);
  if ("errors" in validated) return respond(false, "invalid", 422);

  try {
    const result = await captureLead(form.org_id, validated.data, { formId: form.id });
    // At most 30 notification emails per form per hour.
    if (form.notify_owner && (await withinRateLimit(["form-notify", form.id], 30, 3600))) {
      await notifyLeadOwner(form.org_id, result, validated.data, `the “${form.name}” form`);
    }
    return respond(true, null, 200);
  } catch (err) {
    console.error("Form lead capture failed", err);
    return respond(false, "failed", 500);
  }
}
