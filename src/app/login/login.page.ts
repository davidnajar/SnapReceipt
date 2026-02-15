import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    // Check if user is already logged in
    const user = await this.supabaseService.getCurrentUser();
    if (user) {
      this.router.navigate(['/home']);
    }
  }

  async onLogin() {
    if (!this.email || !this.password) {
      await this.showAlert('Error', 'Por favor, ingresa tu email y contraseña.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...'
    });
    await loading.present();

    try {
      await this.supabaseService.signIn(this.email, this.password);
      await loading.dismiss();
      this.router.navigate(['/home']);
    } catch (error: any) {
      await loading.dismiss();
      console.error('Login error:', error);
      await this.showAlert('Error', error.message || 'No se pudo iniciar sesión. Verifica tus credenciales.');
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}

