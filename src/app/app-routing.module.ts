import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.module').then( m => m.SettingsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'gemini-guide',
    loadChildren: () => import('./gemini-guide/gemini-guide.module').then( m => m.GeminiGuidePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'receipts',
    loadChildren: () => import('./receipts/receipts.module').then( m => m.ReceiptsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'receipt-detail/:id',
    loadChildren: () => import('./receipt-detail/receipt-detail.module').then( m => m.ReceiptDetailPageModule),
    canActivate: [AuthGuard]
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
