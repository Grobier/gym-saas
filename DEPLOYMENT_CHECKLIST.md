# DEPLOYMENT CHECKLIST - moveOS

## Pre-Deployment (Local)

- [x] Build exitoso (TypeScript)
- [x] RLS policies en Supabase (students, classes, reservations, attendance, payments, gyms)
- [x] Postgres function create_student_with_auth() creada
- [x] Email invitation function creada
- [x] Code changes en repo local

## Deployment Steps

### 1. Push a GitHub
```bash
cd moveOS
git add .
git commit -m "Auditoría funcional completa: RLS policies, email invitations, type fixes"
git push origin main
```

### 2. Vercel Auto-Deploy
- URL: https://vercel.com/dashboard
- Proyecto: moveOS
- Branch: main
- Auto-deploy cuando push a main

### 3. Verify Deployment
```bash
# Si está en vercel.app
curl https://moveos.vercel.app/

# Check CloudFlare/DNS
nslookup moveos.vercel.app
```

## Post-Deployment Testing

### Manual Testing
- [ ] Login con admin (grobier.2h@gmail.com)
- [ ] Ver role-selector
- [ ] Cambiar a admin role
- [ ] Crear estudiante
- [ ] Verificar student puede login
- [ ] Student ver clases (solo su gym)
- [ ] Coach marcar asistencia

### Email Testing
- [ ] Check inbox de nuevo student
- [ ] Verificar email invitación
- [ ] Click link y setup password

### Performance
- [ ] Google PageSpeed Insights
- [ ] Bundle size: `next analyze`
- [ ] Core Web Vitals

## Rollback Plan
Si falla deployment en Vercel:
1. Revert último commit: `git reset --hard HEAD~1`
2. Push: `git push -f origin main`
3. Vercel auto-redeploy

## Ambiente Variables Necesarias

Verificar en Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SENDGRID_API_KEY` ⚠️ (opcional para emails)
- `RESEND_API_KEY` ⚠️ (alternativa a SendGrid)

## Datos Iniciales

Verificar en Supabase:
- [ ] Tabla gyms poblada
- [ ] Al menos 1 gym con gym_access records
- [ ] User grobier.2h@gmail.com tiene gym_access

## Monitoreo Post-Deploy

1. **Logs Vercel:** https://vercel.com/deployments
2. **Sentry (si está integrado):** Check error tracking
3. **Supabase:** Check query performance en dashboard

## Problemas Conocidos A Resolver Post-Deploy

1. **Email invitations:** Necesita SendGrid/Resend API key
2. **Analytics:** Aún usa mock data (TODO: conectar a BD real)
3. **Mobile responsiveness:** No testeado (TODO: review)

## Tickets de Seguimiento

- [ ] TODO: Integrar SendGrid/Resend
- [ ] TODO: Analytics con datos reales
- [ ] TODO: Mobile testing
- [ ] TODO: E2E tests (Cypress/Playwright)
- [ ] TODO: Performance optimization

---

**Status:** Ready for deployment ✅

**Estimated deployment time:** 2-5 minutes (auto via Vercel)

**Estimated testing time:** 30 minutes (manual)
