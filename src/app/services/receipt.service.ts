import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Receipt } from '../models/receipt.model';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private activeSubscriptions: Map<string, RealtimeChannel> = new Map();

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Upload image and create receipt record for async processing
   * @param imageBlob Image blob to upload
   * @returns Promise with created receipt ID
   */
  async uploadAndProcess(imageBlob: Blob): Promise<string> {
    const supabase = this.supabaseService.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const user = await this.supabaseService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }

    try {
      // Generate unique filename
      const fileName = `receipt_${Date.now()}.jpg`;
      const storagePath = `receipts/${user.id}/${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(storagePath, imageBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(storagePath);

      // Create receipt record with 'processing' status
      const { data: receipt, error: insertError } = await supabase
        .from('receipts')
        .insert([{
          user_id: user.id,
          status: 'processing',
          storage_path: storagePath,
          image_url: urlData.publicUrl,
          merchant: 'Processing...',
          date: new Date().toISOString().split('T')[0],
          total: 0,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError || !receipt) {
        throw insertError || new Error('Failed to create receipt record');
      }

      // Invoke Edge Function to process receipt asynchronously
      const { error: functionError } = await supabase.functions.invoke('process-receipt', {
        body: { receiptId: receipt.id }
      });

      if (functionError) {
        console.error('Error invoking process-receipt function:', functionError);
        // Update receipt with error status
        await supabase
          .from('receipts')
          .update({
            status: 'error',
            error_message: functionError.message || 'Failed to process receipt',
            updated_at: new Date().toISOString()
          })
          .eq('id', receipt.id);
      }

      return receipt.id;
    } catch (error) {
      console.error('Error in uploadAndProcess:', error);
      throw new Error('Failed to upload and process receipt.');
    }
  }

  /**
   * Subscribe to real-time updates for a specific receipt
   * @param receiptId Receipt ID to subscribe to
   * @param callback Function to call when receipt is updated
   * @returns Unsubscribe function
   */
  subscribeToReceipt(
    receiptId: string,
    callback: (receipt: Receipt) => void
  ): () => void {
    const supabase = this.supabaseService.getSupabaseClient();
    if (!supabase) {
      console.error('Supabase is not configured.');
      return () => {};
    }

    // Unsubscribe from existing subscription if any
    this.unsubscribeFromReceipt(receiptId);

    // Create new subscription
    const channel = supabase
      .channel(`receipt-${receiptId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'receipts',
          filter: `id=eq.${receiptId}`
        },
        (payload) => {
          const updatedReceipt = this.mapReceiptFromDB(payload.new);
          callback(updatedReceipt);
        }
      )
      .subscribe();

    // Store subscription for cleanup
    this.activeSubscriptions.set(receiptId, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromReceipt(receiptId);
  }

  /**
   * Unsubscribe from receipt updates
   * @param receiptId Receipt ID to unsubscribe from
   */
  private unsubscribeFromReceipt(receiptId: string): void {
    const channel = this.activeSubscriptions.get(receiptId);
    if (channel) {
      channel.unsubscribe();
      this.activeSubscriptions.delete(receiptId);
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): void {
    this.activeSubscriptions.forEach((channel) => {
      channel.unsubscribe();
    });
    this.activeSubscriptions.clear();
  }

  /**
   * Map database receipt to Receipt model
   * @param dbReceipt Receipt from database
   * @returns Receipt model
   */
  private mapReceiptFromDB(dbReceipt: any): Receipt {
    return {
      id: dbReceipt.id,
      date: dbReceipt.date,
      total: dbReceipt.total,
      merchant: dbReceipt.merchant,
      items: dbReceipt.items,
      category: dbReceipt.category || undefined,
      imageUrl: dbReceipt.image_url || undefined,
      createdAt: new Date(dbReceipt.created_at),
      status: dbReceipt.status || 'completed',
      storagePath: dbReceipt.storage_path || undefined,
      errorMessage: dbReceipt.error_message || undefined,
      currency: dbReceipt.currency || undefined
    };
  }

  /**
   * Get receipt by ID
   * @param receiptId Receipt ID
   * @returns Promise with receipt data
   */
  async getReceiptById(receiptId: string): Promise<Receipt | null> {
    const supabase = this.supabaseService.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (error) {
      console.error('Error fetching receipt:', error);
      return null;
    }

    return this.mapReceiptFromDB(data);
  }
}
