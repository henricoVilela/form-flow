import { Component, inject, OnInit, signal, input, ViewChild, OnDestroy, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, filter, takeUntil } from 'rxjs';

import { FormApiService, FormResponse } from '@core/api/form-api.service';
import { BuilderStore } from './builder.store';
import { BuilderToolboxComponent } from './toolbox/builder-toolbox.component';
import { BuilderCanvasComponent } from './canvas/builder-canvas.component';
import { BuilderPropertiesComponent } from './properties/builder-properties.component';
import { BuilderPreviewDialogComponent } from './preview/builder-preview-dialog.component';

@Component({
  selector: 'app-form-builder',
  imports: [
    CommonModule, RouterLink, FormsModule,
    ButtonModule, SkeletonModule, TooltipModule, ConfirmDialogModule,
    DialogModule, InputTextModule, TextareaModule, SelectModule, InputNumberModule,
    BuilderToolboxComponent, BuilderCanvasComponent,
    BuilderPropertiesComponent, BuilderPreviewDialogComponent,
  ],
  providers: [BuilderStore],
  template: `
    @if (loading()) {
      <div class="p-6">
        <p-skeleton height="64px" styleClass="mb-4" />
        <div class="flex gap-4">
          <p-skeleton width="220px" height="500px" />
          <p-skeleton height="500px" styleClass="flex-1" />
          <p-skeleton width="300px" height="500px" />
        </div>
      </div>
    } @else if (form()) {
      <!-- ── Top bar ── -->
      <div class="builder-topbar flex items-center justify-between py-2.5 px-3 md:py-3 md:px-5 bg-white dark:bg-surface-800 border-b border-[var(--ff-border)] z-20 shrink-0">
        <div class="flex items-center gap-3">
          <a routerLink="/forms"
             class="w-9 h-9 flex items-center justify-center rounded-lg
                    hover:bg-surface-100 transition-colors text-surface-500"
             pTooltip="Voltar" tooltipPosition="bottom">
            <i class="pi pi-arrow-left"></i>
          </a>
          <div class="flex items-center gap-1.5">
            <div>
              <h1 class="text-base font-display font-bold text-surface-900 dark:text-surface-50 leading-tight">
                {{ form()!.title }}
              </h1>
              <p class="text-xs text-surface-400 flex items-center gap-2">
                <span [class]="form()!.status === 'PUBLISHED' ? 'text-emerald-500' : 'text-surface-400'">
                  {{ form()!.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
                </span>
                @if (form()!.currentVersion) {
                  <span>· v{{ form()!.currentVersion }}</span>
                }
                @if (store.saving()) {
                  <span class="text-blue-500 flex items-center gap-1">
                    <i class="pi pi-spin pi-spinner text-[10px]"></i> Salvando...
                  </span>
                } @else if (store.dirty()) {
                  <span class="text-amber-500">· Alterações não salvas</span>
                } @else if (store.lastSavedAt()) {
                  <span class="text-emerald-500 flex items-center gap-1">
                    <i class="pi pi-check text-[10px]"></i> Salvo {{ formatTimeSince(store.lastSavedAt()!) }}
                  </span>
                }
                <span>· {{ store.totalQuestions() }} pergunta{{ store.totalQuestions() !== 1 ? 's' : '' }}</span>
              </p>
            </div>
            <button pButton icon="pi pi-pencil" severity="secondary" [text]="true" size="small"
                    pTooltip="Editar título e layout" tooltipPosition="bottom"
                    (click)="openEditInfo()"></button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            pButton icon="pi pi-save" severity="secondary" [text]="true" size="small"
            pTooltip="Salvar rascunho (Ctrl+S) · Duplicar questão (Ctrl+D) · Excluir questão (Del)" tooltipPosition="bottom"
            [loading]="store.saving()"
            [disabled]="!store.dirty() || store.saving()"
            (click)="saveDraft()"
          ></button>

          <button
            pButton label="Preview" icon="pi pi-eye"
            severity="secondary" [outlined]="true" size="small"
            (click)="previewDialog.open()"
          ></button>
          @if (form()!.status === 'PUBLISHED') {
            <button
              pButton label="Respostas" icon="pi pi-inbox"
              severity="secondary" [outlined]="true" size="small"
              pTooltip="Ver respostas recebidas" tooltipPosition="bottom"
              class="builder-btn-secondary"
              (click)="goToResponses()"
            ></button>
            <button
              pButton label="Analytics" icon="pi pi-chart-bar"
              severity="secondary" [outlined]="true" size="small"
              pTooltip="Ver analytics" tooltipPosition="bottom"
              class="builder-btn-secondary"
              (click)="goToAnalytics()"
            ></button>
          }
          <button
            pButton icon="pi pi-cog"
            severity="secondary" [outlined]="true" size="small"
            pTooltip="Configurações" tooltipPosition="bottom"
            class="builder-btn-secondary"
            (click)="goToSettings()"
          ></button>
          <button
            pButton label="Publicar" icon="pi pi-send" size="small"
            [loading]="publishing()"
            (click)="onPublish()"
          ></button>
        </div>
      </div>

      <!-- ── Three-panel layout ── -->
      <div class="flex flex-1 overflow-hidden">
        <aside
          class="builder-panel--left overflow-y-auto bg-white dark:bg-surface-800 border-r border-[var(--ff-border)] shrink-0 hidden md:flex md:flex-col w-[190px] xl:w-[220px]"
          [class.panel-active]="activePanel() === 'toolbox'"
        >
          <app-builder-toolbox />
        </aside>

        <main
          class="builder-panel--center overflow-y-auto flex-1 bg-[var(--ff-bg)] py-6 px-4"
          [class.panel-active]="activePanel() === 'canvas'"
        >
          <app-builder-canvas />
        </main>

        <aside
          class="builder-panel--right overflow-y-auto bg-white dark:bg-surface-800 border-l border-[var(--ff-border)] shrink-0 hidden lg:flex lg:flex-col w-[280px] xl:w-[320px]"
          [class.panel-active]="activePanel() === 'properties'"
        >
          <app-builder-properties />
        </aside>
      </div>

      <!-- ── Mobile tab bar (hidden on md+) ── -->
      <nav class="flex md:hidden border-t border-[var(--ff-border)] bg-white dark:bg-surface-800 shrink-0">
        <button
          class="flex-1 flex flex-col items-center justify-center gap-[3px] py-[10px] px-1 text-[11px] border-0 bg-transparent cursor-pointer transition-colors duration-150"
          [class.text-primary-600]="activePanel() === 'toolbox'"
          [class.text-surface-400]="activePanel() !== 'toolbox'"
          (click)="activePanel.set('toolbox')"
        >
          <i class="pi pi-th-large text-base"></i>
          <span>Componentes</span>
        </button>
        <button
          class="flex-1 flex flex-col items-center justify-center gap-[3px] py-[10px] px-1 text-[11px] border-0 bg-transparent cursor-pointer transition-colors duration-150"
          [class.text-primary-600]="activePanel() === 'canvas'"
          [class.text-surface-400]="activePanel() !== 'canvas'"
          (click)="activePanel.set('canvas')"
        >
          <i class="pi pi-file-edit text-base"></i>
          <span>Canvas</span>
        </button>
        <button
          class="flex-1 flex flex-col items-center justify-center gap-[3px] py-[10px] px-1 text-[11px] border-0 bg-transparent cursor-pointer transition-colors duration-150"
          [class.text-primary-600]="activePanel() === 'properties'"
          [class.text-surface-400]="activePanel() !== 'properties'"
          (click)="activePanel.set('properties')"
        >
          <i class="pi pi-sliders-h text-base"></i>
          <span>Propriedades</span>
        </button>
      </nav>

      <app-builder-preview-dialog #previewDialog />
      <p-confirmDialog />

      <!-- ── Dialog: Editar informações ── -->
      <p-dialog
        [(visible)]="editInfoVisible"
        header="Editar formulário"
        [modal]="true"
        [style]="{ width: '480px', minHeight: '40rem' }"
        [draggable]="false">
        <div class="flex flex-col gap-4 pt-2">
          <div>
            <label class="ff-input-label">Título <span class="text-red-500">*</span></label>
            <input pInputText class="w-full" placeholder="Título do formulário" [(ngModel)]="editInfoForm.title" />
          </div>
          <div>
            <label class="ff-input-label">Descrição <span class="text-surface-400 font-normal">(opcional)</span></label>
            <textarea pTextarea class="w-full" [rows]="3" placeholder="Descrição breve..." [(ngModel)]="editInfoForm.description"></textarea>
          </div>
          <div>
            <label class="ff-input-label">Layout</label>
            <p-select [(ngModel)]="editInfoForm.layout" [options]="layoutOptions"
                      optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          @if (editInfoForm.layout === 'KIOSK') {
            <div>
              <label class="ff-input-label">
                Tempo de reset automático
                <span class="text-surface-400 font-normal ml-1">(segundos após o agradecimento)</span>
              </label>
              <p-inputNumber
                [(ngModel)]="editInfoForm.kioskResetDelay"
                [min]="2" [max]="30" [showButtons]="true"
                styleClass="w-full"
                suffix=" s"
              />
            </div>
          }
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancelar" severity="secondary" [text]="true" (click)="editInfoVisible = false"></button>
          <button pButton label="Salvar" icon="pi pi-check" [loading]="editInfoSaving()" (click)="saveEditInfo()"></button>
        </ng-template>
      </p-dialog>
    }
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column;
      height: calc(100vh - var(--ff-topbar-height));
      margin: -28px -32px;
    }

    @media (max-width: 768px) {
      :host { margin: -20px -16px; }

      /* PrimeNG internal selector — cannot be targeted with Tailwind */
      .builder-topbar .p-button-label { display: none; }
      .builder-btn-secondary { display: none !important; }

      /* Mobile panel visibility: show only the active panel */
      .builder-panel--center { padding: 16px 10px; }
      .builder-panel--left.panel-active,
      .builder-panel--right.panel-active { display: flex; flex-direction: column; flex: 1; }
      .builder-panel--center:not(.panel-active) { display: none; }
    }
  `],
})
export class FormBuilderComponent implements OnInit, OnDestroy {
  private readonly formApi = inject(FormApiService);
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);
  readonly store = inject(BuilderStore);

  @ViewChild('previewDialog') previewDialog!: BuilderPreviewDialogComponent;

  readonly id = input.required<string>();
  readonly loading = signal(true);
  readonly form = signal<FormResponse | null>(null);
  readonly publishing = signal(false);
  readonly activePanel = signal<'toolbox' | 'canvas' | 'properties'>('canvas');

  // ── Editar informações ──
  editInfoVisible = false;
  editInfoForm = { title: '', description: '', layout: 'MULTI_STEP' as 'MULTI_STEP' | 'SINGLE_PAGE' | 'KIOSK', kioskResetDelay: 5 };
  readonly editInfoSaving = signal(false);
  readonly layoutOptions = [
    { label: 'Multi-etapas (uma seção por vez)', value: 'MULTI_STEP' },
    { label: 'Página única (tudo em uma tela)', value: 'SINGLE_PAGE' },
    { label: 'Totem / Kiosk (avaliação presencial)', value: 'KIOSK' },
  ];

  private readonly destroy$ = new Subject<void>();
  private readonly autoSave$ = new Subject<void>();

  constructor() {
    // Auto-save: observa dirty changes com debounce de 3s
    this.autoSave$.pipe(
      debounceTime(3000),
      filter(() => this.store.dirty() && !this.store.saving()),
      takeUntil(this.destroy$),
    ).subscribe(() => this.saveDraft());

    // Effect que dispara auto-save quando dirty muda
    effect(() => {
      if (this.store.dirty()) {
        this.autoSave$.next();
      }
    });
  }

  /** Previne fechar a aba com alterações não salvas */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.store.dirty()) {
      event.preventDefault();
    }
  }

  /** Atalhos de teclado globais do builder */
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const ctrl = event.ctrlKey || event.metaKey;

    // Ctrl+S — salvar rascunho
    if (ctrl && event.key === 's') {
      event.preventDefault();
      if (this.store.dirty() && !this.store.saving()) {
        this.saveDraft();
      }
      return;
    }

    // Atalhos que requerem questão selecionada e foco fora de inputs
    if (this.isInputFocused(event)) return;

    const selectedId = this.store.selectedQuestionId();
    if (!selectedId) return;

    // Del / Backspace — remover questão selecionada
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.store.removeQuestion(selectedId);
      return;
    }

    // Ctrl+D — duplicar questão selecionada
    if (ctrl && event.key === 'd') {
      event.preventDefault();
      this.store.duplicateQuestion(selectedId);
    }
  }

  private isInputFocused(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
  }

  ngOnInit(): void {
    const formId = this.id();

    this.formApi.getById(formId).subscribe({
      next: (form) => {
        this.form.set(form);

        if (form.currentVersion) {
          this.formApi.getVersion(formId, form.currentVersion).subscribe({
            next: (version) => {
              this.store.loadSchema(version.schema);
              this.loading.set(false);
            },
            error: () => {
              this.store.loadSchema(null);
              this.loading.set(false);
            },
          });
        } else if (form.draftSchema) {
          this.store.loadSchema(form.draftSchema);
          this.loading.set(false);
        } else {
          this.store.loadSchema(null);
          this.loading.set(false);
        }
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Formulário não encontrado' });
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    // ✅ Salva ao sair se tiver alterações pendentes
    if (this.store.dirty()) {
      this.saveDraftSync();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** ✅ Salva rascunho (schema no campo schema do update) */
  saveDraft(): void {
    const formData = this.form();
    if (!formData || this.store.saving()) return;

    const schema = this.store.toSchema();
    this.store.markSaving(true);

    this.formApi.update(formData.id, {
      title: formData.title,
      description: formData.description ?? undefined,
      layout: formData.layout,
      schema,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.store.markSaving(false);
        this.store.markClean();
      },
      error: () => {
        this.store.markSaving(false);
        // Não mostra toast para não irritar — auto-save é silencioso
        // O indicador "Alterações não salvas" continua visível
        console.warn('Auto-save failed');
      },
    });
  }

  /** Versão síncrona para ngOnDestroy (fire-and-forget) */
  private saveDraftSync(): void {
    const formData = this.form();
    if (!formData) return;
    const schema = this.store.toSchema();
    this.formApi.update(formData.id, {
      title: formData.title,
      schema,
    }).subscribe();
  }

  onPublish(): void {
    const schema = this.store.toSchema();
    const totalQuestions = this.store.totalQuestions();

    if (totalQuestions === 0) {
      this.toast.add({ severity: 'warn', summary: 'Formulário vazio', detail: 'Adicione pelo menos uma pergunta antes de publicar' });
      return;
    }

    const unlabeled = this.store.allQuestions().filter(q => !q.label.trim() && q.type !== 'statement');
    if (unlabeled.length > 0) {
      this.toast.add({ severity: 'warn', summary: 'Perguntas sem título', detail: `${unlabeled.length} pergunta(s) precisam de um título` });
      return;
    }

    this.publishing.set(true);
    this.formApi.publish(this.id(), schema).subscribe({
      next: (result) => {
        this.publishing.set(false);
        this.store.markClean();
        this.form.update(f => f ? { ...f, status: 'PUBLISHED', currentVersion: result.version } : f);
        this.toast.add({ severity: 'success', summary: 'Publicado!', detail: `Versão ${result.version} publicada com sucesso` });
      },
      error: (err) => {
        this.publishing.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Erro ao publicar' });
      },
    });
  }

  goToResponses(): void {
    this.router.navigate(['/forms', this.id(), 'responses']);
  }

  goToAnalytics(): void {
    this.router.navigate(['/forms', this.id(), 'analytics']);
  }

  goToSettings(): void {
    this.router.navigate(['/forms', this.id(), 'settings']);
  }

  openEditInfo(): void {
    const f = this.form()!;
    const schema = this.store.toSchema();
    const kioskResetDelay = schema.settings?.kioskSettings?.resetDelay ?? 5;
    this.editInfoForm = { title: f.title, description: f.description ?? '', layout: f.layout as 'MULTI_STEP' | 'SINGLE_PAGE' | 'KIOSK', kioskResetDelay };
    this.editInfoVisible = true;
  }

  saveEditInfo(): void {
    const title = this.editInfoForm.title.trim();
    if (!title) return;
    this.editInfoSaving.set(true);
    const currentSchema = this.store.toSchema();
    const updatedSettings = {
      ...currentSchema.settings,
      kioskSettings: this.editInfoForm.layout === 'KIOSK'
        ? { resetDelay: this.editInfoForm.kioskResetDelay }
        : undefined,
    };
    this.store.settings.set(updatedSettings);
    this.formApi.update(this.id(), {
      title,
      description: this.editInfoForm.description.trim() || null,
      layout: this.editInfoForm.layout,
      schema: this.store.toSchema(),
    }).subscribe({
      next: () => {
        this.form.update(f => f ? { ...f, title, description: this.editInfoForm.description || null, layout: this.editInfoForm.layout } : f);
        this.editInfoSaving.set(false);
        this.editInfoVisible = false;
        this.toast.add({ severity: 'success', summary: 'Salvo!', detail: 'Informações atualizadas' });
      },
      error: (err) => {
        this.editInfoSaving.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Falha ao salvar' });
      },
    });
  }

  formatTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return 'agora';
    if (seconds < 60) return `há ${seconds}s`;
    if (seconds < 3600) return `há ${Math.floor(seconds / 60)}min`;
    return `há ${Math.floor(seconds / 3600)}h`;
  }
}
