// Supabase Edge Function: process-receipt
// Processes receipt images asynchronously using Gemini AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n?/g, '').replace(/```\n?$/g, '');
  }
  cleaned = cleaned.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  return cleaned;
}

/**
 * Triggers the next Edge Function to compare prices
 */
async function triggerPriceComparison(supabase: any, receiptId: string) {
  try {
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
      console.error('Price comparison trigger failed:', await response.text());
    } else {
      console.log('Price comparison triggered successfully');
    }
  } catch (error) {
    console.error('Error triggering price comparison:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let receiptId: string | undefined;

  try {
    const body = await req.json();
    receiptId = body.receiptId;
    if (!receiptId) throw new Error('Receipt ID is required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts').select('*').eq('id', receiptId).single();

    if (receiptError || !receipt) throw new Error(`Receipt not found`);

    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings').select('gemini_api_key').eq('user_id', receipt.user_id).single();

    if (settingsError || !userSettings?.gemini_api_key) throw new Error('API key missing');

    const { data: imageData, error: downloadError } = await supabase.storage
      .from('receipts').download(receipt.storage_path);

    if (downloadError || !imageData) throw new Error(`Download failed`);

    const arrayBuffer = await imageData.arrayBuffer();
    const base64Image = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

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
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      }
    );

    if (!geminiResponse.ok) throw new Error(`Gemini Error: ${await geminiResponse.text()}`);

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error('Empty Gemini response');

    const cleanedResponse = extractAndCleanJSON(responseText);
    const extractedData: GeminiResponse = JSON.parse(cleanedResponse);

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
      items: items,
      summary: extractedData.summary,
      updated_at: new Date().toISOString(),
    }).eq('id', receiptId);

    // DISPARADOR DE LA SIGUIENTE FUNCIÓN
    triggerPriceComparison(supabase, receiptId).catch(console.error);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
