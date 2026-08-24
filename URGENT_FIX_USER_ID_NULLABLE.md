# 🚨 URGENT: Make student user_id nullable

## Problem

Student creation fails with:
```
null value in column "user_id" of relation "students" violates not-null constraint
```

## Root Cause

The `students.user_id` column has `NOT NULL` constraint, but:
- The Postgres function `create_student_with_auth` is failing
- The fallback tries to insert `user_id: null`
- This violates the constraint

## Solution

Apply this SQL in Supabase SQL Editor:

```sql
ALTER TABLE students
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN students.user_id IS 'Foreign key to auth.users. NULL if student created without auth account (temporary)';
```

### Steps:

1. **Supabase Dashboard** → SQL Editor → New Query
2. **Paste the SQL above**
3. **Click Run**
4. ✅ Done

---

## After This

Students can be created without auth accounts (temporary). Later we'll fix the Postgres function to create auth users properly.

---

## Then

Try creating a student in admin dashboard again!
