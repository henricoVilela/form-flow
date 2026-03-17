import { Component, inject, OnInit, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { FormApiService, FormResponse, FormVisibility } from '@core/api/form-api.service';

@Component({
  selector: 'app-form-settings',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, TextareaModule, InputNumberModule,
    SelectModule, DatePickerModule, SkeletonModule, DividerModule, TooltipModule,
  ],
  template: `
    <!-- Header -->
    <div class="flex items-center gap-3 mb-8">
      <button
        pButton severity="secondary" [text]="true" icon="pi pi-arrow-left"
        pTooltip="Voltar ao builder" tooltipPosition="bottom"
        (click)="goBack()"
      ></button>
      <div class="flex-1">
        @if (loading()) {
          <p-skeleton height="28px" width="200px" styleClass="mb-1" />
          <p-skeleton height="16px" width="120px" />
        } @else {
          <h1 class="ff-page-title">Configurações</h1>
          <p class="ff-page-subtitle">{{ form()?.title }}</p>
        }
      </div>
      <button
        pButton label="Salvar" icon="pi pi-check"
        [loading]="saving()"
        [disabled]="loading()"
        (click)="save()"
      ></button>
    </div>

    @if (loading()) {
      <div class="space-y-5">
        @for (i of [1,2,3]; track i) {
          <div class="ff-card">
            <p-skeleton height="20px" width="140px" styleClass="mb-4" />
            <p-skeleton height="38px" styleClass="mb-3" />
            <p-skeleton height="38px" />
          </div>
        }
      </div>
    } @else {
      <div class="max-w-2xl space-y-6">

        <!-- ── Acesso ── -->
        <div class="ff-card">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
            <i class="pi pi-lock text-primary-500 text-sm"></i>
            Acesso
          </h2>

          <div class="space-y-4">
            <!-- Visibilidade -->
            <div>
              <label class="ff-input-label">Visibilidade</label>
              <p-select
                [(ngModel)]="visibility"
                [options]="visibilityOptions"
                optionLabel="label"
                optionValue="value"
                styleClass="w-full"
              />
            </div>

            <!-- Senha (só para PASSWORD_PROTECTED) -->
            @if (visibility === 'PASSWORD_PROTECTED') {
              <div>
                <label class="ff-input-label">
                  Senha de acesso
                  <span class="text-surface-400 dark:text-surface-500 font-normal ml-1">(deixe em branco para manter a atual)</span>
                </label>
                <input
                  pInputText type="password"
                  class="w-full"
                  [(ngModel)]="password"
                  placeholder="Nova senha..."
                  autocomplete="new-password"
                />
              </div>
            }

            <!-- Slug -->
            <div>
              <label class="ff-input-label">
                Slug amigável
                <span class="text-surface-400 dark:text-surface-500 font-normal ml-1">(opcional)</span>
              </label>
              <div class="flex items-center gap-2">
                <span class="text-sm text-surface-400 dark:text-surface-500 shrink-0">/f/</span>
                <input
                  pInputText
                  class="flex-1"
                  [(ngModel)]="slug"
                  placeholder="meu-formulario"
                  (input)="onSlugInput()"
                />
              </div>
              <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">
                Apenas letras minúsculas, números e hífens. Deixe em branco para usar o ID padrão.
              </p>
            </div>
          </div>
        </div>

        <!-- ── Limites ── -->
        <div class="ff-card">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
            <i class="pi pi-sliders-h text-primary-500 text-sm"></i>
            Limites
          </h2>

          <div class="space-y-4">
            <!-- Máximo de respostas -->
            <div>
              <label class="ff-input-label">
                Máximo de respostas
                <span class="text-surface-400 dark:text-surface-500 font-normal ml-1">(0 = ilimitado)</span>
              </label>
              <p-inputNumber
                [(ngModel)]="maxResponses"
                [min]="0"
                [showButtons]="true"
                styleClass="w-full"
                placeholder="Sem limite"
              />
            </div>

            <!-- Data de expiração -->
            <div>
              <label class="ff-input-label">
                Expira em
                <span class="text-surface-400 dark:text-surface-500 font-normal ml-1">(opcional)</span>
              </label>
              <p-datepicker
                [(ngModel)]="expiresAt"
                [showIcon]="true"
                [showButtonBar]="true"
                [showTime]="true"
                [hourFormat]="'24'"
                placeholder="Sem expiração"
                dateFormat="dd/mm/yy"
                styleClass="w-full"
                (onClearClick)="expiresAt = null"
              />
            </div>
          </div>
        </div>

        <!-- ── Mensagens ── -->
        <div class="ff-card">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
            <i class="pi pi-comment text-primary-500 text-sm"></i>
            Mensagens
          </h2>

          <div class="space-y-4">
            <!-- Mensagem de boas-vindas -->
            <div>
              <label class="ff-input-label">
                Mensagem de boas-vindas
                <span class="text-surface-400 dark:text-surface-500 font-normal ml-1">(exibida antes do formulário)</span>
              </label>
              <textarea
                pTextarea
                class="w-full"
                [rows]="3"
                [(ngModel)]="welcomeMessage"
                placeholder="Olá! Obrigado por preencher este formulário..."
              ></textarea>
            </div>

            <!-- Mensagem de agradecimento -->
            <div>
              <label class="ff-input-label">
                Mensagem de agradecimento
                <span class="text-surface-400 dark:text-surface-500 font-normal ml-1">(exibida após a submissão)</span>
              </label>
              <textarea
                pTextarea
                class="w-full"
                [rows]="3"
                [(ngModel)]="thankYouMessage"
                placeholder="Obrigado pela sua resposta! Entraremos em contato em breve."
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Save button (bottom) -->
        <div class="flex justify-end">
          <button
            pButton label="Salvar configurações" icon="pi pi-check"
            [loading]="saving()"
            (click)="save()"
          ></button>
        </div>

      </div>
    }
  `,
})
export class FormSettingsComponent implements OnInit {
  private readonly formApi = inject(FormApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly id = input.required<string>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly form = signal<FormResponse | null>(null);

  // ── Form fields ──
  visibility: FormVisibility = 'PUBLIC';
  slug = '';
  password = '';
  maxResponses: number | null = null;
  expiresAt: Date | null = null;
  welcomeMessage = '';
  thankYouMessage = '';

  readonly visibilityOptions = [
    { label: 'Público — qualquer pessoa com o link pode acessar', value: 'PUBLIC' },
    { label: 'Privado — somente você pode ver as respostas', value: 'PRIVATE' },
    { label: 'Protegido por senha', value: 'PASSWORD_PROTECTED' },
  ];

  ngOnInit(): void {
    this.formApi.getById(this.id()).subscribe({
      next: (form) => {
        this.form.set(form);
        this.visibility = form.visibility ?? 'PUBLIC';
        this.slug = form.slug ?? '';
        this.maxResponses = form.maxResponses ?? null;
        this.expiresAt = form.expiresAt ? new Date(form.expiresAt) : null;
        this.welcomeMessage = form.welcomeMessage ?? '';
        this.thankYouMessage = form.thankYouMessage ?? '';
        this.loading.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Formulário não encontrado' });
        this.router.navigate(['/forms']);
      },
    });
  }

  onSlugInput(): void {
    this.slug = this.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  }

  save(): void {
    this.saving.set(true);
    this.formApi.updateSettings(this.id(), {
      visibility: this.visibility,
      slug: this.slug || undefined,
      password: this.password || undefined,
      maxResponses: this.maxResponses && this.maxResponses > 0 ? this.maxResponses : undefined,
      expiresAt: this.expiresAt ? this.expiresAt.toISOString().replace('Z', '') : undefined,
      welcomeMessage: this.welcomeMessage || undefined,
      thankYouMessage: this.thankYouMessage || undefined,
    }).subscribe({
      next: (form) => {
        this.form.set(form);
        this.password = '';
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Salvo!', detail: 'Configurações atualizadas com sucesso' });
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Falha ao salvar configurações' });
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/forms', this.id(), 'edit']);
  }
}
