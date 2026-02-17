import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';
import { CategoryHelper } from '../services/category-helper';
import { CurrencyHelper } from '../services/currency-helper';
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
  priceComparisons: Map<number, PriceComparison[]> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private categoryHelper: CategoryHelper,
    private currencyHelper: CurrencyHelper,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    const receiptId = this.route.snapshot.paramMap.get('id');
    if (receiptId) {
      await this.loadReceipt(receiptId);
      // Load price comparisons if available
      if (this.receipt?.priceComparisons) {
        this.updatePriceComparisons(this.receipt.priceComparisons);
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
   * Update price comparisons from database result
   */
  private updatePriceComparisons(priceComparisonsData: any) {
    this.priceComparisons.clear();
    
    if (priceComparisonsData && typeof priceComparisonsData === 'object') {
      Object.keys(priceComparisonsData).forEach(key => {
        const index = parseInt(key, 10);
        if (!isNaN(index)) {
          this.priceComparisons.set(index, priceComparisonsData[key]);
        }
      });
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
