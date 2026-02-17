import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PriceComparison, ReceiptItem } from '../models/receipt.model';

@Injectable({
  providedIn: 'root'
})
export class PriceComparisonService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {}

  /**
   * Initialize the service with an API key
   * @param apiKey Gemini API key
   */
  initialize(apiKey: string) {
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    } catch (error) {
      console.error('Error initializing PriceComparisonService:', error);
      throw error;
    }
  }

  /**
   * Search for cheaper alternatives for a product using AI
   * @param item Receipt item to find alternatives for
   * @param currency Currency code for price comparison
   * @returns Promise with array of price comparisons
   */
  async findCheaperAlternatives(item: ReceiptItem, currency: string = 'USD'): Promise<PriceComparison[]> {
    if (!this.model) {
      throw new Error('Price comparison service is not initialized. Please set up your Gemini API key.');
    }

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

      const result = await this.model.generateContent([prompt]);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const parsedData = JSON.parse(jsonText);
      
      // Validate and return alternatives
      if (parsedData.alternatives && Array.isArray(parsedData.alternatives)) {
        return parsedData.alternatives;
      }
      
      return [];
    } catch (error) {
      console.error('Error finding cheaper alternatives:', error);
      // Return empty array on error rather than throwing
      return [];
    }
  }

  /**
   * Find price comparisons for multiple items in batch
   * @param items Array of receipt items
   * @param currency Currency code
   * @returns Promise with map of item index to price comparisons
   */
  async findAlternativesForItems(
    items: ReceiptItem[], 
    currency: string = 'USD'
  ): Promise<Map<number, PriceComparison[]>> {
    const results = new Map<number, PriceComparison[]>();
    
    // Process items sequentially to avoid rate limiting
    for (let i = 0; i < items.length; i++) {
      try {
        const alternatives = await this.findCheaperAlternatives(items[i], currency);
        if (alternatives.length > 0) {
          results.set(i, alternatives);
        }
      } catch (error) {
        console.error(`Error finding alternatives for item ${i}:`, error);
        // Continue with next item
      }
    }
    
    return results;
  }

  /**
   * Check if the service is initialized
   * @returns boolean indicating if API is ready
   */
  isInitialized(): boolean {
    return this.model !== null;
  }
}
