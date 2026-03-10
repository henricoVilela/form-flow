import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem, ConfirmationService, MessageService } from 'primeng/api';
import { FormApiService, FormResponse } from '@core/api/form-api.service';
import { CreateFormDialogComponent } from '../create-form-dialog/create-form-dialog.component';

type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED';

@Component({
  selector: 'app-form-list',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, IconFieldModule, InputIconModule,
    MenuModule, TagModule, SkeletonModule, ConfirmDialogModule, TooltipModule,
    CreateFormDialogComponent,
  ],
  template: `
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="ff-page-title">Formulários</h1>
        <p class="ff-page-subtitle">
          {{ totalElements() }} formulário{{ totalElements() !== 1 ? 's' : '' }}
        </p>
      </div>

      <button
        pButton
        label="Novo formulário"
        icon="pi pi-plus"
        (click)="createDialog.open()"
      ></button>
    </div>

    <!-- Filters bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
      <!-- Search -->
      <p-iconfield class="flex-1 w-full sm:w-auto">
        <p-inputicon styleClass="pi pi-search" />
        <input
          pInputText
          type="text"
          placeholder="Buscar formulários..."
          class="w-full"
          [(ngModel)]="searchQuery"
          (input)="onSearchChange()"
        />
      </p-iconfield>

      <!-- Status filter pills -->
      <div class="flex gap-1 p-1 bg-surface-100 rounded-lg">
        @for (filter of statusFilters; track filter.value) {
          <button
            (click)="onStatusFilter(filter.value)"
            [class]="'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 '
              + (activeFilter() === filter.value
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500 hover:text-surface-700')"
          >
            {{ filter.label }}
            @if (filter.count !== null) {
              <span class="ml-1.5 text-xs opacity-60">{{ filter.count }}</span>
            }
          </button>
        }
      </div>
    </div>

    <!-- Loading skeletons -->
    @if (loading()) {
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        @for (i of [1,2,3,4,5,6]; track i) {
          <div class="ff-card">
            <div class="flex items-start justify-between mb-4">
              <p-skeleton height="22px" width="65%" />
              <p-skeleton height="22px" width="70px" borderRadius="16px" />
            </div>
            <p-skeleton height="14px" width="90%" styleClass="mb-2" />
            <p-skeleton height="14px" width="55%" styleClass="mb-4" />
            <div class="flex gap-3 pt-3 border-t border-surface-100">
              <p-skeleton height="12px" width="80px" />
              <p-skeleton height="12px" width="100px" />
            </div>
          </div>
        }
      </div>
    }

    <!-- Empty state -->
    @else if (filteredForms().length === 0) {
      <div class="ff-card text-center py-16 mt-4">
        <div class="w-20 h-20 mx-auto mb-5 bg-surface-50 rounded-2xl
                    flex items-center justify-center">
          @if (searchQuery || activeFilter() !== 'ALL') {
            <i class="pi pi-search text-3xl text-surface-300"></i>
          } @else {
            <i class="pi pi-file-edit text-3xl text-surface-300"></i>
          }
        </div>

        @if (searchQuery || activeFilter() !== 'ALL') {
          <h3 class="text-lg font-semibold text-surface-700 mb-1">Nenhum resultado</h3>
          <p class="text-sm text-surface-500 mb-5">
            Nenhum formulário encontrado com os filtros atuais.
          </p>
          <button
            pButton label="Limpar filtros" severity="secondary" [text]="true"
            icon="pi pi-filter-slash"
            (click)="clearFilters()"
          ></button>
        } @else {
          <h3 class="text-lg font-semibold text-surface-700 mb-1">Nenhum formulário ainda</h3>
          <p class="text-sm text-surface-500 mb-5">
            Crie seu primeiro formulário e comece a coletar respostas.
          </p>
          <button
            pButton label="Criar formulário" icon="pi pi-plus"
            (click)="createDialog.open()"
          ></button>
        }
      </div>
    }

    <!-- Forms grid -->
    @else {
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        @for (form of filteredForms(); track form.id) {
          <div
            class="ff-card group relative cursor-pointer"
            (click)="navigateToEdit(form)"
          >
            <!-- Status badge + menu -->
            <div class="flex items-start justify-between mb-3">
              <h3 class="text-base font-semibold text-surface-900 group-hover:text-primary-600
                         transition-colors line-clamp-1 pr-8 flex-1">
                {{ form.title }}
              </h3>

              <div class="flex items-center gap-2 shrink-0">
                <span [class]="getStatusBadgeClass(form.status)">
                  {{ getStatusLabel(form.status) }}
                </span>

                <!-- Actions menu -->
                <button
                  class="w-7 h-7 flex items-center justify-center rounded-md
                         text-surface-400 hover:text-surface-600 hover:bg-surface-100
                         opacity-0 group-hover:opacity-100 transition-all duration-200"
                  (click)="openMenu($event, form)"
                  pTooltip="Ações" tooltipPosition="top"
                >
                  <i class="pi pi-ellipsis-v text-sm"></i>
                </button>
              </div>
            </div>

            <!-- Description -->
            @if (form.description) {
              <p class="text-sm text-surface-500 line-clamp-2 mb-4">{{ form.description }}</p>
            } @else {
              <p class="text-sm text-surface-400 italic mb-4">Sem descrição</p>
            }

            <!-- Meta footer -->
            <div class="flex items-center gap-4 text-xs text-surface-400 pt-3 border-t border-surface-100">
              <!-- Layout -->
              <span class="flex items-center gap-1" pTooltip="Layout" tooltipPosition="bottom">
                <i class="pi pi-{{ form.layout === 'MULTI_STEP' ? 'list' : 'file' }} text-[10px]"></i>
                {{ form.layout === 'MULTI_STEP' ? 'Multi-step' : 'Página única' }}
              </span>

              <!-- Version -->
              @if (form.currentVersion) {
                <span class="flex items-center gap-1" pTooltip="Versão" tooltipPosition="bottom">
                  <i class="pi pi-tag text-[10px]"></i>
                  v{{ form.currentVersion }}
                </span>
              }

              <!-- Updated at -->
              <span class="flex items-center gap-1 ml-auto" pTooltip="Última atualização" tooltipPosition="bottom">
                <i class="pi pi-clock text-[10px]"></i>
                {{ formatRelativeDate(form.updatedAt) }}
              </span>
            </div>

            <!-- Published indicator bar -->
            @if (form.status === 'PUBLISHED') {
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-b-xl"></div>
            }
          </div>
        }
      </div>

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="flex items-center justify-center gap-2 mt-8">
          <button
            pButton severity="secondary" [text]="true" icon="pi pi-chevron-left"
            [disabled]="currentPage() === 0"
            (click)="goToPage(currentPage() - 1)"
          ></button>

          @for (page of visiblePages(); track page) {
            @if (page === -1) {
              <span class="px-2 text-surface-400">...</span>
            } @else {
              <button
                pButton [text]="true"
                [severity]="page === currentPage() ? 'primary' : 'secondary'"
                [label]="'' + (page + 1)"
                [class.font-bold]="page === currentPage()"
                (click)="goToPage(page)"
              ></button>
            }
          }

          <button
            pButton severity="secondary" [text]="true" icon="pi pi-chevron-right"
            [disabled]="currentPage() >= totalPages() - 1"
            (click)="goToPage(currentPage() + 1)"
          ></button>
        </div>
      }
    }

    <!-- Context menu (reusable) -->
    <p-menu #actionsMenu [model]="contextMenuItems" [popup]="true" appendTo="body" />

    <!-- Create dialog -->
    <app-create-form-dialog #createDialog (created)="onFormCreated($event)" />

    <!-- Confirm dialog (archive) -->
    <p-confirmDialog />
  `,
})
export class FormListComponent implements OnInit {
  private readonly formApi = inject(FormApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);

