# 🚨 URGENT: Apply RLS Policy Fix for Students Table

## Problem

Admin users get **403 Forbidden** when trying to create students:
```
Error: new row violates row-level security policy for table "students"
```

## Root Cause

The `students` table has RLS enabled but **no INSERT policy** that allows admins to create students.

## Solution

Apply the SQL migration manually in Supabase SQL Editor.

### Steps:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select Project**: gym-saas (or your project name)
3. **SQL Editor** → Click **"New Query"**
4. **Paste this SQL** (exactly as-is):

```sql
-- Fix students table INSERT RLS policy
-- Allows admins to insert students in their gym

-- 1. Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Admins can create students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;

-- 2. Create policy: Admins can INSERT students in their gym
CREATE POLICY "Admins can insert students"
ON students FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gym_access
    WHERE user_id = auth.uid()
      AND gym_id = students.gym_id
      AND role = 'admin'
  )
);

-- 3. Ensure admin SELECT policy exists
DROP POLICY IF EXISTS "Admins can view students in their gym" ON students;

CREATE POLICY "Admins can view students in their gym"
ON students FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gym_access
    WHERE user_id = auth.uid()
      AND gym_id = students.gym_id
      AND role IN ('admin', 'coach')
  )
);

-- 4. Coach can view students
DROP POLICY IF EXISTS "Coaches can view students in their gym" ON students;

-- 5. Students can view themselves
DROP POLICY IF EXISTS "Students can view themselves" ON students;

CREATE POLICY "Students can view themselves"
ON students FOR SELECT
USING (
  user_id = auth.uid()
);

-- 6. Coaches can update attendance-related fields
DROP POLICY IF EXISTS "Coaches can update student records" ON students;

CREATE POLICY "Coaches can update student records"
ON students FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gym_access
    WHERE user_id = auth.uid()
      AND gym_id = students.gym_id
      AND role = 'coach'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gym_access
    WHERE user_id = auth.uid()
      AND gym_id = students.gym_id
      AND role = 'coach'
  )
);

-- 7. Admins can update students
DROP POLICY IF EXISTS "Admins can update students" ON students;

CREATE POLICY "Admins can update students"
ON students FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gym_access
    WHERE user_id = auth.uid()
      AND gym_id = students.gym_id
      AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gym_access
    WHERE user_id = auth.uid()
      AND gym_id = students.gym_id
      AND role = 'admin'
  )
);

-- 8. Admins can delete students
DROP POLICY IF EXISTS "Admins can delete students" ON students;

CREATE POLICY "Admins can delete students"
ON students FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM gym_access
    WHERE user_id = auth.uid()
      AND gym_id = students.gym_id
      AND role = 'admin'
  )
);
```

5. **Click "Run"** (green button)
6. **Wait for success** - Should see "Success" message

### Verify Fix:

Try creating a student in the admin dashboard. Should work now!

---

## What This Fixes

✅ Admins can INSERT students in their gym  
✅ Admins can SELECT/UPDATE/DELETE students in their gym  
✅ Coaches can SELECT students in their gym  
✅ Students can SELECT only themselves  

## Next Steps

Once this is applied, all three issues will be fixed:
1. ✅ RoleSelector dropdown with localStorage persistence
2. ✅ Null-safe student data handling  
3. ✅ RLS policy allowing admin to create students
