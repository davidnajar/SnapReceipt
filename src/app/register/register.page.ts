import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

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

  async onRegister() {
    if (!this.email || !this.password || !this.confirmPassword) {
      await this.showAlert('Error', 'Por favor, completa todos los campos.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      await this.showAlert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (this.password.length < 6) {
      await this.showAlert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creando cuenta...'
    });
    await loading.present();

    try {
      await this.supabaseService.signUp(this.email, this.password);
      await loading.dismiss();
      
      await this.showAlert(
        'Registro Exitoso', 
        'Tu cuenta ha sido creada. Verifica tu email para confirmar tu cuenta (si está habilitado). Ahora puedes iniciar sesión.',
        () => {
          this.router.navigate(['/login']);
        }
      );
    } catch (error: any) {
      await loading.dismiss();
      console.error('Registration error:', error);
      await this.showAlert('Error', error.message || 'No se pudo crear la cuenta. Intenta nuevamente.');
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private async showAlert(header: string, message: string, handler?: () => void) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [{
        text: 'OK',
        handler: handler
      }]
    });
    await alert.present();
  }
}

