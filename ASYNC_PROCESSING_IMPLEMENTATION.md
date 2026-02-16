# Hybrid Asynchronous Receipt Processing Implementation

## Overview

This document describes the implementation of asynchronous receipt processing using Supabase Edge Functions and Gemini AI. The implementation moves AI processing from the frontend to a secure backend function, ensuring API keys remain secure and the UI remains responsive during processing.

## Architecture

### Flow Diagram

```
[User] --> [Ionic/Angular Frontend]
             |
             | 1. Capture Image
             v
         [CameraService]
             |
             | 2. Upload Image + Create Receipt Record (status='processing')
             v
         [ReceiptService]
             |
             +---> [Supabase Storage] (stores image)
             |
             +---> [Supabase DB] (creates receipt record)
             |
             | 3. Invoke Edge Function
             v
    [process-receipt Edge Function]
             |
             | 4. Fetch user's Gemini API key
             v
         [user_settings table]
             |
             | 5. Download image
             v
         [Supabase Storage]
             |
             | 6. Process with Gemini
             v
          [Gemini AI]
             |
             | 7. Update receipt with data
             v
         [Supabase DB] (status='completed' or 'error')
             |
             | 8. Real-time notification
             v
    [Supabase Realtime] --> [Frontend]
                                |
                                v
                           [User sees result]
```

## Components

### 1. Database Schema

**Migration: `006_async_processing_schema.sql`**

Adds the following columns to the `receipts` table:
- `status` (TEXT): Current processing status ('processing', 'completed', 'error')
- `storage_path` (TEXT): Path to image in Supabase Storage bucket
- `error_message` (TEXT): Error details if processing failed
- `currency` (TEXT): Currency code (USD, EUR, MXN, etc.)

Indexes created:
- `idx_receipts_status`: For efficient status queries
- `idx_receipts_user_status`: For user-specific status queries

### 2. Edge Function

**File: `supabase/functions/process-receipt/index.ts`**

**Purpose**: Securely process receipt images using user's Gemini API key

**Key Features**:
- Runs server-side with service role privileges
- Fetches user's Gemini API key from secure storage
- Downloads image from Supabase Storage
- Sends to Gemini 2.0 Flash for processing
- Updates receipt record with extracted data
- Comprehensive error handling

**Request Format**:
```json
{
  "receiptId": "uuid-of-receipt-record"
}
```

**Response Format** (Success):
```json
{
  "success": true,
  "receiptId": "uuid-of-receipt-record"
}
```

**Response Format** (Error):
```json
{
  "error": "Error message"
}
```

**Environment Variables Required**:
- `SUPABASE_URL` (auto-provided by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided by Supabase)

### 3. Frontend Services

#### ReceiptService

**File: `src/app/services/receipt.service.ts`**

**Key Methods**:

- `uploadAndProcess(imageBlob: Blob): Promise<string>`
  - Uploads image to Supabase Storage
  - Creates receipt record with 'processing' status
  - Invokes Edge Function for processing
  - Returns receipt ID

- `subscribeToReceipt(receiptId: string, callback: Function): () => void`
  - Sets up Realtime subscription for receipt updates
  - Calls callback when receipt status changes
  - Returns unsubscribe function

- `unsubscribeAll(): void`
  - Cleans up all active subscriptions
  - Called in component's ngOnDestroy

#### Updated SupabaseService

**File: `src/app/services/supabase.service.ts`**

**New/Updated Methods**:

- `getSupabaseClient(): SupabaseClient | null`
  - Exposes Supabase client for use by ReceiptService

- `getReceipts(): Promise<Receipt[]>`
  - Updated to include new async processing fields
  - Proper type casting for status field

### 4. Frontend UI

#### Updated HomePage

**File: `src/app/home/home.page.ts`**

**Key Changes**:
- Removed synchronous Gemini processing
- Added `ReceiptService` dependency
- Implements `OnDestroy` for cleanup
- Uses `uploadAndProcess()` for receipt submission
- Subscribes to real-time updates
- Shows progress notifications
- Allows navigation during processing
- Auto-navigates to receipts page on completion

**New Properties**:
- `currentReceiptId`: Tracks receipt being processed
- `processingStatus`: Current processing state
- `NAVIGATION_DELAY_MS`: Delay before auto-navigation

### 5. Data Models

