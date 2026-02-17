// Supabase Edge Function: compare-prices
// Finds cheaper alternatives for receipt items using Gemini AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  categories?: string[];
}

interface PriceComparison {
  storeName: string;
  price: number;
  savings: number;
  savingsPercent: number;
  url?: string;
  location?: string;
  availability: 'online' | 'local' | 'both';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let receiptId: string | undefined;

  try {
    // Get receipt ID from request
    const body = await req.json();
    receiptId = body.receiptId;
    
    if (!receiptId) {
      throw new Error('Receipt ID is required');
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get receipt record
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      throw new Error(`Receipt not found: ${receiptError?.message}`);
    }

    // Check if receipt has items
    if (!receipt.items || !Array.isArray(receipt.items) || receipt.items.length === 0) {
      console.log('Receipt has no items to compare');
      return new Response(
        JSON.stringify({ success: true, message: 'No items to compare' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get user's Gemini API key
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', receipt.user_id)
      .single();

    if (settingsError || !userSettings?.gemini_api_key) {
      console.log('User Gemini API key not configured');
      return new Response(
        JSON.stringify({ success: true, message: 'API key not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const geminiApiKey = userSettings.gemini_api_key;
    const currency = receipt.currency || 'USD';
    const items: ReceiptItem[] = receipt.items;

    // Process each item to find cheaper alternatives
    const priceComparisons: Record<number, PriceComparison[]> = {};

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        const prompt = `You are a price comparison assistant. Find cheaper alternatives for the following product:

Product Name: ${item.name}
Current Price: ${item.price} ${currency}
Quantity: ${item.quantity}

Search for this product and find up to 3 cheaper alternatives from:
1. Online retailers (e.g., Amazon, Walmart, Target, local e-commerce sites)
2. Local shops or supermarkets (if applicable)

Return ONLY valid JSON in this exact format:
{
  "alternatives": [
    {
      "storeName": "store name",
      "price": number (in ${currency}),
      "savings": number (calculated as current price - alternative price),
      "savingsPercent": number (calculated as savings/current price * 100),
      "availability": "online" or "local" or "both",
      "location": "address or region (for local shops)" or null,
      "url": "product URL (for online retailers)" or null
    }
  ]
}

Important:
- Return ONLY cheaper alternatives (price must be less than ${item.price})
- If no cheaper alternatives exist, return empty array: {"alternatives": []}
- Prices should be realistic and based on current market prices
- For online retailers, provide a URL if possible
- For local shops, provide location information
- Calculate savings and savingsPercent accurately
- Sort results by savings (highest savings first)
- Return ONLY valid JSON, no additional text or explanations`;

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 2048,
              },
            }),
          }
        );

        if (!geminiResponse.ok) {
          console.error(`Gemini API error for item ${i}:`, await geminiResponse.text());
          continue; // Skip this item and continue with next
        }

        const geminiData = await geminiResponse.json();
        
        // Extract JSON from response
        let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
          console.error(`No response from Gemini for item ${i}`);
          continue;
        }

        // Clean up markdown code blocks if present
        responseText = responseText.trim();
        if (responseText.startsWith('```json')) {
          responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (responseText.startsWith('```')) {
          responseText = responseText.replace(/```\n?/g, '');
        }

        const parsedData = JSON.parse(responseText);
        
        // Validate and store alternatives
        if (parsedData.alternatives && Array.isArray(parsedData.alternatives) && parsedData.alternatives.length > 0) {
          priceComparisons[i] = parsedData.alternatives;
        }
      } catch (error) {
        console.error(`Error processing item ${i}:`, error);
        // Continue with next item
      }
    }

    // Update receipt with price comparisons
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        price_comparisons: priceComparisons,
        price_comparisons_updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    if (updateError) {
      throw new Error(`Failed to update receipt: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        receiptId,
        comparisonsFound: Object.keys(priceComparisons).length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error comparing prices:', error);

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
