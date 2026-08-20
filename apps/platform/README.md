# Unified Platform App

Single Next.js application for all roles: Super Admin, Admin (Gym Owner), Coach, and Student.

## Features

- **Unified Authentication**: One login for all users with role-based redirect
- **Super Admin Dashboard**: Manage all gyms, subscriptions, and billing
- **Gym Admin Panel**: Student management, class management, payment tracking
- **Coach Interface**: Daily class management and attendance tracking
- **Student Portal**: Browse classes and manage reservations

## Architecture

**Single Codebase**
- One Next.js 14 app with Pages Router
- Shared Supabase API client
- Unified Zustand store for auth and gym state
- Consistent styling across all interfaces

**Role-Based Routing**
```
/login                      → Unified authentication
/superadmin                 → Platform owner dashboard
/admin                      → Gym admin dashboard
/admin/students             → Student management
/admin/classes              → Class management
/admin/payments             → Payment management
/coach                      → Coach dashboard
/coach/class/[classId]      → Class details & attendance
/student                    → Student dashboard
/student/classes            → Browse classes
/student/my-bookings        → Manage reservations
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Development

```bash
npm install
npm run dev
```

App runs on `http://localhost:3000`

## Production Build

```bash
npm run build
npm start
```

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
vercel
```

### Option 2: GitHub Integration

1. Connect repository to Vercel
2. Set root directory to `apps/platform`
3. Add environment variables in Vercel dashboard
4. Deploy

### Option 3: Deploy All Apps

```bash
# Deploy superadmin app
vercel apps/superadmin --name gym-saas-superadmin

# Deploy admin app
vercel apps/admin --name gym-saas-admin

# Deploy coach app
vercel apps/coach --name gym-saas-coach

# Deploy unified platform app
vercel apps/platform --name gym-saas-platform
```

## Key Files

- `pages/login.tsx` - Unified login with role-based redirect
- `lib/supabase-api.ts` - Centralized API client for all features
- `lib/store.ts` - Zustand store for auth and gym state
- `styles/dashboard.module.css` - Unified styling for all interfaces

## Database Requirements

- `gyms` table
- `subscriptions` table
- `payments` table
- `classes` table
- `students` table
- `auth.users` table (Supabase Auth)

## Migration History

This app consolidates:
- `apps/superadmin/` → `/superadmin` routes
- `apps/admin/` → `/admin` routes
- `apps/coach/` → `/coach` routes
- (New) → `/student` routes

**Original apps remain unchanged** in their respective directories for reference.

## Next Steps

1. Test all authentication flows
2. Verify role-based routing
3. Test cross-role navigation
4. Deploy to Vercel production
5. Monitor error logs

## Support

For issues or questions, refer to CLAUDE.md or check individual role documentation.
