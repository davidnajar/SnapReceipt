# Supabase Edge Functions

This directory contains Supabase Edge Functions for SnapReceipt.

## Functions

### process-receipt

Processes receipt images asynchronously using Gemini AI.

**Purpose**: 
- Download receipt image from Supabase Storage
- Send image to Gemini 2.0 Flash for data extraction
- Update receipt record with extracted data
- Handle errors and update status accordingly

**Trigger**: Invoked after a receipt record is created with status='processing'

**Environment Variables Required**:
- `SUPABASE_URL`: Supabase project URL (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin access (auto-provided)

**Request Body**:
```json
{
  "receiptId": "uuid-of-receipt"
}
```

**Response**:
```json
{
  "success": true,
  "receiptId": "uuid-of-receipt"
}
```

**Error Response**:
```json
{
  "error": "Error message"
}
```

## Deployment

To deploy the Edge Functions to Supabase:

1. Install the Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref your-project-ref
```

4. Deploy the function:
```bash
supabase functions deploy process-receipt
```

## Local Development

To test the Edge Function locally:

1. Start Supabase locally:
```bash
supabase start
```

2. Serve the function:
```bash
supabase functions serve process-receipt
```

3. Test with curl:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/process-receipt' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"receiptId":"test-uuid"}'
```

## Security Notes

- The Edge Function uses the user's Gemini API key stored in `user_settings` table
- The Gemini API key is never exposed to the frontend
- Service role key is used only server-side for database operations
- Each user can only process their own receipts (enforced by RLS policies)

## Flow

1. Frontend uploads image to Supabase Storage
2. Frontend creates receipt record with `status='processing'`
3. Frontend invokes `process-receipt` Edge Function
4. Edge Function:
   - Fetches receipt and user's Gemini API key
   - Downloads image from storage
   - Sends to Gemini for processing
   - Updates receipt with extracted data
   - Sets `status='completed'` or `status='error'`
5. Frontend receives real-time update via Supabase Realtime
