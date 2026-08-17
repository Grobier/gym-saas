# Admin Web Portal

Admin dashboard for gym management.

**Stack:** Next.js 14 + TypeScript + React Query + Zod

---

## Setup

```bash
cd apps/admin-web
pnpm install
```

## Development

```bash
pnpm dev
```

Access: http://localhost:3000

## Commands

```bash
# TypeCheck
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test
pnpm test:watch

# Build
pnpm build

# Start (production)
npm start
```

## Structure

```
src/
├── app/             # App router pages + layout
├── components/      # React components
├── lib/             # Utilities
├── hooks/           # Custom hooks
├── types/           # Type definitions
```

---

See root [README.md](../../README.md) for full setup.
