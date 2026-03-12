-- Supabase Schema and Setup Instructions
-- Run these specific commands in your Supabase SQL Editor

-- 1. Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT,
    file_url TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 5. Subjects Policies
CREATE POLICY "Users can view their own subjects" 
ON subjects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subjects" 
ON subjects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects" 
ON subjects FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects" 
ON subjects FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Notes Policies
CREATE POLICY "Users can view their own notes" 
ON notes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" 
ON notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
ON notes FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
ON notes FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Setup Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notes-attachments', 'notes-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage bucket policies (User can only access their own folder: users/{user_id}/*)
CREATE POLICY "Users can view their own files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can upload files to their folder" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'notes-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can update their own files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[2]);
