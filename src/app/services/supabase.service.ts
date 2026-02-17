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
   * Get the Supabase client instance
   * @returns SupabaseClient instance or null
   */
  getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

  // ============ Authentication Methods ============

  /**
   * Sign up a new user
   * @param email User email
   * @param password User password
   * @returns Promise with auth response
   */
  async signUp(email: string, password: string) {
    if (!this.supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in an existing user
   * @param email User email
   * @param password User password
   * @returns Promise with auth response
   */
  async signIn(email: string, password: string) {
    if (!this.supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    if (!this.supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get the current authenticated user
   * @returns Promise with user data or null
   */
  async getCurrentUser() {
    if (!this.supabase) {
      return null;
    }

    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  /**
   * Get current session
   * @returns Promise with session data or null
   */
  async getSession() {
    if (!this.supabase) {
      return null;
    }

    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  /**
   * Listen to auth state changes
   * @param callback Function to call on auth state change
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!this.supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return this.supabase.auth.onAuthStateChange(callback);
  }

  // ============ User Settings Methods ============

  // PostgreSQL error code for no rows returned
  private readonly PGRST_NO_ROWS_ERROR = 'PGRST116';

  /**
   * Get user settings including Gemini API key
   * @returns Promise with user settings
   */
  async getUserSettings(): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured.');
    }

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }

    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no settings exist yet, return empty settings
      if (error.code === this.PGRST_NO_ROWS_ERROR) {
        return { gemini_api_key: null, preferences: {} };
      }
      throw error;
    }

    return data;
  }

  /**
   * Save or update user settings
   * @param geminiApiKey Gemini API key
   * @param preferences Additional preferences
   * @returns Promise with updated settings
   */
  async saveUserSettings(geminiApiKey: string | null, preferences: any = {}) {
    if (!this.supabase) {
      throw new Error('Supabase is not configured.');
    }

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }

    const { data, error } = await this.supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        gemini_api_key: geminiApiKey,
        preferences: preferences
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============ Receipt Methods ============

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

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }

    try {
      // Convert base64 to blob
      const blob = this.base64ToBlob(base64Image, 'image/jpeg');
      
      // Upload to Supabase Storage with user-specific path
      const { data, error } = await this.supabase.storage
        .from('receipts')
        .upload(`receipts/${user.id}/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('receipts')
        .getPublicUrl(`receipts/${user.id}/${fileName}`);

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

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }

    try {
      const { data, error } = await this.supabase
        .from('receipts')
        .insert([{
          user_id: user.id,
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
      return data.map((item: {
        id: string;
        date: string;
        total: number;
        merchant: string;
        items: any;
        category: string | null;
        image_url: string | null;
        created_at: string;
        status: string | null;
        storage_path: string | null;
        error_message: string | null;
        currency: string | null;
        summary: string | null;
        price_comparisons: any;
        price_comparisons_updated_at: string | null;
      }) => ({
        id: item.id,
        date: item.date,
        total: item.total,
        merchant: item.merchant,
        items: item.items,
        category: item.category || undefined,
        imageUrl: item.image_url || undefined,
        createdAt: new Date(item.created_at),
        status: (item.status as 'processing' | 'completed' | 'error') || 'completed',
        storagePath: item.storage_path || undefined,
        errorMessage: item.error_message || undefined,
        currency: item.currency || undefined,
        summary: item.summary || undefined,
        priceComparisons: item.price_comparisons || undefined,
        priceComparisonsUpdatedAt: item.price_comparisons_updated_at ? new Date(item.price_comparisons_updated_at) : undefined
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
