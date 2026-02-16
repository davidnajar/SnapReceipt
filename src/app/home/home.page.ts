import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { CameraService } from '../services/camera.service';
import { GeminiService } from '../services/gemini.service';
import { SupabaseService } from '../services/supabase.service';
import { Receipt } from '../models/receipt.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  capturedImage: string | null = null;
  extractedData: Partial<Receipt> | null = null;
  isProcessing = false;
  hasGeminiKey = false;

  constructor(
    private cameraService: CameraService,
    private geminiService: GeminiService,
    private supabaseService: SupabaseService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    await this.loadUserSettings();
    await this.checkConfiguration();
  }

  async ionViewWillEnter() {
    await this.loadUserSettings();
  }

  /**
   * Load user settings and set up Gemini API key
   */
  private async loadUserSettings() {
    try {
      const settings = await this.supabaseService.getUserSettings();
      if (settings.gemini_api_key) {
        this.geminiService.setUserApiKey(settings.gemini_api_key);
        this.hasGeminiKey = true;
      } else {
        this.hasGeminiKey = false;
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      this.hasGeminiKey = false;
    }
  }

  /**
   * Checks if all required services are properly configured
   */
  private async checkConfiguration() {
    const errors: string[] = [];

    if (!this.geminiService.isConfigured()) {
      errors.push('API key de Gemini no configurada');
    }

    if (!this.supabaseService.isConfigured()) {
      errors.push('Credenciales de Supabase no configuradas');
    }

    if (errors.length > 0) {
      const alert = await this.alertController.create({
        header: 'Configuración Requerida',
        message: `Por favor configura lo siguiente:\n${errors.join('\n')}\n\nVe a Configuración para añadir tu API key de Gemini.`,
        buttons: [
          {
            text: 'Ir a Configuración',
            handler: () => {
              this.goToSettings();
            }
          },
          {
            text: 'Cancelar',
            role: 'cancel'
          }
        ]
      });
      await alert.present();
    }
  }

  /**
   * Navigate to settings page
   */
  goToSettings() {
    this.router.navigate(['/settings']);
  }

  /**
   * Navigate to receipts page
   */
  goToReceipts() {
    this.router.navigate(['/receipts']);
  }

  /**
   * Handles the FAB button click to capture a photo
   */
  async onCapturePhoto() {
    try {
      // Check camera permissions
      const hasPermission = await this.cameraService.checkCameraPermissions();
      if (!hasPermission) {
        const granted = await this.cameraService.requestCameraPermissions();
        if (!granted) {
          await this.showError('Camera permission is required to capture receipts.');
          return;
        }
      }

      // Capture photo
      const photo = await this.cameraService.capturePhoto();
      
      if (photo && photo.base64String) {
        this.capturedImage = photo.base64String;
        
        // Process the captured image
        await this.processReceipt(photo.base64String);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      
      // Check if user cancelled
      if (error instanceof Error && error.message && error.message.includes('cancelled')) {
        return; // Don't show error if user cancelled
      }
      
      await this.showError('Failed to capture photo. Please try again.');
    }
  }

  /**
   * Processes the captured receipt image
   * @param base64Image Base64 encoded image
   */
  private async processReceipt(base64Image: string) {
    const loading = await this.loadingController.create({
      message: 'Processing receipt...'
    });
    await loading.present();

    this.isProcessing = true;

    try {
      // Step 1: Extract data using Gemini AI
      this.extractedData = await this.geminiService.extractReceiptData(base64Image);
      
      await loading.dismiss();
      
      // Step 2: Show confirmation dialog with extracted data
      const confirmed = await this.showConfirmation();
      
      if (confirmed) {
        // Step 3: Save to Supabase
        await this.saveReceipt(base64Image);
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      await loading.dismiss();
      await this.showError('Failed to process receipt. Please try again.');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Saves the receipt to Supabase
   * @param base64Image Base64 encoded image
   */
  private async saveReceipt(base64Image: string) {
    const loading = await this.loadingController.create({
      message: 'Saving receipt...'
    });
    await loading.present();

    try {
      // Generate unique filename
      const fileName = `receipt_${Date.now()}.jpg`;
      
      // Upload image
      const imageUrl = await this.supabaseService.uploadReceiptImage(base64Image, fileName);
      
      // Prepare receipt data
      const receipt: Receipt = {
        date: this.extractedData?.date || new Date().toISOString().split('T')[0],
        total: this.extractedData?.total || 0,
        merchant: this.extractedData?.merchant || 'Unknown',
        items: this.extractedData?.items,
        category: this.extractedData?.category,
        imageUrl: imageUrl
      };

      // Save to database
      await this.supabaseService.saveReceipt(receipt);
      
      await loading.dismiss();
      
      // Show success message
      await this.showSuccess('Receipt saved successfully!');
      
      // Navigate to receipts page
      this.router.navigate(['/receipts']);
      
      // Reset state
      this.capturedImage = null;
      this.extractedData = null;
    } catch (error) {
      console.error('Error saving receipt:', error);
      await loading.dismiss();
      await this.showError('Failed to save receipt. Please try again.');
    }
  }

  /**
   * Shows confirmation dialog with extracted data
   * @returns Promise with boolean indicating if user confirmed
   */
  private async showConfirmation(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Receipt Data Extracted',
        message: `
          <strong>Merchant:</strong> ${this.extractedData?.merchant || 'N/A'}<br>
          <strong>Date:</strong> ${this.extractedData?.date || 'N/A'}<br>
          <strong>Total:</strong> $${this.extractedData?.total?.toFixed(2) || '0.00'}<br>
          <strong>Category:</strong> ${this.extractedData?.category || 'N/A'}<br>
          <strong>Items:</strong> ${this.extractedData?.items?.length || 0}
        `,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              this.capturedImage = null;
              this.extractedData = null;
              resolve(false);
            }
          },
          {
            text: 'Save',
            handler: () => {
              resolve(true);
            }
          }
        ]
      });
      await alert.present();
    });
  }

  /**
   * Shows error message to user
   * @param message Error message
   */
  private async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Shows success message to user
   * @param message Success message
   */
  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }
}
