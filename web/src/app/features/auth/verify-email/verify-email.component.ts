import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '@core/auth/auth.service';
import { AuthStore } from '@core/auth/auth.store';

@Component({
  selector: 'app-verify-email',
  imports: [ButtonModule, RouterLink],
  template: `
    <div class="auth-page">
      <!-- Left panel -->
      <div class="auth-panel-left">
        <div class="auth-panel-content">
          <div class="flex items-center gap-3 mb-12">
            <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <i class="pi pi-bolt text-white text-lg"></i>
            </div>
            <span class="font-display font-bold text-2xl text-white">FormFlow</span>
          </div>
          <h1 class="text-4xl font-display font-bold text-white leading-tight mb-4">
            Quase lá!<br>
            <span class="text-blue-200">Confirme seu e-mail.</span>
          </h1>
          <p class="text-blue-100/80 text-base leading-relaxed max-w-md">
            Enviamos um link de verificação para o seu e-mail.
            Clique nele para ativar sua conta e começar a usar o FormFlow.
          </p>
        </div>
        <div class="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div class="absolute bottom-20 left-10 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl"></div>
      </div>

      <!-- Right panel -->
      <div class="auth-panel-right">
        <div class="auth-form-container">
          @if (store.loading()) {
            <!-- Verificando token -->
            <div class="text-center">
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="pi pi-spin pi-spinner text-primary-600 text-2xl"></i>
              </div>
              <h2 class="text-2xl font-display font-bold text-surface-900 mb-2">
                Verificando seu e-mail...
              </h2>
              <p class="text-surface-500">Aguarde um momento.</p>
            </div>
          } @else if (errorMessage()) {
            <!-- Erro na verificação -->
            <div class="text-center">
              <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="pi pi-times-circle text-red-600 text-2xl"></i>
              </div>
              <h2 class="text-2xl font-display font-bold text-surface-900 mb-2">
                Link inválido ou expirado
              </h2>
              <p class="text-surface-500 mb-6">{{ errorMessage() }}</p>
              <a routerLink="/register">
                <button pButton label="Criar nova conta" icon="pi pi-user-plus" class="w-full"></button>
              </a>
            </div>
          } @else {
            <!-- Aguardando verificação (sem token na URL) -->
            <div class="text-center">
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="pi pi-envelope text-primary-600 text-2xl"></i>
              </div>
              <h2 class="text-2xl font-display font-bold text-surface-900 mb-2">
                Verifique seu e-mail
              </h2>
              <p class="text-surface-500 mb-1">Enviamos um link de ativação para</p>
              <p class="font-semibold text-surface-800 mb-6">{{ emailDisplay() }}</p>
              <p class="text-surface-400 text-sm mb-8">
                Não recebeu? Verifique a caixa de spam.<br>
                O link expira em 24 horas.
              </p>
              <p class="text-surface-400 text-sm">
                Conta errada?
                <a routerLink="/register" class="ff-link">Criar nova conta</a>
              </p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display: flex; min-height: 100vh; }
    .auth-panel-left {
      display: none; position: relative; width: 50%;
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
      overflow: hidden;
      @media (min-width: 1024px) { display: flex; align-items: center; justify-content: center; }
    }
    .auth-panel-content { position: relative; z-index: 10; padding: 48px; max-width: 520px; }
    .auth-panel-right { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px; background: var(--ff-bg); }
    .auth-form-container { width: 100%; max-width: 400px; animation: slideUp 0.4s ease-out; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  readonly store = inject(AuthStore);

  readonly errorMessage = signal<string | null>(null);
  readonly emailDisplay = signal<string>('seu e-mail');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');

    if (email) {
      this.emailDisplay.set(email);
    }

    if (token) {
      this.authService.verifyEmail(token).subscribe({
        error: (err) => {
          this.errorMessage.set(err.error?.message ?? 'Token inválido ou expirado');
        },
      });
    }
  }
}
