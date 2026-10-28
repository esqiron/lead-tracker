import { authenticateApiKey, captureLead, validateCapture, withinRateLimit } from "@/lib/capture";

// Public API for creating leads from other systems (website backends, Zapier,
// Make, n8n…). Server-to-server only: no CORS headers, so browsers can't call
// it and API keys don't end up in front-end code. See docs/lead-capture.md.

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request: Request) {
  const key = await authenticateApiKey(request);
  if (!key) return json({ error: "Missing or invalid API key." }, 401);

  if (!(await withinRateLimit(`api:${key.id}`, 120, 60))) {
    return json({ error: "Too many requests: the limit is 120 per minute per key." }, 429, { "Retry-After": "60" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The request body must be JSON." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "The request body must be a JSON object." }, 400);
  }

  const validated = validateCapture(body as Record<string, unknown>);
  if ("errors" in validated) return json({ error: "Validation failed.", fields: validated.errors }, 422);

  try {
    const result = await captureLead(key.orgId, validated.data, { apiKeyId: key.id });
    return json({ lead_id: result.lead_id, contact_id: result.contact_id, contact_created: result.contact_created }, 201);
  } catch (err) {
    console.error("API lead capture failed", err);
    return json({ error: "The lead couldn't be saved." }, 500);
  }
}
