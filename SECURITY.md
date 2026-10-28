# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems.

Report privately through GitHub: **Security → Report a vulnerability** on this repository. That opens a private advisory only the maintainers can see.

Please include:
- what's affected (file, endpoint or feature) and the version or commit
- steps to reproduce, or a proof of concept
- the impact you expect (whose data, which role is needed)

What to expect:
- an acknowledgement within **3 working days**
- an assessment and a fix plan within **10 working days**
- a fix released as soon as it's ready, with credit in the release notes if you'd like it

Please give us a reasonable time to ship a fix before disclosing publicly. We won't take action against good-faith research that respects people's data and doesn't degrade other people's deployments.

## Scope

**In scope:** this repository's code, its database migrations and its default configuration.

**Out of scope:** individual deployments and their infrastructure, Supabase itself, third-party email providers, and findings that need a compromised server or a stolen `SUPABASE_SECRET_KEY`. Penetration testing a deployment is the job of whoever runs it; see the shared-responsibility section in [docs/security.md](docs/security.md#shared-responsibility).

## Supported versions

Security fixes go into the latest release. Self-hosters should keep up with new releases and run new migrations (`supabase db push`).

## More

- [docs/security.md](docs/security.md): the security model, what the project guarantees, and known limitations
- [docs/self-hosting.md](docs/self-hosting.md#hardening-checklist): the hardening checklist for deployments
