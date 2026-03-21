import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { AuthService } from '@core/auth/auth.service';
import { AuthStore } from '@core/auth/auth.store';

@Component({
  selector: 'app-user-profile',
  imports: [FormsModule, ButtonModule, InputTextModule, DividerModule, SkeletonModule],
  template: `
    <div class="mb-8">
      <h1 class="ff-page-title">Meu Perfil</h1>
      <p class="ff-page-subtitle">Gerencie suas informações pessoais e senha de acesso.</p>
    </div>

    <div class="max-w-lg space-y-6">

      <!-- ── Dados pessoais ── -->
      <div class="ff-card">
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
          <i class="pi pi-user text-primary-500 text-sm"></i>
          Dados pessoais
        </h2>

        <div class="space-y-4">
          <div>
            <label class="ff-input-label">Nome</label>
            <input
              pInputText
              class="w-full"
              [(ngModel)]="name"
              placeholder="Seu nome completo"
              [disabled]="savingProfile()"
            />
          </div>

          <div>
            <label class="ff-input-label">E-mail</label>
            <input
              pInputText
              class="w-full"
              [value]="store.userEmail()"
              [disabled]="true"
            />
            <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">
              O e-mail não pode ser alterado.
            </p>
          </div>
        </div>

        <div class="flex justify-end mt-5">
          <button
            pButton label="Salvar nome"
            icon="pi pi-check"
            [loading]="savingProfile()"
            [disabled]="!name.trim() || name === store.userName()"
            (click)="saveProfile()"
          ></button>
        </div>
      </div>

      <!-- ── Alterar senha ── -->
      <div class="ff-card">
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
          <i class="pi pi-lock text-primary-500 text-sm"></i>
          Alterar senha
        </h2>

        <div class="space-y-4">
          <div>
            <label class="ff-input-label">Nova senha</label>
            <input
              pInputText type="password"
              class="w-full"
              [(ngModel)]="newPassword"
              placeholder="Mínimo 8 caracteres"
              autocomplete="new-password"
              [disabled]="savingPassword()"
            />
          </div>

          <div>
            <label class="ff-input-label">Confirmar nova senha</label>
            <input
              pInputText type="password"
              class="w-full"
              [(ngModel)]="confirmPassword"
              placeholder="Repita a nova senha"
              autocomplete="new-password"
              [disabled]="savingPassword()"
            />
            @if (confirmPassword && newPassword !== confirmPassword) {
              <p class="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
            }
          </div>
        </div>

        <div class="flex justify-end mt-5">
          <button
            pButton label="Alterar senha"
            icon="pi pi-lock"
            severity="secondary"
            [loading]="savingPassword()"
            [disabled]="!canChangePassword()"
            (click)="savePassword()"
          ></button>
        </div>
      </div>

    </div>
  `,
})
export class UserProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  readonly store = inject(AuthStore);
  private readonly toast = inject(MessageService);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);

  name = '';
  newPassword = '';
  confirmPassword = '';

  ngOnInit(): void {
    this.name = this.store.userName();
  }

  canChangePassword(): boolean {
    return this.newPassword.length >= 8 && this.newPassword === this.confirmPassword;
  }

  saveProfile(): void {
    const trimmed = this.name.trim();
    if (!trimmed) return;
    this.savingProfile.set(true);
    this.authService.updateProfile(trimmed).subscribe({
      next: () => this.savingProfile.set(false),
      error: (err) => {
        this.savingProfile.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Falha ao atualizar perfil' });
      },
    });
  }

  savePassword(): void {
    if (!this.canChangePassword()) return;
    this.savingPassword.set(true);
    this.authService.updatePassword(this.newPassword).subscribe({
      next: () => {
        this.newPassword = '';
        this.confirmPassword = '';
        this.savingPassword.set(false);
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Falha ao alterar senha' });
      },
    });
  }
}
