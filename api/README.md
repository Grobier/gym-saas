# Gym SaaS API

Backend API for multi-tenant gym management SaaS platform.

**Stack:** NestJS + TypeScript + PostgreSQL + Supabase

---

## Setup

```bash
cd apps/api
pnpm install
```

## Environment

Copy root `.env.example` to `.env.local` and fill in values:

```bash
cp ../../.env.example .env.local
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection
- `SUPABASE_*` — Supabase credentials
- `JWT_SECRET` — Secret for token signing
- `API_PORT` — Port (default: 3001)

## Development

```bash
# Start server (watch mode)
pnpm start:dev

# TypeCheck
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test
pnpm test:watch
pnpm test:cov
```

## Build

```bash
pnpm build
npm start:prod
```

## API Documentation

Swagger UI: http://localhost:3001/api/docs

---

## Structure

```
src/
├── config/           # Configuration + validation
├── common/           # Shared filters, guards, interceptors
├── modules/          # Feature modules (auth, users, etc)
├── app.controller.ts
├── app.service.ts
├── app.module.ts
└── main.ts
```

## Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

Targets:
- Overall: ≥ 80%
- Critical (auth, reservations, payments): ≥ 95%

---

## Database

Migrations in `supabase/migrations/`

```bash
# (Run from root after Phase 2)
pnpm db:migrate
pnpm db:seed
```

---

See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for system design.
