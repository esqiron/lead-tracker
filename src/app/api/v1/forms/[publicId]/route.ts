import { captureLead, clientIp, notifyLeadOwner, validateCapture, withinRateLimit } from "@/lib/capture";
import { getPublicForm, isSafeRedirect, siteOrigin, toOrigin } from "@/lib/capture-forms";

// Submissions for hosted forms. Accepts a normal HTML form post (answers with a
// redirect) or JSON via fetch (answers with JSON and CORS headers).

type Form = NonNullable<Awaited<ReturnType<typeof getPublicForm>>>;

// The form's own page is always allowed. With no allowed origins configured,
// any site may post (handy for testing; restrict it in Settings).
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

  const respond = (ok: boolean, message: string, status: number) => {
    if (wantsJson) {
      return Response.json(ok ? { ok: true } : { ok: false, error: message }, { status, headers: corsHeaders(form && originAllowed(form, origin) ? origin : null) });
    }
    if (ok && form && isSafeRedirect(form.redirect_url)) return Response.redirect(form.redirect_url, 303);
    const target = new URL(formPage);
    target.searchParams.set(ok ? "sent" : "error", ok ? "1" : message);
    return Response.redirect(target, 303);
  };

  if (!form) return respond(false, "This form isn't available.", 404);
  if (!originAllowed(form, origin)) return respond(false, "This site isn't allowed to use this form.", 403);

  let raw: Record<string, unknown>;
  try {
    raw = contentType.includes("application/json")
      ? ((await request.json()) as Record<string, unknown>)
      : Object.fromEntries([...(await request.formData()).entries()].filter(([, v]) => typeof v === "string"));
  } catch {
    return respond(false, "The submission couldn't be read.", 400);
  }
  if (!raw || typeof raw !== "object") return respond(false, "The submission couldn't be read.", 400);

  // Bots: a filled hidden field, or a submit faster than a person could type.
  // They get a normal-looking success so they don't adapt.
  const renderedAt = Number(raw._t);
  if ((typeof raw._gotcha === "string" && raw._gotcha) || (renderedAt && Date.now() - renderedAt < 2000)) {
    return respond(true, "", 200);
  }

  const ip = clientIp(request);
  const allowed =
    (await withinRateLimit(`form:${form.id}:${ip}:m`, 5, 60)) &&
    (await withinRateLimit(`form:${form.id}:${ip}:h`, 30, 3600)) &&
    (await withinRateLimit(`form:${form.id}:h`, 500, 3600));
  if (!allowed) return respond(false, "Too many submissions. Please try again in a few minutes.", 429);

  // Only the fields this form shows are accepted, so visitors can't set the
  // owner, stage, value or source.
  const picked: Record<string, unknown> = {};
  for (const field of form.fields) {
    const value = typeof raw[field.key] === "string" ? (raw[field.key] as string).trim() : "";
    if (field.required && !value) return respond(false, `${field.label} is required.`, 422);
    if (value) picked[field.key] = value;
  }
  if (form.consent_text) {
    const consent = raw.consent === true || (typeof raw.consent === "string" && ["on", "true", "yes", "1"].includes(raw.consent.toLowerCase()));
    if (!consent) return respond(false, "Please accept the consent statement.", 422);
    picked.consent = true;
  }

  const validated = validateCapture(picked);
  if ("errors" in validated) return respond(false, Object.values(validated.errors)[0] ?? "Check the form and try again.", 422);

  try {
    const result = await captureLead(form.org_id, validated.data, { formId: form.id });
    if (form.notify_owner) await notifyLeadOwner(form.org_id, result, validated.data, `the “${form.name}” form`);
    return respond(true, "", 200);
  } catch (err) {
    console.error("Form lead capture failed", err);
    return respond(false, "Something went wrong. Please try again.", 500);
  }
}
