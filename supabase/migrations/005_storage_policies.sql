-- Storage Bucket Configuration and RLS Policies
-- Configures the receipts storage bucket and access policies

-- Create receipts bucket (if not exists via UI, this documents the configuration)
-- Note: Storage buckets are typically created via Supabase Dashboard or CLI
-- This file serves as documentation of required storage configuration

-- Storage policies for receipts bucket
-- These should be applied after creating the 'receipts' bucket in Supabase Dashboard

-- Policy: Users can upload their own receipt images
CREATE POLICY "Users can upload their own receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Policy: Users can view their own receipt images
CREATE POLICY "Users can view their own receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Policy: Users can update their own receipt images
CREATE POLICY "Users can update their own receipts"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  )
  WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Policy: Users can delete their own receipt images
CREATE POLICY "Users can delete their own receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Policy: Allow public read access (optional - remove if receipts should be private)
-- CREATE POLICY "Public can view receipts"
--   ON storage.objects
--   FOR SELECT
--   TO public
--   USING (bucket_id = 'receipts');
