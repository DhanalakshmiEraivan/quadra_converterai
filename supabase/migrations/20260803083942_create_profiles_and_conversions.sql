/*
# Create profiles and conversions tables for QuadraConverter AI

## Overview
Multi-user file conversion app with two roles: 'user' and 'admin'.
Users convert files using 50+ tools; history is tracked.
Admins can see all users and conversions.

## New Tables
### profiles
- id (uuid PK, refs auth.users), email, role ('user'|'admin'), full_name, avatar_url, storage_limit_mb, created_at
### conversions
- id (uuid PK), user_id (refs auth.users), tool_id, tool_name, category, input_name, output_name, output_format, status, file_size, created_at

## Security
- RLS on both tables. Owner-scoped CRUD. Admins can read all.
- Trigger auto-creates profile on signup. First user = admin.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  full_name text,
  avatar_url text,
  storage_limit_mb integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') $$;

REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id text NOT NULL,
  tool_name text NOT NULL,
  category text NOT NULL,
  input_name text NOT NULL,
  output_name text NOT NULL,
  output_format text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_conversions" ON conversions;
CREATE POLICY "select_own_conversions"
  ON conversions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_conversions" ON conversions;
CREATE POLICY "insert_own_conversions"
  ON conversions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_conversions" ON conversions;
CREATE POLICY "update_own_conversions"
  ON conversions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_conversions" ON conversions;
CREATE POLICY "delete_own_conversions"
  ON conversions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS conversions_user_id_idx ON conversions(user_id);
CREATE INDEX IF NOT EXISTS conversions_created_at_idx ON conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

CREATE OR REPLACE FUNCTION get_profile_role(uid uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT role FROM profiles WHERE id = uid $$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles) THEN
    INSERT INTO profiles (id, email, role) VALUES (NEW.id, NEW.email, 'admin');
  ELSE
    INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Persistent conversion artifacts and dashboard statistics.
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS output_path text;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS conversion_ms integer;

CREATE INDEX IF NOT EXISTS conversions_output_path_idx ON conversions(output_path);

-- Private bucket for generated files. Files are only accessible to their owner
-- through RLS/signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('conversion-files', 'conversion-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "conversion_files_insert_own" ON storage.objects;
CREATE POLICY "conversion_files_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'conversion-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "conversion_files_select_own" ON storage.objects;
CREATE POLICY "conversion_files_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'conversion-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "conversion_files_delete_own" ON storage.objects;
CREATE POLICY "conversion_files_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'conversion-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE OR REPLACE FUNCTION get_conversion_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'total_size', COALESCE(SUM(file_size), 0),
    'categories', COALESCE((
      SELECT jsonb_object_agg(c.category, c.cnt)
      FROM (
        SELECT category, COUNT(*) AS cnt
        FROM conversions
        WHERE user_id = auth.uid()
        GROUP BY category
      ) c
    ), '{}'::jsonb)
  )
  FROM conversions
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION get_conversion_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_conversion_stats() TO authenticated;
