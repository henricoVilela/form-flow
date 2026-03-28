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
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormApiService, FormResponse, FormVisibility, RespondentResponse, UploadConfigResponse } from '@core/api/form-api.service';

@Component({
  selector: 'app-form-settings',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, TextareaModule, InputNumberModule,
    SelectModule, DatePickerModule, SkeletonModule, DividerModule, TooltipModule,
    ToggleSwitchModule, TagModule, DialogModule, ConfirmDialogModule, MultiSelectModule,
  ],
  providers: [ConfirmationService],
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

            <!-- Botão "Enviar outra resposta" -->
            <div class="flex items-center justify-between py-1">
              <div>
                <p class="text-sm font-medium text-surface-800 dark:text-surface-100">Permitir nova resposta</p>
                <p class="text-xs text-surface-400 dark:text-surface-500 mt-0.5">Exibe o botão "Enviar outra resposta" após o envio</p>
              </div>
              <p-toggleswitch [(ngModel)]="thankYouShowResubmit" />
            </div>
          </div>
        </div>

        <!-- ── Redirecionamento ── -->
        <div class="ff-card">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
            <i class="pi pi-external-link text-primary-500 text-sm"></i>
            Redirecionamento após envio
          </h2>

          <div class="space-y-4">
            <div>
              <label class="ff-input-label">
                URL de redirecionamento
                <span class="text-surface-400 dark:text-surface-500 font-normal ml-1">(opcional)</span>
              </label>
              <input
                pInputText
                class="w-full"
                [(ngModel)]="thankYouRedirectUrl"
                placeholder="https://exemplo.com/obrigado"
              />
              <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">
                Após o envio, o respondente será redirecionado para esta URL.
              </p>
            </div>

            @if (thankYouRedirectUrl) {
              <div>
                <label class="ff-input-label">
                  Aguardar antes de redirecionar
                  <span class="text-surface-400 dark:text-surface-500 font-normal ml-1">(segundos)</span>
                </label>
                <p-inputNumber
                  [(ngModel)]="thankYouRedirectDelay"
                  [min]="0"
                  [max]="60"
                  [showButtons]="true"
                  styleClass="w-full"
                  placeholder="0"
                />
                <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">
                  0 = redirecionar imediatamente. A mensagem de agradecimento será exibida durante a contagem.
                </p>
              </div>
            }
          </div>
        </div>

        <!-- ── Respondentes ── -->
        <div class="ff-card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <i class="pi pi-users text-primary-500 text-sm"></i>
              Respondentes com acesso direto
            </h2>
            <button pButton label="Adicionar" icon="pi pi-plus" size="small" (click)="openAddRespondent()"></button>
          </div>
          <p class="text-xs text-surface-400 dark:text-surface-500 mb-4">
            Crie links individuais para respondentes específicos (ex: prefeituras, departamentos). Cada um recebe um link único e pode ter limite de respostas próprio.
          </p>

          @if (respondentsLoading()) {
            <div class="space-y-2">
              @for (i of [1,2,3]; track i) {
                <p-skeleton height="52px" />
              }
            </div>
          } @else if (respondents().length === 0) {
            <div class="text-center py-8 text-surface-400 dark:text-surface-500">
              <i class="pi pi-users text-3xl mb-2 block"></i>
              <p class="text-sm">Nenhum respondente cadastrado.</p>
            </div>
          } @else {
            <div class="space-y-2">
              @for (r of respondents(); track r.id) {
                <div class="flex items-center gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-xl">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">{{ r.name }}</span>
                      @if (!r.active) {
                        <p-tag value="Inativo" severity="secondary" />
                      }
                    </div>
                    <p class="text-xs text-surface-400 dark:text-surface-500">
                      {{ r.responseCount }} resposta{{ r.responseCount !== 1 ? 's' : '' }}
                      @if (r.maxResponses) { · limite: {{ r.maxResponses }} }
                    </p>
                  </div>
                  <button pButton icon="pi pi-copy" severity="secondary" [text]="true" size="small"
                          pTooltip="Copiar link" tooltipPosition="top"
                          (click)="copyLink(r)"></button>
                  <button pButton icon="pi pi-pencil" severity="secondary" [text]="true" size="small"
                          pTooltip="Editar" tooltipPosition="top"
                          (click)="openEditRespondent(r)"></button>
                  <button pButton icon="pi pi-trash" severity="danger" [text]="true" size="small"
                          pTooltip="Remover" tooltipPosition="top"
                          (click)="confirmDeleteRespondent(r)"></button>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── Upload de arquivos ── -->
        <div class="ff-card">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50 mb-1 flex items-center gap-2">
            <i class="pi pi-upload text-primary-500 text-sm"></i>
            Upload de arquivos
          </h2>
          <p class="text-xs text-surface-400 dark:text-surface-500 mb-4">
            Regras aplicadas a questões do tipo "Upload" neste formulário.
          </p>

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="ff-input-label">
                  Tamanho máximo por arquivo
                  <span class="text-surface-400 font-normal ml-1">(MB)</span>
                </label>
                <p-inputNumber
                  [(ngModel)]="uploadMaxFileSizeMb"
                  [min]="1" [max]="100" [showButtons]="true"
                  styleClass="w-full"
                  suffix=" MB"
                />
              </div>
              <div>
                <label class="ff-input-label">Total máximo de arquivos</label>
                <p-inputNumber
                  [(ngModel)]="uploadMaxFilesTotal"
                  [min]="1" [max]="500" [showButtons]="true"
                  styleClass="w-full"
                />
              </div>
            </div>
            <div>
              <label class="ff-input-label">Tipos de arquivo permitidos</label>
              <p-multiselect
                [(ngModel)]="uploadAllowedTypes"
                [options]="uploadTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Selecione os tipos"
                styleClass="w-full"
                display="chip"
              />
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

    <!-- ── Dialog: Adicionar/Editar Respondente ── -->
    <p-dialog
      [(visible)]="respondentDialogVisible"
      [header]="editingRespondent() ? 'Editar Respondente' : 'Novo Respondente'"
      [modal]="true"
      [style]="{ width: '420px' }"
      [draggable]="false">
      <div class="flex flex-col gap-4 pt-2">
        <div>
          <label class="ff-input-label">Nome do respondente</label>
          <input pInputText class="w-full" placeholder="Ex: Prefeitura de São Paulo"
                 [(ngModel)]="respondentForm.name" />
        </div>
        <div>
          <label class="ff-input-label">
            Limite de respostas
            <span class="text-surface-400 font-normal ml-1">(0 = ilimitado)</span>
          </label>
          <p-inputNumber [(ngModel)]="respondentForm.maxResponses" [min]="0" [showButtons]="true" styleClass="w-full" />
        </div>
        @if (editingRespondent()) {
          <div class="flex items-center justify-between">
            <label class="ff-input-label mb-0">Ativo</label>
            <p-toggleswitch [(ngModel)]="respondentForm.active" />
          </div>
        }
      </div>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" [text]="true" (click)="respondentDialogVisible = false"></button>
        <button pButton [label]="editingRespondent() ? 'Salvar' : 'Criar'" icon="pi pi-check"
                [loading]="respondentSaving()"
                (click)="saveRespondent()"></button>
      </ng-template>
    </p-dialog>

    <p-confirmdialog />
  `,
})
export class FormSettingsComponent implements OnInit {
  private readonly formApi = inject(FormApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly id = input.required<string>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly form = signal<FormResponse | null>(null);

  // ── Upload config fields ──
  uploadMaxFileSizeMb = 10;
  uploadMaxFilesTotal = 20;
  uploadAllowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'];

  readonly uploadTypeOptions = [
    { label: 'JPEG', value: 'image/jpeg' },
    { label: 'PNG', value: 'image/png' },
    { label: 'WebP', value: 'image/webp' },
    { label: 'GIF', value: 'image/gif' },
    { label: 'PDF', value: 'application/pdf' },
    { label: 'Word (.docx)', value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { label: 'Excel (.xlsx)', value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { label: 'Qualquer imagem', value: 'image/*' },
    { label: 'Qualquer vídeo', value: 'video/*' },
    { label: 'Qualquer arquivo', value: '*/*' },
  ];

  // ── Form fields ──
  visibility: FormVisibility = 'PUBLIC';
  slug = '';
  password = '';
  maxResponses: number | null = null;
  expiresAt: Date | null = null;
  welcomeMessage = '';
  thankYouMessage = '';
  thankYouRedirectUrl = '';
  thankYouRedirectDelay: number | null = null;
  thankYouShowResubmit = false;

  readonly visibilityOptions = [
    { label: 'Público — qualquer pessoa com o link pode acessar', value: 'PUBLIC' },
    { label: 'Privado — somente você pode ver as respostas', value: 'PRIVATE' },
    { label: 'Protegido por senha', value: 'PASSWORD_PROTECTED' },
  ];

  // ── Respondentes ──
  readonly respondents = signal<RespondentResponse[]>([]);
  readonly respondentsLoading = signal(false);
  readonly respondentSaving = signal(false);
  readonly editingRespondent = signal<RespondentResponse | null>(null);
  respondentDialogVisible = false;
  respondentForm = { name: '', maxResponses: 0, active: true };

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
        this.thankYouRedirectUrl = form.thankYouRedirectUrl ?? '';
        this.thankYouRedirectDelay = form.thankYouRedirectDelay ?? null;
        this.thankYouShowResubmit = form.thankYouShowResubmit ?? false;
        this.loading.set(false);
        this.loadRespondents();
        this.loadUploadConfig();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Formulário não encontrado' });
        this.router.navigate(['/forms']);
      },
    });
  }

  private loadUploadConfig(): void {
    this.formApi.getUploadConfig(this.id()).subscribe({
      next: (config) => {
        this.uploadMaxFileSizeMb = config.maxFileSizeMb;
        this.uploadMaxFilesTotal = config.maxFilesTotal;
        this.uploadAllowedTypes = config.allowedTypes;
      },
      error: () => {},
    });
  }

  private loadRespondents(): void {
    this.respondentsLoading.set(true);
    this.formApi.listRespondents(this.id()).subscribe({
      next: (list) => { this.respondents.set(list); this.respondentsLoading.set(false); },
      error: () => this.respondentsLoading.set(false),
    });
  }

  openAddRespondent(): void {
    this.editingRespondent.set(null);
    this.respondentForm = { name: '', maxResponses: 0, active: true };
    this.respondentDialogVisible = true;
  }

  openEditRespondent(r: RespondentResponse): void {
    this.editingRespondent.set(r);
    this.respondentForm = { name: r.name, maxResponses: r.maxResponses ?? 0, active: r.active };
    this.respondentDialogVisible = true;
  }

  saveRespondent(): void {
    const name = this.respondentForm.name.trim();
    if (!name) return;
    const maxResponses = this.respondentForm.maxResponses > 0 ? this.respondentForm.maxResponses : undefined;
    this.respondentSaving.set(true);
    const editing = this.editingRespondent();

    const request$ = editing
      ? this.formApi.updateRespondent(this.id(), editing.id, { name, maxResponses, active: this.respondentForm.active })
      : this.formApi.createRespondent(this.id(), { name, maxResponses });

    request$.subscribe({
      next: (r) => {
        if (editing) {
          this.respondents.update(list => list.map(x => x.id === r.id ? r : x));
        } else {
          this.respondents.update(list => [...list, r]);
        }
        this.respondentSaving.set(false);
        this.respondentDialogVisible = false;
        this.toast.add({ severity: 'success', summary: 'Salvo!', detail: `Respondente "${r.name}" ${editing ? 'atualizado' : 'criado'}` });
      },
      error: (err) => {
        this.respondentSaving.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Falha ao salvar respondente' });
      },
    });
  }

  confirmDeleteRespondent(r: RespondentResponse): void {
    this.confirm.confirm({
      message: `Remover o respondente "${r.name}"? Os links associados deixarão de funcionar.`,
      header: 'Confirmar remoção',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.formApi.deleteRespondent(this.id(), r.id).subscribe({
          next: () => {
            this.respondents.update(list => list.filter(x => x.id !== r.id));
            this.toast.add({ severity: 'success', summary: 'Removido', detail: `Respondente "${r.name}" removido` });
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao remover respondente' }),
        });
      },
    });
  }

  copyLink(r: RespondentResponse): void {
    const form = this.form();
    const slug = form?.slug || form?.id;
    const url = `${window.location.origin}/f/${slug}?t=${r.token}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toast.add({ severity: 'success', summary: 'Copiado!', detail: `Link de "${r.name}" copiado` });
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
      thankYouRedirectUrl: this.thankYouRedirectUrl || undefined,
      thankYouRedirectDelay: this.thankYouRedirectDelay && this.thankYouRedirectDelay > 0 ? this.thankYouRedirectDelay : undefined,
      thankYouShowResubmit: this.thankYouShowResubmit,
    }).subscribe({
      next: (form) => {
        this.form.set(form);
        this.password = '';
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Salvo!', detail: 'Configurações atualizadas com sucesso' });
        this.formApi.updateUploadConfig(this.id(), {
          maxFileSizeMb: this.uploadMaxFileSizeMb,
          maxFilesTotal: this.uploadMaxFilesTotal,
          allowedTypes: this.uploadAllowedTypes,
        }).subscribe({ error: () => {} });
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
