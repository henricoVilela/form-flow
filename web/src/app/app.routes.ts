import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  // ── Rotas públicas (sem autenticação) ──
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },

  // TODO: Formulário público (respondente)
  // { path: 'f/:formId', loadComponent: () => import('./features/public-form/...') },

  // ── Rotas autenticadas (layout principal) ──
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      // TODO: Demais rotas (forms, builder, responses, analytics)
      // { path: 'forms', loadComponent: () => import('./features/forms/form-list/...') },
      // { path: 'forms/new', loadComponent: () => import('./features/forms/form-builder/...') },
      // { path: 'forms/:id/edit', loadComponent: () => import('./features/forms/form-builder/...') },
      // { path: 'forms/:id/responses', loadComponent: () => import('./features/responses/...') },
      // { path: 'forms/:id/analytics', loadComponent: () => import('./features/responses/analytics/...') },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
