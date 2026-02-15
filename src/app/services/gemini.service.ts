import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../environments/environment';
import { Receipt } from '../models/receipt.model';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private userApiKey: string | null = null;

  constructor() {
    // Initialize with environment key if available (for backwards compatibility)
    if (this.isConfigured()) {
      try {
        this.genAI = new GoogleGenerativeAI(environment.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      } catch (error) {
        console.error('Error initializing Gemini AI:', error);
      }
    }
  }

  /**
   * Set user's personal API key
   * @param apiKey User's Gemini API key
   */
  setUserApiKey(apiKey: string) {
    this.userApiKey = apiKey;
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
      console.error('Error initializing Gemini AI with user key:', error);
      throw error;
    }
  }

  /**
   * Clear user's API key
   */
  clearUserApiKey() {
    this.userApiKey = null;
    this.genAI = null;
    this.model = null;
  }

  /**
   * Extracts receipt data from an image using Gemini AI
   * @param base64Image Base64 encoded image string
   * @returns Promise with extracted receipt data
   */
  async extractReceiptData(base64Image: string): Promise<Partial<Receipt>> {
    if (!this.model) {
      throw new Error('Gemini AI is not configured. Please set up your Gemini API key.');
    }

    try {
      // Prepare the prompt for Gemini
      const prompt = `Analyze this receipt image and extract the following information in JSON format:
      {
        "date": "YYYY-MM-DD format",
        "total": number (just the number, no currency symbol),
        "merchant": "store/merchant name",
        "items": [{"name": "item name", "price": number, "quantity": number}],
        "category": "general category like groceries, restaurant, shopping, etc."
      }
      
      Important:
      - Return ONLY valid JSON, no additional text
      - If you can't find a field, use null
      - For date, try to extract in YYYY-MM-DD format, if year is missing, use current year
      - For total, extract the final total amount as a number
      - For items, extract as many as you can identify
      - Be as accurate as possible`;

      // Prepare image data for Gemini
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      };

      // Generate content with both text and image
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      // Remove markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const extractedData: Partial<Receipt> = JSON.parse(jsonText);
      
      return extractedData;
    } catch (error) {
      console.error('Error extracting receipt data:', error);
      throw new Error('Failed to extract receipt data. Please try again.');
    }
  }

  /**
   * Validates if the Gemini API key is configured
   * @returns boolean indicating if API key is set
   */
  isConfigured(): boolean {
    // Check if user has set their own API key first
    if (this.userApiKey && this.userApiKey.length > 0) {
      return true;
    }
    // Fall back to environment key
    return environment.gemini.apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && 
           environment.gemini.apiKey.length > 0;
  }

  /**
   * Check if user has their own API key configured
   * @returns boolean indicating if user API key is set
   */
  hasUserApiKey(): boolean {
    return this.userApiKey !== null && this.userApiKey.length > 0;
  }
}
