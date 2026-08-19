# Super Admin App

Platform owner dashboard for managing all gyms, subscriptions, and billing.

## Features

- **Gym Management**: View all gyms in the system
- **Subscription Tracking**: Monitor active subscriptions, trials, and expiring plans
- **Billing Overview**: Track payments and revenue
- **Multi-location Support**: See all gym locations and their status

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Development

```bash
npm install
npm run dev
```

Opens on `http://localhost:3002`

## Build

```bash
npm run build
npm start
```

## Database Schema Required

- `gyms` table
- `subscriptions` table
- `payments` table
- `auth.users` table (Supabase Auth)
