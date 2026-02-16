-- Async Processing Schema Extension
-- Adds fields for asynchronous ticket/receipt processing

-- Add new columns to receipts table for async processing
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Create index on status for efficient querying of processing tickets
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.receipts(status);

-- Create index on user_id and status for efficient user-specific queries
CREATE INDEX IF NOT EXISTS idx_receipts_user_status ON public.receipts(user_id, status);

-- Update existing receipts to have 'completed' status
UPDATE public.receipts 
SET status = 'completed' 
WHERE status IS NULL OR status = 'processing';

-- Comment on columns
COMMENT ON COLUMN public.receipts.status IS 'Processing status: processing, completed, or error';
COMMENT ON COLUMN public.receipts.storage_path IS 'Storage path in Supabase bucket';
COMMENT ON COLUMN public.receipts.error_message IS 'Error message if processing failed';
COMMENT ON COLUMN public.receipts.currency IS 'Currency code (USD, EUR, MXN, etc.)';
