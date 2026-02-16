-- Add AI summary field to receipts table
-- This field stores a brief AI-generated description of what the receipt represents

ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Comment on column
COMMENT ON COLUMN public.receipts.summary IS 'AI-generated summary of the receipt (e.g., "Weekly grocery shopping", "Furniture purchase")';
