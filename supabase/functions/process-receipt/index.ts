// Supabase Edge Function: process-receipt
// Processes receipt images asynchronously using Gemini AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// CORS headers for browser requests
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

    // Get user's Gemini API key
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', receipt.user_id)
      .single();

    if (settingsError || !userSettings?.gemini_api_key) {
      throw new Error('User Gemini API key not configured');
    }

    const geminiApiKey = userSettings.gemini_api_key;

    // Download image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(receipt.storage_path);

    if (downloadError || !imageData) {
      throw new Error(`Failed to download image: ${downloadError?.message}`);
    }

    // Convert blob to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    // Call Gemini API
    const geminiPrompt = `Analiza esta imagen de ticket y extrae la siguiente información en formato JSON:
{
  "comercio": "nombre del comercio/tienda",
  "fecha": "fecha en formato ISO 8601 (YYYY-MM-DD)",
  "total": número (solo el número, sin símbolo de moneda),
  "moneda": "código de moneda (USD, EUR, MXN, GBP, etc.)",
  "items": [
    {
      "descripcion": "nombre del producto/servicio",
      "cantidad": número,
      "precio_unitario": número,
      "categories": ["categoria1", "categoria2"]
    }
  ],
  "summary": "resumen breve generado por IA (ej: 'Compra semanal de comida', 'Compra de muebles', 'Cena en restaurante', 'etc')"
}

Importante:
- Devuelve SOLO JSON válido, sin texto adicional
- Si no encuentras un campo, usa null
- Para la fecha, extrae en formato YYYY-MM-DD, si falta el año usa el año actual
- Para el total, extrae el monto final como número
- Para la moneda, detecta la moneda del ticket (busca símbolos como €, $, £, o códigos de moneda). Si no es claro, usa EUR
- Para items, extrae todos los que puedas identificar
- Para cada item, asigna una o más categorías de: food, beverages, clothing, electronics, travel, education, health, entertainment, home, transport, household, personal-care, other
- Los items pueden tener múltiples categorías (ej: champú podría ser ["personal-care", "health"])
- Para summary, genera una breve descripción en lenguaje natural de lo que representa este ticket
- Sé lo más preciso posible`;

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
                { text: geminiPrompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    
    // Extract JSON from response
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response from Gemini');
    }

    // Clean up markdown code blocks if present
    responseText = responseText.trim();
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/g, '');
    }

    const extractedData: GeminiResponse = JSON.parse(responseText);

    // Transform items to match database schema
    const items = extractedData.items?.map(item => ({
      name: item.descripcion,
      price: item.precio_unitario,
      quantity: item.cantidad,
      categories: item.categories || [],
    })) || [];

    // Update receipt with extracted data
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        status: 'completed',
        merchant: extractedData.comercio || 'Unknown',
        date: extractedData.fecha || new Date().toISOString().split('T')[0],
        total: extractedData.total || 0,
        currency: extractedData.moneda || 'USD',
        items: items,
        summary: extractedData.summary || null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    if (updateError) {
      throw new Error(`Failed to update receipt: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, receiptId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing receipt:', error);

    // Try to update receipt with error status
    if (receiptId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase
          .from('receipts')
          .update({
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', receiptId);
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

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
