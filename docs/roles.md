# Roles and access

Every person belongs to an organization with exactly one role. The rules are enforced by Postgres Row Level Security (`supabase/migrations/`) and covered by tests in `supabase/tests/rls_test.sql`, so they hold even for someone calling the API directly.

## Roles

| Capability | Owner | Admin | Member | Viewer |
|---|:-:|:-:|:-:|:-:|
| Delete the organization | ✅ | | | |
| Transfer ownership | ✅ | | | |
| Invite people, revoke invites | ✅ | ✅ | | |
| Change roles, remove people (except the owner) | ✅ | ✅ | | |
| Edit pipeline stages, lead sources, org settings | ✅ | ✅ | | |
| Manage API keys and capture forms | ✅ | ✅ | | |
| Load or clear sample data | ✅ | ✅ | | |
| Create and edit leads, contacts, companies, activities | ✅ | ✅ | ✅ | |
| Move a record to the trash | ✅ | ✅ | own records | |
| Permanently delete records | ✅ | ✅ | | |
| See all leads and contacts | ✅ | ✅ | depends on org setting | ✅ |
| Read the audit log | ✅ | ✅ | | |

**Lead visibility** is an organization setting:
- `all` (default): members see every lead, contact and company.
- `own`: members see only the records they own. Owners, admins and viewers still see everything.

## Rules that always apply

- Each organization has **exactly one owner**. Admins can't change or remove the owner. The owner hands over the role with `transfer_ownership` and becomes an admin.
- Nobody can be **invited as owner**.
- An invitation can be **accepted only by the email address it was sent to**. Invites expire after 7 days. Re-inviting someone replaces the old link.
- Records can't reference another organization's records: composite foreign keys reject it.

## Joining

- **Fresh install**: the first person to open the app creates the owner account (`/setup`). After that `/setup` is closed.
- **Everyone else** joins through an invitation link (`/invite/<token>`):
  - With no account yet, they choose a name and password. The account is created already confirmed, because receiving the link proves they own the address.
  - With an existing account, they sign in and are added to the organization.
- Someone who accepts an invite before the owner finishes setup sees a "being set up" screen until the wizard is done.

## Passwords

- At least 8 characters.
- "Forgot password" emails a one-time link that expires in an hour (requires [SMTP](email-setup.md)).
