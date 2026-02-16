import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';
import { CategoryHelper } from '../services/category-helper';
import { CurrencyHelper } from '../services/currency-helper';
import { Receipt } from '../models/receipt.model';

interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

interface DateGroupTotal {
  period: string;
  total: number;
  count: number;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: false
})
export class ReportsPage implements OnInit {
  receipts: Receipt[] = [];
  filteredReceipts: Receipt[] = [];
  isLoading = false;

  // Filter options
  startDate: string = '';
  endDate: string = '';
  selectedMerchant: string = 'all';
  selectedCategory: string = 'all';
  groupBy: 'day' | 'week' | 'month' = 'month';

  // Available options for filters
  merchants: string[] = [];
  categories: string[] = [];

  // Calculated statistics
  totalSpending: number = 0;
  categoryTotals: CategoryTotal[] = [];
  merchantTotals: MerchantTotal[] = [];
  dateGroupTotals: DateGroupTotal[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private categoryHelper: CategoryHelper,
    private currencyHelper: CurrencyHelper,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    // Set default date range (last 3 months)
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    
    this.endDate = now.toISOString().split('T')[0];
    this.startDate = threeMonthsAgo.toISOString().split('T')[0];

    await this.loadReceipts();
  }

  async ionViewWillEnter() {
    await this.loadReceipts();
  }

  /**
   * Load all receipts from Supabase
   */
  async loadReceipts() {
    const loading = await this.loadingController.create({
      message: 'Cargando recibos...'
    });
    await loading.present();

    this.isLoading = true;

    try {
      this.receipts = await this.supabaseService.getReceipts();
      
      // Extract unique merchants and categories
      this.merchants = [...new Set(this.receipts.map(r => r.merchant))].sort();
      
      const allCategories = new Set<string>();
      this.receipts.forEach(r => {
        if (r.category) allCategories.add(r.category);
        if (r.items) {
          r.items.forEach(item => {
            if (item.category) allCategories.add(item.category);
            if (item.categories) {
              item.categories.forEach(cat => allCategories.add(cat));
            }
          });
        }
      });
      this.categories = Array.from(allCategories).sort();

      this.applyFilters();
    } catch (error) {
      console.error('Error loading receipts:', error);
      await this.showError('Error al cargar los recibos. Inténtalo de nuevo.');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  /**
   * Apply filters and recalculate statistics
   */
  applyFilters() {
    // Filter receipts based on criteria
    this.filteredReceipts = this.receipts.filter(receipt => {
      // Date filter
      const receiptDate = new Date(receipt.date);
      const start = this.startDate ? new Date(this.startDate) : null;
      const end = this.endDate ? new Date(this.endDate) : null;
      
      if (start && receiptDate < start) return false;
      if (end && receiptDate > end) return false;

      // Merchant filter
      if (this.selectedMerchant !== 'all' && receipt.merchant !== this.selectedMerchant) {
        return false;
      }

      // Category filter
      if (this.selectedCategory !== 'all') {
        let hasCategory = false;
        
        // Check receipt-level category
        if (receipt.category === this.selectedCategory) {
          hasCategory = true;
        }
        
        // Check item-level categories
        if (receipt.items) {
          for (const item of receipt.items) {
            if (item.category === this.selectedCategory) {
              hasCategory = true;
              break;
            }
            if (item.categories && item.categories.includes(this.selectedCategory)) {
              hasCategory = true;
              break;
            }
          }
        }
        
        if (!hasCategory) return false;
      }

      return true;
    });

    this.calculateStatistics();
  }

  /**
   * Calculate statistics from filtered receipts
   */
  calculateStatistics() {
    // Total spending
    this.totalSpending = this.filteredReceipts.reduce((sum, r) => sum + r.total, 0);

    // Category totals
    const categoryMap = new Map<string, { total: number; count: number }>();
    this.filteredReceipts.forEach(receipt => {
      if (receipt.category) {
        const existing = categoryMap.get(receipt.category) || { total: 0, count: 0 };
        categoryMap.set(receipt.category, {
          total: existing.total + receipt.total,
          count: existing.count + 1
        });
      }

      // Also count item-level categories
      if (receipt.items) {
        receipt.items.forEach(item => {
          const itemCategories = item.categories || (item.category ? [item.category] : []);
          itemCategories.forEach(cat => {
            const existing = categoryMap.get(cat) || { total: 0, count: 0 };
            categoryMap.set(cat, {
              total: existing.total + item.price * item.quantity,
              count: existing.count + 1
            });
          });
        });
      }
    });

    this.categoryTotals = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);

    // Merchant totals
    const merchantMap = new Map<string, { total: number; count: number }>();
    this.filteredReceipts.forEach(receipt => {
      const existing = merchantMap.get(receipt.merchant) || { total: 0, count: 0 };
      merchantMap.set(receipt.merchant, {
        total: existing.total + receipt.total,
        count: existing.count + 1
      });
    });

    this.merchantTotals = Array.from(merchantMap.entries())
      .map(([merchant, data]) => ({ merchant, ...data }))
      .sort((a, b) => b.total - a.total);

    // Date group totals
    this.calculateDateGroupTotals();
  }

  /**
   * Calculate totals grouped by date period
   */
  calculateDateGroupTotals() {
    const groupMap = new Map<string, { total: number; count: number }>();

    this.filteredReceipts.forEach(receipt => {
      const date = new Date(receipt.date);
      let period: string;

      switch (this.groupBy) {
        case 'day':
          period = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = `Semana ${weekStart.toISOString().split('T')[0]}`;
          break;
        case 'month':
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      const existing = groupMap.get(period) || { total: 0, count: 0 };
      groupMap.set(period, {
        total: existing.total + receipt.total,
        count: existing.count + 1
      });
    });

    this.dateGroupTotals = Array.from(groupMap.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Handle filter changes
   */
  onFilterChange() {
    this.applyFilters();
  }

  /**
   * Navigate back to receipts
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
   * Get category icon
   */
  getCategoryIcon(category?: string): string {
    return this.categoryHelper.getCategoryIcon(category);
  }

  /**
   * Format amount
   */
  formatAmount(amount: number): string {
    // Use the most common currency from filtered receipts
    const currencies = this.filteredReceipts.map(r => r.currency).filter(c => c);
    const currency = currencies.length > 0 ? currencies[0] : 'USD';
    return this.currencyHelper.formatAmount(amount, currency);
  }

  /**
   * Get percentage of total
   */
  getPercentage(amount: number): number {
    if (this.totalSpending === 0) return 0;
    return (amount / this.totalSpending) * 100;
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
