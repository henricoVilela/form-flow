import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'f/:formId',
    loadComponent: () => import('./features/public-form/form-renderer.component').then(m => m.FormRendererComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'forms',
        loadComponent: () => import('./features/forms/form-list/form-list.component').then(m => m.FormListComponent),
      },
      {
        path: 'forms/:id/edit',
        loadComponent: () => import('./features/forms/form-builder/form-builder.component').then(m => m.FormBuilderComponent),
      },
      {
        path: 'forms/:id/responses',
        loadComponent: () => import('./features/forms/responses/form-responses.component').then(m => m.FormResponsesComponent),
      },
      {
        path: 'forms/:id/analytics',
        loadComponent: () => import('./features/forms/analytics/form-analytics.component').then(m => m.FormAnalyticsComponent),
      },
      {
        path: 'forms/:id/settings',
        loadComponent: () => import('./features/forms/settings/form-settings.component').then(m => m.FormSettingsComponent),
      },
      {
        path: 'settings/profile',
        loadComponent: () => import('./features/settings/profile/user-profile.component').then(m => m.UserProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
