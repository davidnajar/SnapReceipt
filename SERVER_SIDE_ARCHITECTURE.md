# Server-Side Price Comparison Architecture

## Overview
The price comparison feature has been refactored to run entirely server-side with automatic triggering, eliminating client-side dependencies and ensuring non-blocking operation.

## Architecture Flow

### 1. Receipt Processing (Existing + Enhanced)
```
User scans receipt with camera
        ↓
Client: Uploads image to Supabase Storage
        ↓
Client: Creates receipt record (status: 'processing')
        ↓
Client: Invokes 'process-receipt' Edge Function
        ↓
Server: process-receipt Edge Function
        ├─ Downloads image from storage
        ├─ Calls Gemini API to extract receipt data
        ├─ Updates receipt with extracted data (status: 'completed')
        └─ ** NEW ** Triggers 'compare-prices' Edge Function (async)
```

### 2. Price Comparison (NEW - Automatic)
```
Server: compare-prices Edge Function (triggered automatically)
        ├─ Gets receipt data from database
        ├─ Gets user's Gemini API key from user_settings table
        ├─ For each item in receipt:
        │   ├─ Calls Gemini API to find cheaper alternatives
        │   └─ Collects results
        ├─ Stores all comparisons in price_comparisons column (JSONB)
        └─ Updates price_comparisons_updated_at timestamp
```

### 3. Client Display (Simplified)
```
User opens receipt detail page
        ↓
Client: Loads receipt from database
        ↓
Client: If price_comparisons exists
        └─ Display price comparison cards
```

## Key Components

### Database Schema (Migration 008)
```sql
-- New columns in receipts table
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS price_comparisons JSONB;
ADD COLUMN IF NOT EXISTS price_comparisons_updated_at TIMESTAMPTZ;

-- Data structure:
price_comparisons = {
  "0": [  -- Item index
    {
      "storeName": "Walmart Online",
      "price": 3.79,
      "savings": 1.20,
      "savingsPercent": 24,
      "availability": "online",
      "url": "https://walmart.com/...",
      "location": null
    }
  ],
  "1": [ ... ]
}
```

### Edge Function: process-receipt (Enhanced)
**File:** `supabase/functions/process-receipt/index.ts`

**New Function Added:**
```typescript
async function triggerPriceComparison(supabase: any, receiptId: string) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/compare-prices`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ receiptId }),
    }
  );
}
```

**Integration Point:**
```typescript
// After successfully updating receipt
if (updateError) {
  throw new Error(`Failed to update receipt: ${updateError.message}`);
}

// Trigger price comparison asynchronously (fire and forget)
triggerPriceComparison(supabase, receiptId).catch(error => {
  console.error('Error triggering price comparison:', error);
  // Don't fail the main process if price comparison fails
});

return new Response(...)
```

### Edge Function: compare-prices (NEW)
**File:** `supabase/functions/compare-prices/index.ts`

**Purpose:** Find cheaper alternatives for all items in a receipt

**Key Features:**
- Gets user's Gemini API key from database (not from client)
- Processes items sequentially to avoid rate limiting
- Stores results in database JSONB column
- Fails gracefully if API key not configured
- Returns success even if no alternatives found

**Process:**
1. Validate receipt exists and has items
2. Get user's API key from user_settings table
3. For each item:
   - Build Gemini prompt with item details
   - Call Gemini API to find alternatives
   - Parse and validate response
   - Store in results map
4. Update receipt with price_comparisons data
5. Set price_comparisons_updated_at timestamp

### Client: Receipt Detail Page (Simplified)
**File:** `src/app/receipt-detail/receipt-detail.page.ts`

**What Was Removed:**
- ❌ PriceComparisonService dependency
- ❌ GeminiService dependency
- ❌ Real-time subscriptions (RealtimeChannel)
- ❌ Client-side API key retrieval (localStorage)
- ❌ Client-side triggering logic
- ❌ Loading state management
- ❌ OnDestroy lifecycle hook

**What Remains:**
- ✅ Simple receipt loading from database
- ✅ Display price comparisons if they exist
- ✅ Calculate total potential savings
- ✅ Format display with existing helpers

**Code Comparison:**

**Before (Client-side):**
```typescript
async ngOnInit() {
  await this.loadReceipt(receiptId);
  this.subscribeToReceiptUpdates(receiptId);  // Real-time subscription
  this.triggerPriceComparison(receiptId);     // Client triggers
}

private async triggerPriceComparison(receiptId: string) {
  const userKey = await this.getUserApiKey();  // Client API key
  this.priceComparisonService.initialize(userKey);
  this.priceComparisons = await this.priceComparisonService.findAlternativesForItems(...);
}
```

**After (Server-side):**
```typescript
async ngOnInit() {
  await this.loadReceipt(receiptId);
  // Display comparisons if they exist in the database
  if (this.receipt?.priceComparisons) {
    this.updatePriceComparisons(this.receipt.priceComparisons);
  }
}

