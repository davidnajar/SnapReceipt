import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';
import { CategoryHelper } from '../services/category-helper';
import { Receipt } from '../models/receipt.model';

@Component({
  selector: 'app-receipts',
  templateUrl: './receipts.page.html',
  styleUrls: ['./receipts.page.scss'],
  standalone: false
})
export class ReceiptsPage implements OnInit {
  receipts: Receipt[] = [];
  isLoading = false;

  constructor(
    private supabaseService: SupabaseService,
    private categoryHelper: CategoryHelper,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
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
      message: 'Loading receipts...'
    });
    await loading.present();

    this.isLoading = true;

    try {
      this.receipts = await this.supabaseService.getReceipts();
    } catch (error) {
      console.error('Error loading receipts:', error);
      await this.showError('Failed to load receipts. Please try again.');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  /**
   * Navigate to receipt detail page
   */
  viewReceipt(receipt: Receipt) {
    if (receipt.id) {
      this.router.navigate(['/receipt-detail', receipt.id]);
    }
  }

  /**
   * Navigate back to home
   */
  goToHome() {
    this.router.navigate(['/home']);
  }

  /**
   * Get category color for chip styling
   */
  getCategoryColor(category?: string): string {
    return this.categoryHelper.getCategoryColor(category);
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
