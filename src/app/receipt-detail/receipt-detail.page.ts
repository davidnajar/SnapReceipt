import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';
import { CategoryHelper } from '../services/category-helper';
import { CurrencyHelper } from '../services/currency-helper';
import { PriceComparisonService } from '../services/price-comparison.service';
import { GeminiService } from '../services/gemini.service';
import { Receipt, ReceiptItem, PriceComparison } from '../models/receipt.model';

@Component({
  selector: 'app-receipt-detail',
  templateUrl: './receipt-detail.page.html',
  styleUrls: ['./receipt-detail.page.scss'],
  standalone: false
})
export class ReceiptDetailPage implements OnInit {
  receipt: Receipt | null = null;
  isLoading = false;
  isLoadingPriceComparisons = false;
  priceComparisons: Map<number, PriceComparison[]> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private categoryHelper: CategoryHelper,
    private currencyHelper: CurrencyHelper,
    private priceComparisonService: PriceComparisonService,
    private geminiService: GeminiService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    const receiptId = this.route.snapshot.paramMap.get('id');
    if (receiptId) {
      await this.loadReceipt(receiptId);
      // Load price comparisons in background after receipt is loaded
      if (this.receipt && this.receipt.items && this.receipt.items.length > 0) {
        this.loadPriceComparisons();
      }
    } else {
      this.showError('No receipt ID provided');
      this.router.navigate(['/receipts']);
    }
  }

  /**
   * Load receipt details from Supabase
   */
  async loadReceipt(receiptId: string) {
    const loading = await this.loadingController.create({
      message: 'Loading receipt details...'
    });
    await loading.present();

    this.isLoading = true;

    try {
      const receipts = await this.supabaseService.getReceipts();
      this.receipt = receipts.find(r => r.id === receiptId) || null;

      if (!this.receipt) {
        await this.showError('Receipt not found');
        this.router.navigate(['/receipts']);
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
      await this.showError('Failed to load receipt. Please try again.');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  /**
   * Navigate back to receipts list
   */
  goBack() {
    this.router.navigate(['/receipts']);
  }

  /**
   * Get category color for chip styling
   */
  getCategoryColor(category?: string): string {
    return this.categoryHelper.getCategoryColor(category);
  }

  /**
   * Get category icon for display
   */
  getCategoryIcon(category?: string): string {
    return this.categoryHelper.getCategoryIcon(category);
  }

  /**
   * Format amount with currency symbol
   */
  formatAmount(amount: number, currency?: string): string {
    return this.currencyHelper.formatAmount(amount, currency);
  }

  /**
   * Get item categories (supports both legacy single category and new multiple categories)
   */
  getItemCategories(item: ReceiptItem): string[] {
    if (item.categories && item.categories.length > 0) {
      return item.categories;
    }
    if (item.category) {
      return [item.category];
    }
    return [];
  }

  /**
   * Load price comparisons for receipt items in background
   */
  private async loadPriceComparisons() {
    if (!this.receipt || !this.receipt.items || this.receipt.items.length === 0) {
      return;
    }

    // Check if user has API key configured
    if (!this.geminiService.hasUserApiKey()) {
      console.log('User API key not configured, skipping price comparisons');
      return;
    }

    this.isLoadingPriceComparisons = true;

    try {
      // Get the user's API key from storage to initialize price comparison service
      const userKey = await this.getUserApiKey();
      if (userKey) {
        this.priceComparisonService.initialize(userKey);
        
        // Find alternatives for all items
        const currency = this.receipt.currency || 'USD';
        this.priceComparisons = await this.priceComparisonService.findAlternativesForItems(
          this.receipt.items,
          currency
        );
      }
    } catch (error) {
      console.error('Error loading price comparisons:', error);
      // Fail silently - price comparisons are optional
    } finally {
      this.isLoadingPriceComparisons = false;
    }
  }

  /**
   * Get user's API key from local storage
   */
  private async getUserApiKey(): Promise<string | null> {
    try {
      const key = localStorage.getItem('gemini_api_key');
      return key;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  /**
   * Get price comparisons for a specific item
   */
  getPriceComparisonsForItem(index: number): PriceComparison[] {
    return this.priceComparisons.get(index) || [];
  }

  /**
   * Check if an item has price comparisons
   */
  hasPriceComparisons(index: number): boolean {
    const comparisons = this.priceComparisons.get(index);
    return comparisons !== undefined && comparisons.length > 0;
  }

  /**
   * Get total savings if user buys all cheaper alternatives
   */
  getTotalPotentialSavings(): number {
    let totalSavings = 0;
    this.priceComparisons.forEach((comparisons) => {
      if (comparisons.length > 0) {
        // Use the first (best) alternative for each item
        totalSavings += comparisons[0].savings;
      }
    });
    return totalSavings;
  }

  /**
   * Shows error message to user
   */
  private async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
