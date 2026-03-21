-- safe_rls.sql
-- Enables secure Row Level Security (RLS) policies for your Supabase database
-- Run this in your Supabase SQL Editor.

-- 1. Enable RLS on all tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop the old insecure public policies
DROP POLICY IF EXISTS "Public can view notes" ON notes;
DROP POLICY IF EXISTS "Public can create notes" ON notes;
DROP POLICY IF EXISTS "Public can update notes" ON notes;
DROP POLICY IF EXISTS "Public can delete notes" ON notes;

DROP POLICY IF EXISTS "Public can view subjects" ON subjects;
DROP POLICY IF EXISTS "Public can create subjects" ON subjects;
DROP POLICY IF EXISTS "Public can update subjects" ON subjects;
DROP POLICY IF EXISTS "Public can delete subjects" ON subjects;


-- 3. Create Safe Policies for Authenticated Data Ownership
-- Note: As instructed, these policies rely on `auth.uid() = user_id`. 
-- If you previously dropped `user_id`, ensure it is present in your schema.

-- Notes Policies
CREATE POLICY "Users can view their own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Subjects Policies
CREATE POLICY "Users can view their own subjects" ON subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subjects" ON subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subjects" ON subjects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subjects" ON subjects FOR DELETE USING (auth.uid() = user_id);

-- Profiles Policies
CREATE POLICY "Users can view their own profiles" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profiles" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Secure Storage Bucket (notes-files)
-- Ensure bucket is not fully public, requiring signed URLs
UPDATE storage.buckets SET public = false WHERE id = 'notes-files';

DROP POLICY IF EXISTS "Public can view files" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Public can update files" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete files" ON storage.objects;

-- Access restricted to the user who owns the folder (user.id format used in our storage routing)
CREATE POLICY "Users can view their own files" ON storage.objects FOR SELECT USING (bucket_id = 'notes-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own files" ON storage.objects FOR UPDATE USING (bucket_id = 'notes-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own files" ON storage.objects FOR DELETE USING (bucket_id = 'notes-files' AND auth.uid()::text = (storage.foldername(name))[1]);
