import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { CameraService } from '../services/camera.service';
import { GeminiService } from '../services/gemini.service';
import { SupabaseService } from '../services/supabase.service';
import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../models/receipt.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  capturedImage: string | null = null;
  extractedData: Partial<Receipt> | null = null;
  isProcessing = false;
  hasGeminiKey = false;
  currentReceiptId: string | null = null;
  processingStatus: string = '';

  constructor(
    private cameraService: CameraService,
    private geminiService: GeminiService,
    private supabaseService: SupabaseService,
    private receiptService: ReceiptService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    await this.loadUserSettings();
    await this.checkConfiguration();
  }

  ngOnDestroy() {
    // Cleanup subscriptions
    this.receiptService.unsubscribeAll();
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
   * Processes the captured receipt image using async flow
   * @param base64Image Base64 encoded image
   */
  private async processReceipt(base64Image: string) {
    const loading = await this.loadingController.create({
      message: 'Uploading receipt...'
    });
    await loading.present();

    this.isProcessing = true;
    this.processingStatus = 'uploading';

    try {
      // Convert base64 to blob
      const blob = this.base64ToBlob(base64Image);

      // Upload and start processing
      const receiptId = await this.receiptService.uploadAndProcess(blob);
      this.currentReceiptId = receiptId;

      await loading.dismiss();

      // Show toast that processing started
      await this.showSuccess('Receipt uploaded! Processing in background...');

      // Subscribe to real-time updates
      this.processingStatus = 'processing';
      this.receiptService.subscribeToReceipt(receiptId, async (receipt) => {
        if (receipt.status === 'completed') {
          this.processingStatus = 'completed';
          this.isProcessing = false;
          this.extractedData = receipt;
          
          // Show success notification
          await this.showSuccess('Receipt processed successfully!');
          
          // Navigate to receipts page to see the result
          setTimeout(() => {
            this.router.navigate(['/receipts']);
          }, 1500);
        } else if (receipt.status === 'error') {
          this.processingStatus = 'error';
          this.isProcessing = false;
          
          // Show error notification
          await this.showError(`Processing failed: ${receipt.errorMessage || 'Unknown error'}`);
        }
      });

      // User can navigate away while processing
      this.capturedImage = null;
      
    } catch (error) {
      console.error('Error processing receipt:', error);
      await loading.dismiss();
      this.isProcessing = false;
      this.processingStatus = 'error';
      await this.showError('Failed to upload receipt. Please try again.');
    }
  }

  /**
   * Helper method to convert base64 to Blob
   * @param base64 Base64 encoded string
   * @returns Blob object
   */
  private base64ToBlob(base64: string): Blob {
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

    return new Blob(byteArrays, { type: 'image/jpeg' });
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
