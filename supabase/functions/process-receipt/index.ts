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
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let receiptId: string | undefined;

  try {
    const body = await req.json();
    receiptId = body.receiptId;
    
    if (!receiptId) throw new Error('Receipt ID is required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) throw new Error(`Receipt not found`);

    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', receipt.user_id)
      .single();

    if (settingsError || !userSettings?.gemini_api_key) {
      throw new Error('User Gemini API key not configured');
    }

    const { data: imageData, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(receipt.storage_path);

    if (downloadError || !imageData) throw new Error(`Failed to download image`);

    const arrayBuffer = await imageData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const geminiPrompt = `Analiza esta imagen de ticket y extrae la información en JSON. 
    Campos: comercio, fecha (YYYY-MM-DD), total (número), moneda (EUR/USD), items (descripcion, cantidad, precio_unitario, categories[]), summary.
    Categorías: food, beverages, clothing, electronics, travel, education, health, entertainment, home, transport, household, personal-care, other.
    IMPORTANTE: Genera un JSON completo y válido. No cortes la respuesta.`;

    // RESTAURADO: gemini-2.5-flash
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userSettings.gemini_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: geminiPrompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${await geminiResponse.text()}`);

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) throw new Error('No response from Gemini');

    const cleanedResponse = extractAndCleanJSON(responseText);

    let extractedData: GeminiResponse;
    try {
      extractedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // Log para diagnosticar si el 2.5 vuelve a enviar JSON incompleto
      console.error('Error al parsear JSON del modelo 2.5');
      console.error('Longitud total:', cleanedResponse.length);
      console.error('Últimos 150 caracteres:', cleanedResponse.slice(-150));
      throw new Error(`JSON incompleto.`);
    }

    const items = extractedData.items?.map(item => ({
      name: item.descripcion,
      price: item.precio_unitario,
      quantity: item.cantidad,
      categories: item.categories || [],
    })) || [];

    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        status: 'completed',
        merchant: extractedData.comercio || 'Unknown',
        date: extractedData.fecha || new Date().toISOString().split('T')[0],
        total: extractedData.total || 0,
        currency: extractedData.moneda || 'EUR',
        items: items,
        summary: extractedData.summary || null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    if (updateError) throw new Error(`Update error: ${updateError.message}`);

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
