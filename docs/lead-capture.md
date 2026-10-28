# Lead capture

Leads can come in on their own in two ways:

- **Forms**: a hosted contact form you link to, embed in your site, or rebuild in your own HTML.
- **API**: `POST /api/v1/leads` with an API key, for your backend or tools like Zapier, Make and n8n.

Each submission creates a **lead** and reuses or creates a **contact**, matched by email. The company is matched by name or created. Set both up under **Settings → Lead capture** (admins only).

**Submissions are unverified.** Anyone can type anyone's email into a form, so captured input never changes an existing contact. When the email matches someone you already have, the new lead and message are linked to that contact, and their name, phone, tags and consent stay as they were. Captured messages show on the timeline as **"via form … · unverified"**.

## Forms

Create a form, choose which fields it shows and which are required, then pick:

- **Start in stage** and **Source** for new leads.
- **Assign to**: the organization owner, a specific person, or **round robin**, which takes turns across owners, admins and members.
- **Consent checkbox**: when set, visitors must tick it. The exact text, the time and the form are saved as a GDPR consent record on contacts the submission creates. An existing contact's consent is never overwritten.
- **After sending, go to**: your own thank-you page. Leave it empty for a built-in message.
- **Allowed websites**: when set, browsers on other sites can't post to or embed-submit the form. It doesn't stop scripts that leave out the `Origin` header, so it isn't spam protection. The hosted page itself always works.
- **Email the lead's owner** about each submission (at most 30 emails per form per hour). The email doesn't repeat the visitor's text; it links to the lead. This needs [SMTP](email-setup.md).

After saving, the form's page shows three ways to use it:

| | |
|---|---|
| **Embed (iframe)** | Paste the `<iframe>` into any site builder or HTML page. |
| **Your own HTML** | A plain `<form>` that posts to `/api/v1/forms/<id>`. Style it however you like, but keep the field names. |
| **Link** | `https://your-domain/f/<id>`, for emails, bios and QR codes. |

### What visitors can and can't set

A form only accepts the fields it shows: `first_name`, `last_name`, `email`, `phone`, `company`, `title` and `message`. Extra fields such as an owner, stage, value or source are ignored, so visitors can't change where leads go.

### Spam protection

- **Honeypot**: a hidden `_gotcha` field. Submissions that fill it are quietly dropped. Keep it in your own HTML.
- **Too fast**: the hosted page includes a signed token with the time it was shown (`_t`). Forged tokens, and submissions sent within 2 seconds, are dropped. Your own HTML can't include this token, so the iframe embed is better protected.
- **Rate limits** per IP (IPv6 per /64) and form: 5 a minute and 30 an hour, plus 500 an hour per form overall. If the limiter itself fails, submissions are refused rather than let through.
- **Size**: request bodies over 64 KB are rejected before they're read.
- **Allowed websites**, as described above.

Spam that's dropped gets a normal "thanks" response, so bots don't learn to adapt.

### Posting with JavaScript

Send JSON with `Content-Type: application/json` and you get JSON back (`{"ok":true}` or `{"ok":false,"error":"…"}`). Requests from **allowed websites** also get CORS headers.

```js
await fetch("https://your-domain/api/v1/forms/<id>", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ first_name: "Ana", email: "ana@example.com", message: "Hi!" }),
});
```

## API

Create a key under **Settings → Lead capture → API keys**. It's shown once; store it like a password. Keys are stored only as a hash, and revoking one takes effect immediately.

The API is meant to be called **server to server**. It sends no CORS headers, so browsers can't call it, and keys stay out of front-end code. For browsers, use a form.

```bash
curl -X POST https://your-domain/api/v1/leads \
  -H "Authorization: Bearer lt_…" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Ana","last_name":"Popescu","email":"ana@example.com","company":"Northwind",
       "message":"Interested in a demo","lead_title":"Demo request","value":5000,
       "stage":"Qualified","source":"Website","owner_email":"sales@yourco.com","tags":["inbound"]}'
```

`X-Api-Key: lt_…` works too, in place of `Authorization`.

### Fields

| Field | Type | Notes |
|---|---|---|
| `first_name`, `last_name` | string | Or send `name`, which is split into first and last. |
| `email` | string | Used to find an existing contact. At least a name or an email is required. |
| `phone`, `company`, `title` | string | Used for new contacts only. Existing contacts aren't changed. |
| `message` | string | Saved as a note on the lead. |
| `lead_title` | string | Defaults to "Inbound — *name*". |
| `value` | number | Lead value in the organization's currency. |
| `stage` | string | An **open** stage's name, any case. Unknown names, and Won/Lost, use the first stage. |
| `source` | string | An existing source's name, any case. Unknown names leave the source empty. |
| `owner_email` | string | The email of an owner, admin or member (not a viewer). Otherwise the organization owner gets the lead. |
| `tags` | string[] | Tags for a new contact. Existing contacts' tags aren't changed. |

### Responses

| Status | Body |
|---|---|
| `201` | `{"lead_id": "…", "contact_id": "…", "contact_created": true}` |
| `401` | Missing, invalid or revoked key. |
| `411` / `413` | No `Content-Length`, or a body over 64 KB. |
| `422` | `{"error": "Validation failed.", "fields": {"email": "Must be a valid email address."}}` |
| `429` | More than 120 requests a minute for this key. Retry after the `Retry-After` header. |

API leads don't send email notifications, so a bulk sync doesn't flood anyone's inbox.

### Zapier, Make, n8n

Use their generic **webhook / HTTP request** action:

- Method `POST`, URL `https://your-domain/api/v1/leads`
- Header `Authorization: Bearer lt_…`
- Body type JSON, mapping your trigger's fields to the field names above.
