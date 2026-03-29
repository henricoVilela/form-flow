import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiKeyService, ApiKeyResponse, ApiKeyCreatedResponse } from '@core/api/api-key.service';

@Component({
  selector: 'app-api-keys',
  imports: [FormsModule, ButtonModule, InputTextModule, DialogModule, SkeletonModule, TooltipModule, ConfirmDialogModule],
  template: `
    <div class="mb-8">
      <h1 class="ff-page-title">API Keys</h1>
      <p class="ff-page-subtitle">Gere chaves para integrar sistemas externos sem usar seu login.</p>
    </div>

    <div class="max-w-2xl">

      <!-- ── Lista de chaves ── -->
      <div class="ff-card">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <i class="pi pi-key text-primary-500 text-sm"></i>
            Suas chaves
          </h2>
          <button
            pButton label="Nova chave"
            icon="pi pi-plus"
            size="small"
            (click)="openCreateDialog()"
          ></button>
        </div>

        @if (loading()) {
          <div class="space-y-3">
            @for (_ of [1,2]; track $index) {
              <div class="flex items-center gap-3">
                <p-skeleton width="100%" height="3rem" borderRadius="8px" />
              </div>
            }
          </div>
        } @else if (keys().length === 0) {
          <div class="py-10 text-center text-surface-400 dark:text-surface-500">
            <i class="pi pi-key text-3xl block mb-3 opacity-40"></i>
            <p class="text-sm">Nenhuma chave criada ainda.</p>
          </div>
        } @else {
          <div class="space-y-2">
            @for (key of keys(); track key.id) {
              <div class="flex items-center gap-3 p-3 rounded-lg border border-surface-100 dark:border-surface-700
                          bg-surface-50 dark:bg-surface-800/50">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium text-sm text-surface-900 dark:text-surface-50">{{ key.name }}</span>
                    @if (!key.active) {
                      <span class="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30
                                   text-red-600 dark:text-red-400">Revogada</span>
                    }
                  </div>
                  <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                    <code class="text-xs text-surface-500 dark:text-surface-400 font-mono">{{ key.keyPrefix }}••••••••••••••••••••</code>
                    <span class="text-xs text-surface-400 dark:text-surface-500">
                      Criada {{ formatDate(key.createdAt) }}
                    </span>
                    @if (key.lastUsedAt) {
                      <span class="text-xs text-surface-400 dark:text-surface-500">
                        · Último uso {{ formatDate(key.lastUsedAt) }}
                      </span>
                    } @else {
                      <span class="text-xs text-surface-400 dark:text-surface-500">· Nunca usada</span>
                    }
                  </div>
                </div>
                @if (key.active) {
                  <button
                    pButton
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    size="small"
                    pTooltip="Revogar chave"
                    tooltipPosition="left"
                    (click)="confirmRevoke(key)"
                  ></button>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- ── Aviso de segurança ── -->
      <div class="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800
                  flex gap-2.5 text-sm text-amber-800 dark:text-amber-300">
        <i class="pi pi-exclamation-triangle mt-0.5 shrink-0"></i>
        <p>Trate suas API Keys como senhas. Não as exponha em código-fonte público ou repositórios.</p>
      </div>

    </div>

    <!-- ── Dialog: criar chave ── -->
    <p-dialog
      [(visible)]="createDialogVisible"
      [modal]="true"
      [closable]="!createdKey()"
      [header]="createdKey() ? 'Chave gerada' : 'Nova API Key'"
      [style]="{ width: '440px' }"
      (onHide)="onCreateDialogClose()"
    >
      @if (!createdKey()) {
        <!-- Formulário de nome -->
        <div class="space-y-4 pt-1">
          <div>
            <label class="ff-input-label">Nome da chave</label>
            <input
              pInputText
              class="w-full"
              [(ngModel)]="newKeyName"
              placeholder="Ex: Integração CRM, Zapier..."
              [disabled]="creating()"
              (keydown.enter)="createKey()"
              autofocus
            />
            <p class="text-xs text-surface-400 mt-1">Escolha um nome que identifique onde a chave será usada.</p>
          </div>
        </div>
        <ng-template #footer>
          <div class="flex justify-end gap-2 pt-2">
            <button pButton label="Cancelar" severity="secondary" [text]="true" (click)="createDialogVisible = false"></button>
            <button
              pButton label="Gerar chave"
              icon="pi pi-key"
              [loading]="creating()"
              [disabled]="!newKeyName.trim()"
              (click)="createKey()"
            ></button>
          </div>
        </ng-template>
      } @else {
        <!-- Reveal da chave gerada -->
        <div class="space-y-4 pt-1">
          <div class="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800
                      flex gap-2.5 text-sm text-green-800 dark:text-green-300">
            <i class="pi pi-check-circle mt-0.5 shrink-0"></i>
            <p>Copie a chave agora. <strong>Ela não será exibida novamente.</strong></p>
          </div>

          <div>
            <label class="ff-input-label">Sua nova chave</label>
            <div class="flex gap-2">
              <input
                pInputText
                class="flex-1 font-mono text-sm"
                [value]="createdKey()!.key"
                [readonly]="true"
              />
              <button
                pButton
                [icon]="copied() ? 'pi pi-check' : 'pi pi-copy'"
                [severity]="copied() ? 'success' : 'secondary'"
                pTooltip="Copiar"
                (click)="copyKey()"
              ></button>
            </div>
          </div>
        </div>
        <ng-template #footer>
          <div class="flex justify-end pt-2">
            <button pButton label="Feito" (click)="onCreateDialogClose()"></button>
          </div>
        </ng-template>
      }
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class ApiKeysComponent implements OnInit {
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly keys = signal<ApiKeyResponse[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly createdKey = signal<ApiKeyCreatedResponse | null>(null);
  readonly copied = signal(false);

  createDialogVisible = false;
  newKeyName = '';

  ngOnInit(): void {
    this.loadKeys();
  }

  openCreateDialog(): void {
    this.newKeyName = '';
    this.createdKey.set(null);
    this.copied.set(false);
    this.createDialogVisible = true;
  }

  createKey(): void {
    const name = this.newKeyName.trim();
    if (!name) return;
    this.creating.set(true);
    this.apiKeyService.create(name).subscribe({
      next: (created) => {
        this.createdKey.set(created);
        this.creating.set(false);
        this.loadKeys();
      },
      error: (err) => {
        this.creating.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Falha ao criar chave' });
      },
    });
  }

  copyKey(): void {
    const key = this.createdKey()?.key;
    if (!key) return;
    navigator.clipboard.writeText(key).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  onCreateDialogClose(): void {
    this.createDialogVisible = false;
    this.createdKey.set(null);
    this.newKeyName = '';
  }

  confirmRevoke(key: ApiKeyResponse): void {
    this.confirm.confirm({
      message: `Revogar a chave "<strong>${key.name}</strong>"? Integrações que a utilizam irão parar de funcionar imediatamente.`,
      header: 'Revogar chave',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Revogar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.revokeKey(key.id),
    });
  }

  private revokeKey(id: string): void {
    this.apiKeyService.revoke(id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Chave revogada', detail: 'A chave foi desativada.' });
        this.loadKeys();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao revogar a chave.' });
      },
    });
  }

  private loadKeys(): void {
    this.loading.set(true);
    this.apiKeyService.list().subscribe({
      next: (keys) => {
        this.keys.set(keys);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
