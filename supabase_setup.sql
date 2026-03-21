-- Supabase Schema and Setup Instructions
-- Run these specific commands in your Supabase SQL Editor

-- 1. Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can create their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON subjects;

DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- 3. Create or Update subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Remove user_id if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='user_id') THEN
        ALTER TABLE subjects DROP COLUMN user_id CASCADE;
    END IF;
END $$;

-- 4. Create or Update notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT,
    file_url TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Remove user_id if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='user_id') THEN
        ALTER TABLE notes DROP COLUMN user_id CASCADE;
    END IF;
END $$;

-- 5. Enable Row Level Security (RLS) but allow public access temporarily
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 6. Public Subjects Policies (Temporary Auth Removal)
CREATE POLICY "Public can view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public can create subjects" ON subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update subjects" ON subjects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete subjects" ON subjects FOR DELETE USING (true);

-- 7. Public Notes Policies (Temporary Auth Removal)
CREATE POLICY "Public can view notes" ON notes FOR SELECT USING (true);
CREATE POLICY "Public can create notes" ON notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update notes" ON notes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete notes" ON notes FOR DELETE USING (true);

-- 8. Setup Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notes-files', 'notes-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 9. Storage bucket policies (Public access)
CREATE POLICY "Public can view files" ON storage.objects FOR SELECT USING (bucket_id IN ('notes-files'));
CREATE POLICY "Public can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('notes-files'));
CREATE POLICY "Public can update files" ON storage.objects FOR UPDATE USING (bucket_id IN ('notes-files'));
CREATE POLICY "Public can delete files" ON storage.objects FOR DELETE USING (bucket_id IN ('notes-files'));