**Updated Receipt Interface**:
```typescript
export interface Receipt {
  id?: string;
  date: string;
  total: number;
  merchant: string;
  items?: ReceiptItem[];
  category?: string;
  imageUrl?: string;
  createdAt?: Date;
  status?: 'processing' | 'completed' | 'error';
  storagePath?: string;
  errorMessage?: string;
  currency?: string;
}
```

## Security

### API Key Protection

**Before**: Gemini API key was used directly in frontend
**After**: Gemini API key is only accessed server-side

1. User's API key is stored in `user_settings` table
2. Edge Function has service role privileges to read the key
3. Frontend never sees or handles the API key
4. Each request validates the user owns the receipt being processed

### Row Level Security (RLS)

All database operations are protected by RLS policies:
- Users can only access their own receipts
- Users can only access their own settings
- Service role bypasses RLS only in Edge Function

## User Experience

### Async Processing Flow

1. **User captures image**
   - Camera opens
   - User takes photo
   - Frontend shows "Uploading receipt..." loading

2. **Upload phase**
   - Image uploaded to Storage
   - Receipt record created
   - Toast: "Receipt uploaded! Processing in background..."
   - Loading dismissed

3. **Processing phase**
   - User can navigate away or stay on page
   - Edge Function processes in background
   - No UI blocking

4. **Completion phase**
   - Real-time update received
   - Toast: "Receipt processed successfully!"
   - Auto-navigation to receipts page after 1.5s

5. **Error handling**
   - If processing fails, error status is saved
   - Toast: "Processing failed: [error message]"
   - User can view error details in receipts list

## Deployment

### 1. Apply Database Migration

```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/006_async_processing_schema.sql
```

### 2. Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy process-receipt
```

### 3. Update Frontend

The frontend changes are automatically deployed with your regular build process.

## Testing

### Manual Testing Checklist

1. **Upload Flow**
   - [ ] Can capture image with camera
   - [ ] Upload shows loading indicator
   - [ ] Toast appears after upload
   - [ ] Can navigate away during processing

2. **Processing**
   - [ ] Receipt status shows 'processing' initially
   - [ ] Edge Function is invoked successfully
   - [ ] Processing completes within reasonable time

3. **Real-time Updates**
   - [ ] Status updates appear in real-time
   - [ ] No page refresh needed
   - [ ] Updates work when navigating back to receipts

4. **Success Case**
   - [ ] Receipt data is extracted correctly
   - [ ] Status changes to 'completed'
   - [ ] All fields populated (merchant, total, date, items, currency)
   - [ ] Success toast appears

5. **Error Handling**
   - [ ] Invalid images handled gracefully
   - [ ] Network errors handled
   - [ ] Error message saved to database
   - [ ] Error toast appears with details

6. **Security**
   - [ ] Gemini API key not visible in browser DevTools
   - [ ] Cannot access other users' receipts
   - [ ] Edge Function requires authentication

### Automated Testing

- **Unit Tests**: 13/14 tests passing
- **Linting**: All files pass
- **Build**: Successful compilation
- **Security Scan**: No vulnerabilities (CodeQL)

## Troubleshooting

### Edge Function Not Triggering

1. Check function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs process-receipt`
3. Verify service role key is set in Supabase dashboard

### Real-time Updates Not Working

1. Verify Realtime is enabled in Supabase dashboard
2. Check browser console for subscription errors
3. Ensure receipt ID is correct

### Processing Fails

1. Check Edge Function logs for errors
2. Verify user has Gemini API key configured
3. Check Gemini API key is valid and has quota
4. Verify image is accessible in Storage

### Images Not Uploading

1. Check Storage bucket exists and is named 'receipts'
2. Verify storage policies are applied
3. Check user authentication

## Performance Considerations

- **Upload Size**: Images are JPEG, typically 100-500KB
- **Processing Time**: Usually 2-5 seconds with Gemini
- **Concurrent Processing**: Edge Functions can handle multiple requests
- **Realtime Latency**: Typically < 1 second for status updates

## Future Enhancements

1. **Batch Processing**: Process multiple receipts at once
2. **Progress Indicators**: Show percentage complete
3. **Retry Logic**: Automatic retry on failure
4. **Image Optimization**: Compress images before upload
5. **Caching**: Cache processed receipts to reduce costs
6. **Analytics**: Track processing success rates
7. **Notifications**: Push notifications for completed processing

## References

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Ionic Camera Documentation](https://capacitorjs.com/docs/apis/camera)
