// Supabase Edge Function: process-receipt
// Processes receipt images asynchronously using Gemini AI
// VERBOSE LOGGING ENABLED

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOG_PREFIX = '[process-receipt]';

function log(step: string, data?: any) {
  console.log(JSON.stringify({
    service: 'process-receipt',
    step,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  }));
}

interface ReceiptItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  categories?: string[];
}

interface GeminiResponse {
  comercio: string;
  fecha: string;
  total: number;
  moneda: string;
  items: ReceiptItem[];
  summary?: string;
}

function extractAndCleanJSON(responseText: string): string {
  log('extract-json-start');
  let cleaned = responseText.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n?/g, '').replace(/```\n?$/g, '');
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  log('extract-json-complete');
  return cleaned;
}

async function triggerPriceComparison(receiptId: string) {
  try {
    log('trigger-price-comparison-start', { receiptId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    if (!response.ok) {
      log('trigger-price-comparison-failed', {
        status: response.status,
        body: await response.text()
      });
    } else {
      log('trigger-price-comparison-success', { receiptId });
    }
  } catch (error) {
    log('trigger-price-comparison-error', { error: error.message });
  }
}

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  let receiptId: string | undefined;

  try {
    log('request-received');

    const body = await req.json();
    receiptId = body.receiptId;

    if (!receiptId) throw new Error('Receipt ID is required');

    log('receipt-id-validated', { receiptId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('fetching-receipt');

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt)
      throw new Error(`Receipt not found`);

    log('receipt-loaded', { user_id: receipt.user_id });

    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', receipt.user_id)
      .single();

    if (!userSettings?.gemini_api_key)
      throw new Error('API key missing');

    log('gemini-key-found');

    const { data: imageData } = await supabase.storage
      .from('receipts')
      .download(receipt.storage_path);

    if (!imageData)
      throw new Error(`Download failed`);

    log('image-downloaded');

    const arrayBuffer = await imageData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    log('calling-gemini');

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userSettings.gemini_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Analiza el ticket y devuelve JSON con comercio, fecha, total, moneda, items y summary." },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json'
          },
        }),
      }
    );

    if (!geminiResponse.ok)
      throw new Error(`Gemini Error: ${await geminiResponse.text()}`);

    log('gemini-response-received');

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText)
      throw new Error('Empty Gemini response');

    const cleanedResponse = extractAndCleanJSON(responseText);
    const extractedData: GeminiResponse = JSON.parse(cleanedResponse);

    log('gemini-json-parsed', {
      merchant: extractedData.comercio,
      total: extractedData.total,
      items_count: extractedData.items?.length
    });

    const items = extractedData.items?.map(item => ({
      name: item.descripcion,
      price: item.precio_unitario,
      quantity: item.cantidad,
      categories: item.categories || [],
    })) || [];

    await supabase.from('receipts').update({
      status: 'completed',
      merchant: extractedData.comercio || 'Unknown',
      date: extractedData.fecha,
      total: extractedData.total,
      currency: extractedData.moneda || 'EUR',
      items,
      summary: extractedData.summary,
      updated_at: new Date().toISOString(),
    }).eq('id', receiptId);

    log('receipt-updated');

    triggerPriceComparison(receiptId).catch(console.error);

    log('process-completed', {
      receiptId,
      duration_ms: Date.now() - startTime
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    log('process-error', {
      receiptId,
      error: error.message,
      duration_ms: Date.now() - startTime
    });

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});