private updatePriceComparisons(priceComparisonsData: any) {
  // Simply map database data to display format
  this.priceComparisons.clear();
  Object.keys(priceComparisonsData).forEach(key => {
    const index = parseInt(key, 10);
    this.priceComparisons.set(index, priceComparisonsData[key]);
  });
}
```

## Benefits

### 1. Non-Blocking Operation
- ✅ Adding multiple receipts works seamlessly
- ✅ Price comparison runs in background on server
- ✅ No client-side processing delays
- ✅ No real-time subscriptions that could interfere

### 2. Server-Side Processing
- ✅ API key retrieved securely from database
- ✅ No client-side API key exposure
- ✅ Consistent processing environment
- ✅ Better error handling and logging

### 3. Data Persistence
- ✅ Results stored in database
- ✅ Survive app restarts
- ✅ Can be queried/analyzed
- ✅ Timestamp tracking

### 4. Automatic Triggering
- ✅ Zero client code needed to trigger
- ✅ Happens automatically after receipt processing
- ✅ Fire-and-forget pattern
- ✅ Doesn't block receipt completion

### 5. Simplified Client
- ✅ Fewer dependencies
- ✅ Less code to maintain
- ✅ No state management complexity
- ✅ Just display data from database

## Error Handling

### Server-Side (Graceful Degradation)
```typescript
// In process-receipt: Don't fail if price comparison fails
triggerPriceComparison(supabase, receiptId).catch(error => {
  console.error('Error triggering price comparison:', error);
  // Main receipt processing continues
});

// In compare-prices: Handle missing API key
if (!userSettings?.gemini_api_key) {
  console.log('User Gemini API key not configured');
  return new Response(
    JSON.stringify({ success: true, message: 'API key not configured' }),
    { headers: corsHeaders, status: 200 }
  );
}
```

### Client-Side (Simple)
```typescript
// Just check if data exists
if (this.receipt?.priceComparisons) {
  this.updatePriceComparisons(this.receipt.priceComparisons);
}
// No loading states, no error handling needed
```

## Testing the Flow

### 1. Scan a Receipt
```bash
# User scans receipt
# process-receipt runs on server
# Receipt status: 'processing' → 'completed'
# compare-prices triggered automatically
```

### 2. Check Database
```sql
-- Check receipt was processed
SELECT id, merchant, status, items 
FROM receipts 
WHERE id = '<receipt_id>';

-- Check price comparisons (after a few seconds)
SELECT price_comparisons, price_comparisons_updated_at 
FROM receipts 
WHERE id = '<receipt_id>';
```

### 3. View in Client
```
# Open receipt detail page
# Should see:
# - Receipt data
# - Items list
# - Price comparison cards (if available)
# - Total potential savings
```

## Future Enhancements

### Possible Improvements
1. **Notifications**: Add local notifications when price comparisons complete
2. **Retry Logic**: Retry failed comparisons with exponential backoff
3. **Caching**: Cache common product comparisons to reduce API calls
4. **Analytics**: Track which alternatives users find most useful
5. **Batch Processing**: Process multiple receipts in parallel
6. **User Preferences**: Let users disable price comparisons

### Notification Integration (Future)
```typescript
// In compare-prices edge function (future)
// After updating receipt with comparisons:
if (Object.keys(priceComparisons).length > 0) {
  // Send push notification to user
  await sendNotification(receipt.user_id, {
    title: 'Comparación de precios completa',
    body: `Encontramos ${Object.keys(priceComparisons).length} productos más baratos`
  });
}
```

## Deployment Steps

### 1. Run Database Migration
```bash
# Apply migration 008
psql -h <supabase-host> -U <user> -d <database> \
  -f supabase/migrations/008_add_price_comparison_fields.sql
```

### 2. Deploy Edge Functions
```bash
# Deploy compare-prices edge function
supabase functions deploy compare-prices

# Re-deploy process-receipt with changes
supabase functions deploy process-receipt
```

### 3. Deploy Client App
```bash
# Build and deploy client
npm run build
# Deploy to hosting (Vercel, Netlify, etc.)
```

### 4. Verify
- Scan a test receipt
- Check logs in Supabase Edge Functions dashboard
- Verify price_comparisons column is populated
- Open receipt detail page and verify display

## Conclusion

The refactored architecture provides:
- ✅ **Automatic server-side processing**
- ✅ **Non-blocking client operation**
- ✅ **Data persistence in database**
- ✅ **Simplified client code**
- ✅ **Better error handling**
- ✅ **Scalable design**

The feature now works seamlessly in the background without any client-side complexity or real-time subscription dependencies.
