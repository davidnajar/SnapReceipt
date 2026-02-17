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
    console.log(`[DEBUG] Iniciando comparación para receiptId: ${receiptId}`);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1. Obtener ticket
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      console.error(`[DEBUG] Error obteniendo ticket: ${receiptError?.message}`);
      throw new Error('Ticket no encontrado');
    }

    if (!receipt.items?.length) {
      console.log('[DEBUG] El ticket no tiene items para procesar.');
      return new Response(JSON.stringify({ success: true, msg: 'Sin items' }));
    }

    console.log(`[DEBUG] Procesando ${receipt.items.length} productos.`);

    // 2. Obtener API Key
    const { data: settings } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', receipt.user_id)
      .single();

    const geminiApiKey = settings?.gemini_api_key;
    if (!geminiApiKey) throw new Error('API Key no configurada');

    // 3. Preparar lista para el prompt
    const itemsList = receipt.items.map((item: any, index: number) => 
      `${index}: ${item.name} (${item.price} ${receipt.currency || 'EUR'})`
    ).join('\n');

    const prompt = `Actúa como un asistente de comparación de precios en España. 
    Para cada producto de esta lista, busca 2 alternativas más baratas en tiendas online o locales (Mercadona, Carrefour, Lidl, Amazon, etc).
    
    Lista de productos:
    ${itemsList}

    Devuelve SOLAMENTE un JSON con esta estructura exacta:
    {
      "0": [{"storeName": "nombre", "price": 0, "savings": 0, "url": "link o null"}],
      "1": [...]
    }
    Importante: Solo incluye alternativas que realmente sean más baratas.`;

    console.log(`[DEBUG] Enviando solicitud a Gemini 2.5 Flash...`);

    // 4. Llamada a la API
    const startTime = Date.now();
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

    const duration = Date.now() - startTime;
    console.log(`[DEBUG] Gemini respondió en ${duration}ms con status: ${geminiResponse.status}`);

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error(`[DEBUG] Error API Gemini: ${errorBody}`);
      throw new Error(`Error Gemini: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log(`[DEBUG] Respuesta cruda de Gemini (primeros 200 chars): ${responseText?.substring(0, 200)}...`);

    // 5. Parsear y Guardar
    const priceComparisons = JSON.parse(responseText || '{}');
    const comparisonsCount = Object.keys(priceComparisons).length;

    console.log(`[DEBUG] Comparaciones encontradas para ${comparisonsCount} productos.`);

    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        price_comparisons: priceComparisons,
        price_comparisons_updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    if (updateError) {
      console.error(`[DEBUG] Error actualizando Supabase: ${updateError.message}`);
      throw updateError;
    }

    console.log(`[DEBUG] Proceso completado con éxito para receiptId: ${receiptId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      itemsProcessed: receipt.items.length,
      comparisonsFound: comparisonsCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[DEBUG] FATAL ERROR: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
