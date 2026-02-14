import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Receipt } from '../models/receipt.model';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    // Only initialize Supabase if properly configured
    if (this.isConfigured()) {
      try {
        this.supabase = createClient(
          environment.supabase.url,
          environment.supabase.anonKey
        );
      } catch (error) {
        console.error('Error initializing Supabase:', error);
      }
    }
  }

  /**
   * Uploads receipt image to Supabase Storage
   * @param base64Image Base64 encoded image string
   * @param fileName File name for the image
   * @returns Promise with the public URL of the uploaded image
   */
  async uploadReceiptImage(base64Image: string, fileName: string): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured. Please set up your Supabase credentials.');
    }

    try {
      // Convert base64 to blob
      const blob = this.base64ToBlob(base64Image, 'image/jpeg');
      
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('receipts')
        .upload(`receipts/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('receipts')
        .getPublicUrl(`receipts/${fileName}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload receipt image.');
    }
  }

  /**
   * Saves receipt data to Supabase database
   * @param receipt Receipt data to save
   * @returns Promise with the saved receipt including its ID
   */
  async saveReceipt(receipt: Receipt): Promise<Receipt> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured. Please set up your Supabase credentials.');
    }

    try {
      const { data, error } = await this.supabase
        .from('receipts')
        .insert([{
          date: receipt.date,
          total: receipt.total,
          merchant: receipt.merchant,
          items: receipt.items || null,
          category: receipt.category || null,
          image_url: receipt.imageUrl || null,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Map database fields to Receipt model
      return {
        id: data.id,
        date: data.date,
        total: data.total,
        merchant: data.merchant,
        items: data.items,
        category: data.category,
        imageUrl: data.image_url,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error saving receipt:', error);
      throw new Error('Failed to save receipt data.');
    }
  }

  /**
   * Retrieves all receipts from the database
   * @returns Promise with array of receipts
   */
  async getReceipts(): Promise<Receipt[]> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured. Please set up your Supabase credentials.');
    }

    try {
      const { data, error } = await this.supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Map database fields to Receipt model
      return data.map((item: any) => ({
        id: item.id,
        date: item.date,
        total: item.total,
        merchant: item.merchant,
        items: item.items,
        category: item.category,
        imageUrl: item.image_url,
        createdAt: new Date(item.created_at)
      }));
    } catch (error) {
      console.error('Error fetching receipts:', error);
      throw new Error('Failed to fetch receipts.');
    }
  }

  /**
   * Validates if Supabase is properly configured
   * @returns boolean indicating if Supabase is configured
   */
  isConfigured(): boolean {
    return environment.supabase.url !== 'YOUR_SUPABASE_URL_HERE' && 
           environment.supabase.anonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE' &&
           environment.supabase.url.length > 0 &&
           environment.supabase.anonKey.length > 0 &&
           environment.supabase.url.startsWith('http');
  }

  /**
   * Helper method to convert base64 to Blob
   * @param base64 Base64 encoded string
   * @param contentType MIME type of the content
   * @returns Blob object
   */
  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }
}
