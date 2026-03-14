import { Component, inject, OnInit, signal, input, ViewChild, OnDestroy, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
    CommonModule, RouterLink,
    ButtonModule, SkeletonModule, TooltipModule, ConfirmDialogModule,
    BuilderToolboxComponent, BuilderCanvasComponent,
    BuilderPropertiesComponent, BuilderPreviewDialogComponent,
  ],
  providers: [BuilderStore],
  template: `
    @if (loading()) {
      <div class="builder-loading">
        <p-skeleton height="64px" styleClass="mb-4" />
        <div class="flex gap-4">
          <p-skeleton width="220px" height="500px" />
          <p-skeleton height="500px" styleClass="flex-1" />
          <p-skeleton width="300px" height="500px" />
        </div>
      </div>
    } @else if (form()) {
      <!-- ── Top bar ── -->
      <div class="builder-topbar">
        <div class="flex items-center gap-3">
          <a routerLink="/forms"
             class="w-9 h-9 flex items-center justify-center rounded-lg
                    hover:bg-surface-100 transition-colors text-surface-500"
             pTooltip="Voltar" tooltipPosition="bottom">
            <i class="pi pi-arrow-left"></i>
          </a>
          <div>
            <h1 class="text-base font-display font-bold text-surface-900 leading-tight">
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
        </div>

        <div class="flex items-center gap-2">
          <button
            pButton icon="pi pi-save" severity="secondary" [text]="true" size="small"
            pTooltip="Salvar rascunho (Ctrl+S)" tooltipPosition="bottom"
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
              (click)="goToResponses()"
            ></button>
            <button
              pButton label="Analytics" icon="pi pi-chart-bar"
              severity="secondary" [outlined]="true" size="small"
              pTooltip="Ver analytics" tooltipPosition="bottom"
              (click)="goToAnalytics()"
            ></button>
          }
          <button
            pButton label="Publicar" icon="pi pi-send" size="small"
            [loading]="publishing()"
            (click)="onPublish()"
          ></button>
        </div>
      </div>

      <!-- ── Three-panel layout ── -->
      <div class="builder-layout">
        <aside class="builder-panel builder-panel--left">
          <app-builder-toolbox />
        </aside>

        <main class="builder-panel builder-panel--center">
          <app-builder-canvas />
        </main>

        <aside class="builder-panel builder-panel--right">
          <app-builder-properties />
        </aside>
      </div>

      <app-builder-preview-dialog #previewDialog />
      <p-confirmDialog />
    }
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column;
      height: calc(100vh - var(--ff-topbar-height));
      margin: -28px -32px;
    }
    .builder-loading { padding: 24px; }
    .builder-topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; background: white;
      border-bottom: 1px solid var(--ff-border); z-index: 20; flex-shrink: 0;
    }
    .builder-layout { display: flex; flex: 1; overflow: hidden; }
    .builder-panel { overflow-y: auto; }
    .builder-panel--left {
      width: 220px; background: white;
      border-right: 1px solid var(--ff-border); flex-shrink: 0;
    }
    .builder-panel--center { flex: 1; background: var(--ff-bg); padding: 24px 16px; }
    .builder-panel--right {
      width: 320px; background: white;
      border-left: 1px solid var(--ff-border); flex-shrink: 0;
    }
    @media (max-width: 1200px) {
      .builder-panel--left { width: 190px; }
      .builder-panel--right { width: 280px; }
    }
    @media (max-width: 900px) { .builder-panel--right { display: none; } }
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

  /** Ctrl+S para salvar manualmente */
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.store.dirty() && !this.store.saving()) {
        this.saveDraft();
      }
    }
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

  formatTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return 'agora';
    if (seconds < 60) return `há ${seconds}s`;
    if (seconds < 3600) return `há ${Math.floor(seconds / 60)}min`;
    return `há ${Math.floor(seconds / 3600)}h`;
  }
}