  @ViewChild('actionsMenu') actionsMenu: any;

  // ── State ──
  readonly loading = signal(true);
  readonly forms = signal<FormResponse[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly currentPage = signal(0);
  readonly activeFilter = signal<StatusFilter>('ALL');

  searchQuery = '';
  private searchTimeout: any;
  private selectedForm: FormResponse | null = null;

  readonly pageSize = 12;

  // ── Status filters ──
  statusFilters: { label: string; value: StatusFilter; count: number | null }[] = [
    { label: 'Todos', value: 'ALL', count: null },
    { label: 'Rascunho', value: 'DRAFT', count: null },
    { label: 'Publicados', value: 'PUBLISHED', count: null },
  ];

  // ── Filtered forms (client-side search) ──
  readonly filteredForms = computed(() => {
    let result = this.forms();
    const query = this.searchQuery.toLowerCase().trim();

    if (query) {
      result = result.filter(f =>
        f.title.toLowerCase().includes(query) ||
        (f.description ?? '').toLowerCase().includes(query)
      );
    }

    return result;
  });

  // ── Pagination helpers ──
  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);

    const pages: number[] = [];
    pages.push(0);

    if (current > 2) pages.push(-1); // ellipsis
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 3) pages.push(-1); // ellipsis

    pages.push(total - 1);
    return pages;
  });

  // ── Context menu items ──
  contextMenuItems: MenuItem[] = [];

  // ── Lifecycle ──

  ngOnInit(): void {
    this.loadForms();
  }

  // ── Data loading ──

  private loadForms(): void {
    this.loading.set(true);

    this.formApi.list(this.currentPage(), this.pageSize).subscribe({
      next: (page) => {
        this.forms.set(page.content);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.updateFilterCounts(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar formulários' });
        this.loading.set(false);
      },
    });
  }

  private updateFilterCounts(forms: FormResponse[]): void {
    this.statusFilters = [
      { label: 'Todos', value: 'ALL', count: forms.length },
      { label: 'Rascunho', value: 'DRAFT', count: forms.filter(f => f.status === 'DRAFT').length },
      { label: 'Publicados', value: 'PUBLISHED', count: forms.filter(f => f.status === 'PUBLISHED').length },
    ];
  }

  // ── Actions ──

  navigateToEdit(form: FormResponse): void {
    this.router.navigate(['/forms', form.id, 'edit']);
  }

  openMenu(event: Event, form: FormResponse): void {
    event.stopPropagation();
    this.selectedForm = form;

    this.contextMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.router.navigate(['/forms', form.id, 'edit']),
      },
      {
        label: 'Duplicar',
        icon: 'pi pi-copy',
        command: () => this.duplicateForm(form),
      },
      ...(form.status === 'PUBLISHED' ? [{
        label: 'Copiar link público',
        icon: 'pi pi-link',
        command: () => this.copyPublicLink(form),
      }] : []),
      { separator: true },
      {
        label: 'Arquivar',
        icon: 'pi pi-trash',
        styleClass: 'text-red-500',
        command: () => this.confirmArchive(form),
      },
    ];

    this.actionsMenu.toggle(event);
  }

  private duplicateForm(form: FormResponse): void {
    this.formApi.duplicate(form.id).subscribe({
      next: (cloned) => {
        this.toast.add({
          severity: 'success',
          summary: 'Duplicado!',
          detail: `"${cloned.title}" criado como rascunho`,
        });
        this.loadForms();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao duplicar formulário' });
      },
    });
  }

  private copyPublicLink(form: FormResponse): void {
    const url = `${window.location.origin}/f/${form.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toast.add({ severity: 'success', summary: 'Link copiado!', detail: url });
    });
  }

  private confirmArchive(form: FormResponse): void {
    this.confirmService.confirm({
      message: `Deseja arquivar o formulário "${form.title}"? Ele não aparecerá mais na listagem.`,
      header: 'Arquivar formulário',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Arquivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.formApi.archive(form.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Arquivado', detail: form.title });
            this.loadForms();
          },
          error: () => {
            this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao arquivar' });
          },
        });
      },
    });
  }

  onFormCreated(form: FormResponse): void {
    // Navega direto para o builder do novo form
    this.router.navigate(['/forms', form.id, 'edit']);
  }

  // ── Filters ──

  onStatusFilter(filter: StatusFilter): void {
    this.activeFilter.set(filter);
    // O backend atual não filtra por status no endpoint list, então
    // quando implementar filtro server-side, chamar loadForms() aqui.
    // Por ora, o filteredForms computed faz filter client-side.
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      // debounce de 300ms - para busca server-side futura
    }, 300);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.activeFilter.set('ALL');
  }

  // ── Pagination ──

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loadForms();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Formatters ──

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'ff-badge-published';
      case 'ARCHIVED':  return 'ff-badge-archived';
      default:          return 'ff-badge-draft';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'Publicado';
      case 'ARCHIVED':  return 'Arquivado';
      default:          return 'Rascunho';
    }
  }

  formatRelativeDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem atrás`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}