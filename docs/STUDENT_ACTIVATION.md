# Student Account Activation

## Problem
Students created via admin panel have `user_id = NULL` because creating Auth users requires backend access.

## Solution

### Option 1: Manual Auth Creation + Link (Current)
1. Admin creates student via UI (student has no user_id)
2. In Supabase, create Auth account for student (name, email)
3. Run SQL to link student to Auth user:

```sql
UPDATE students
SET user_id = '<auth_user_id>'
WHERE id = '<student_id>';
```

### Option 2: Backend Integration (TODO)
Create API endpoint that:
- Takes name, email, phone
- Creates Auth user via admin API
- Creates student record with user_id
- Sends activation email

### Option 3: Supabase Function (TODO)
Create Postgres function that:
- Accepts student data
- Creates auth.users record
- Inserts into students table

## Current Flow
1. Admin creates student: `POST /admin/students` → inserts with `user_id = NULL`
2. Student has no login ability (RLS blocks)
3. Admin must manually link Auth user to student

## TODO
- [ ] Create backend endpoint for student creation with Auth
- [ ] Implement invite email flow
- [ ] Auto-generate temporary passwords
