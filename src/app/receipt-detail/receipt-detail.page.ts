import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';
import { Receipt, ReceiptItem } from '../models/receipt.model';

@Component({
  selector: 'app-receipt-detail',
  templateUrl: './receipt-detail.page.html',
  styleUrls: ['./receipt-detail.page.scss'],
  standalone: false
})
export class ReceiptDetailPage implements OnInit {
  receipt: Receipt | null = null;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    const receiptId = this.route.snapshot.paramMap.get('id');
    if (receiptId) {
      await this.loadReceipt(receiptId);
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
    if (!category) return 'medium';
    
    const colorMap: { [key: string]: string } = {
      'food': 'success',
      'beverages': 'tertiary',
      'groceries': 'success',
      'restaurant': 'warning',
      'shopping': 'secondary',
      'clothing': 'secondary',
      'electronics': 'primary',
      'travel': 'danger',
      'education': 'tertiary',
      'health': 'success',
      'entertainment': 'warning',
      'home': 'medium',
      'transport': 'danger',
      'other': 'medium'
    };

    return colorMap[category.toLowerCase()] || 'medium';
  }

  /**
   * Get category icon for display
   */
  getCategoryIcon(category?: string): string {
    if (!category) return 'pricetag-outline';
    
    const iconMap: { [key: string]: string } = {
      'food': 'fast-food-outline',
      'beverages': 'cafe-outline',
      'groceries': 'cart-outline',
      'restaurant': 'restaurant-outline',
      'shopping': 'bag-outline',
      'clothing': 'shirt-outline',
      'electronics': 'phone-portrait-outline',
      'travel': 'airplane-outline',
      'education': 'school-outline',
      'health': 'medical-outline',
      'entertainment': 'film-outline',
      'home': 'home-outline',
      'transport': 'car-outline',
      'other': 'pricetag-outline'
    };

    return iconMap[category.toLowerCase()] || 'pricetag-outline';
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
