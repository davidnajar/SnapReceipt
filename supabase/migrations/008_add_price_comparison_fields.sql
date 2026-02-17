-- Add price comparison fields to receipts table
-- This allows storing price comparison results in the database

-- Add a JSONB column to store price comparisons for items
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS price_comparisons JSONB;

-- Add timestamp for when price comparisons were last updated
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS price_comparisons_updated_at TIMESTAMPTZ;

-- Create index on price_comparisons_updated_at for efficient querying
CREATE INDEX IF NOT EXISTS idx_receipts_price_comparisons_updated 
ON public.receipts(price_comparisons_updated_at);

-- Comment on columns
COMMENT ON COLUMN public.receipts.price_comparisons IS 'JSONB object containing price comparison results for each item. Structure: { "0": [{ storeName, price, savings, savingsPercent, url, location, availability }], "1": [...] }';
COMMENT ON COLUMN public.receipts.price_comparisons_updated_at IS 'Timestamp when price comparisons were last updated';
