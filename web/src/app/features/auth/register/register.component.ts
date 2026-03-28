import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '@core/auth/auth.service';
import { AuthStore } from '@core/auth/auth.store';

@Component({
    selector: 'app-register',
    imports: [
        ReactiveFormsModule, RouterLink,
        InputTextModule, PasswordModule, ButtonModule,
    ],
    template: `
    <div class="auth-page">
      <!-- Left panel (same as login) -->
      <div class="auth-panel-left">
        <div class="auth-panel-content">
          <div class="flex items-center gap-3 mb-12">
            <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <i class="pi pi-bolt text-white text-lg"></i>
            </div>
            <span class="font-display font-bold text-2xl text-white">FormFlow</span>
          </div>

          <h1 class="text-4xl font-display font-bold text-white leading-tight mb-4">
            Comece agora,<br>
            <span class="text-blue-200">é gratuito.</span>
          </h1>

          <p class="text-blue-100/80 text-base leading-relaxed max-w-md">
            Crie sua conta em segundos e comece a construir
            formulários dinâmicos e inteligentes.
          </p>
        </div>
        <div class="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div class="absolute bottom-20 left-10 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl"></div>
      </div>

      <!-- Right: register form -->
      <div class="auth-panel-right">
        <div class="auth-form-container">
          <div class="mb-8">
            <div class="flex items-center gap-2 mb-6 lg:hidden">
              <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <i class="pi pi-bolt text-white text-sm"></i>
              </div>
              <span class="font-display font-bold text-lg">FormFlow</span>
            </div>

            <h2 class="text-2xl font-display font-bold text-surface-900 tracking-tight">
              Criar sua conta
            </h2>
            <p class="text-surface-500 mt-1.5">
              Já tem conta?
              <a routerLink="/login" class="ff-link">Faça login</a>
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
            <!-- Name -->
            <div>
              <label for="name" class="ff-input-label">Nome</label>
              <input
                pInputText id="name" formControlName="name"
                placeholder="Seu nome completo" class="w-full"
              />
            </div>

            <!-- Email -->
            <div>
              <label for="email" class="ff-input-label">E-mail</label>
              <input
                pInputText id="email" type="email" formControlName="email"
                placeholder="seu&#64;email.com" class="w-full"
              />
              @if (form.controls.email.dirty && form.controls.email.hasError('email')) {
                <small class="text-red-500 mt-1 block">E-mail inválido</small>
              }
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="ff-input-label">Senha</label>
              <p-password
                id="password" formControlName="password"
                [toggleMask]="true" placeholder="Mínimo 8 caracteres"
                styleClass="w-full" inputStyleClass="w-full"
              />
              @if (form.controls.password.dirty && form.controls.password.hasError('minlength')) {
                <small class="text-red-500 mt-1 block">Mínimo 8 caracteres</small>
              }
            </div>

            <!-- Submit -->
            <button
              pButton type="submit"
              label="Criar conta" icon="pi pi-user-plus" iconPos="right"
              class="w-full mt-2"
              [loading]="store.loading()"
              [disabled]="form.invalid || store.loading()"
            ></button>
          </form>
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
  `]
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  readonly store = inject(AuthStore);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.authService.register(this.form.getRawValue()).subscribe();
  }
}
