import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  canActivate(): Promise<boolean | UrlTree> {
    return this.checkAuth();
  }

  private async checkAuth(): Promise<boolean | UrlTree> {
    const user = await this.supabaseService.getCurrentUser();
    
    if (user) {
      return true;
    } else {
      return this.router.createUrlTree(['/login']);
    }
  }
}
