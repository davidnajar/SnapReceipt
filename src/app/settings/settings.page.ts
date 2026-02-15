import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';
import { GeminiService } from '../services/gemini.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage implements OnInit {
  geminiApiKey: string = '';
  userEmail: string = '';
  isLoading: boolean = false;

  constructor(
    private supabaseService: SupabaseService,
    private geminiService: GeminiService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    await this.loadSettings();
  }

  async ionViewWillEnter() {
    await this.loadSettings();
  }

  private async loadSettings() {
    this.isLoading = true;
    
    try {
      // Get current user
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        this.userEmail = user.email || '';
      }

      // Get user settings
      const settings = await this.supabaseService.getUserSettings();
      this.geminiApiKey = settings.gemini_api_key || '';
      
      // Set the API key in the Gemini service if it exists
      if (this.geminiApiKey) {
        this.geminiService.setUserApiKey(this.geminiApiKey);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSaveSettings() {
    const loading = await this.loadingController.create({
      message: 'Guardando configuración...'
    });
    await loading.present();

    try {
      await this.supabaseService.saveUserSettings(this.geminiApiKey);
      
      // Update Gemini service with new key
      if (this.geminiApiKey) {
        this.geminiService.setUserApiKey(this.geminiApiKey);
      } else {
        this.geminiService.clearUserApiKey();
      }
      
      await loading.dismiss();
      await this.showToast('Configuración guardada exitosamente', 'success');
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error saving settings:', error);
      await this.showAlert('Error', error.message || 'No se pudo guardar la configuración.');
    }
  }

  goToGeminiGuide() {
    this.router.navigate(['/gemini-guide']);
  }

  async onSignOut() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Cerrando sesión...'
            });
            await loading.present();

            try {
              await this.supabaseService.signOut();
              this.geminiService.clearUserApiKey();
              await loading.dismiss();
              this.router.navigate(['/login']);
            } catch (error: any) {
              await loading.dismiss();
              console.error('Error signing out:', error);
              await this.showAlert('Error', 'No se pudo cerrar sesión.');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}

