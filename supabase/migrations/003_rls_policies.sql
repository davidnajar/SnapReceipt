-- Row Level Security (RLS) Policies
-- Ensures users can only access their own data

-- Enable RLS on receipts table
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own receipts
CREATE POLICY "Users can view their own receipts"
  ON receipts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own receipts
CREATE POLICY "Users can insert their own receipts"
  ON receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own receipts
CREATE POLICY "Users can update their own receipts"
  ON receipts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete their own receipts"
  ON receipts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (handled by trigger, but explicit policy for safety)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
