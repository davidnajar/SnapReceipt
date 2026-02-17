import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { receiptId } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: receipt } = await supabase.from('receipts').select('*').eq('id', receiptId).single();
    if (!receipt?.items?.length) return new Response(JSON.stringify({ success: true, msg: 'No hay items' }));

    const { data: settings } = await supabase.from('user_settings').select('gemini_api_key').eq('user_id', receipt.user_id).single();
    const geminiApiKey = settings?.gemini_api_key;
    if (!geminiApiKey) throw new Error('API Key no configurada');

    // 1. Preparamos la lista de productos como un bloque de texto
    const itemsList = receipt.items.map((item: any, index: number) => 
      `${index}: ${item.name} (${item.price} ${receipt.currency})`
    ).join('\n');

    // 2. Prompt optimizado para recibir un JSON con todos los resultados
    const prompt = `Actúa como un asistente de comparación de precios en España. 
    Para cada producto de esta lista, busca 2 alternativas más baratas en tiendas online o locales (Mercadona, Carrefour, Lidl, Amazon, etc).
    
    Lista de productos:
    ${itemsList}

    Devuelve SOLAMENTE un JSON con esta estructura exacta, donde la clave es el número del índice:
    {
      "0": [{"storeName": "nombre", "price": 0, "savings": 0, "url": "link o null"}],
      "1": [...]
    }
    Importante: Solo incluye alternativas que realmente sean más baratas. Si no encuentras, deja el array vacío para ese índice.`;

    // 3. Una sola petición para TODO el ticket (Ahorra cuota RPD y evita 429)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.2, 
            responseMimeType: 'application/json' 
          },
        }),
      }
    );

    if (!geminiResponse.ok) throw new Error(`Error Gemini: ${await geminiResponse.text()}`);

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // 4. Guardamos todas las comparaciones de una vez
    const priceComparisons = JSON.parse(responseText || '{}');

    await supabase.from('receipts').update({
      price_comparisons: priceComparisons,
      price_comparisons_updated_at: new Date().toISOString(),
    }).eq('id', receiptId);

    return new Response(JSON.stringify({ 
      success: true, 
      itemsProcessed: receipt.items.length,
      quotaUsed: "1 request" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
