# freshify-workspaces-fe

Frontend for the **Workspaces** sovereign module of [Sovereign Portal](https://github.com/freshifyv2/freshify-sovereign-portal).

Mounted under the portal shell at `/dashboard/workspaces/*`. Pairs with [`freshify-workspaces`](https://github.com/freshifyv2/freshify-workspaces) backend.

## What this owns

- Workspaces list and detail
- Join-request approval flow
- Owner transfer flow
- Per-Workspace module install / uninstall surface
- Per-record settings page at `/dashboard/workspaces/:id/settings`
- Module Settings page (Module Admins, Available Roles, Default Role, Capabilities, Registry view)

## Run locally

```bash
npm install
cp .env.example .env  # set USERS_SERVICE_URL, COMPANIES_SERVICE_URL, WORKSPACES_SERVICE_URL
npm run dev
```

Defaults to `http://localhost:3003`.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `USERS_SERVICE_URL` | yes | `freshify-users` backend URL |
| `COMPANIES_SERVICE_URL` | yes | `freshify-companies` backend URL |
| `WORKSPACES_SERVICE_URL` | yes | `freshify-workspaces` backend URL |
| `SESSION_COOKIE_NAME` | no | Defaults to `sp_session` |
| `PORT` | no | Defaults to `3003` |

## Stack

Next.js 14 (App Router, standalone output). Server Components by default. Geist Sans typography. Design tokens shared with the portal shell.

## License

Apache 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE). Copyright 2026 Freshify, Inc.

## Support

- Bugs and feature requests: open an issue. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first.
- Security disclosures: see [SECURITY.md](./SECURITY.md). Do not open a public issue.
- Production deployment, custom modules, architecture review: see [SUPPORT.md](./SUPPORT.md).
