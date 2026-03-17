import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import {
  FormApiService,
  FormResponse,
  ResponseSummaryResponse,
  ResponseDetailResponse,
} from '@core/api/form-api.service';

@Component({
  selector: 'app-form-responses',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, TableModule, SkeletonModule, DialogModule, TooltipModule, DatePickerModule,
  ],
  template: `
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <button
          pButton severity="secondary" [text]="true" icon="pi pi-arrow-left"
          pTooltip="Voltar" tooltipPosition="bottom"
          (click)="goBack()"
        ></button>
        <div>
          @if (loadingForm()) {
            <p-skeleton height="24px" width="180px" styleClass="mb-1" />
            <p-skeleton height="16px" width="100px" />
          } @else {
            <h1 class="ff-page-title">{{ form()?.title }}</h1>
            <p class="ff-page-subtitle">
              {{ totalElements() }} resposta{{ totalElements() !== 1 ? 's' : '' }} recebida{{ totalElements() !== 1 ? 's' : '' }}
            </p>
          }
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          pButton label="Analytics" icon="pi pi-chart-bar"
          severity="secondary" [outlined]="true"
          [disabled]="loadingForm()"
          (click)="goToAnalytics()"
        ></button>
        <button
          pButton
          label="Exportar CSV"
          icon="pi pi-download"
          severity="secondary"
          [loading]="exporting()"
          [disabled]="totalElements() === 0 || loadingForm()"
          (click)="exportCsv()"
        ></button>
      </div>
    </div>

    <!-- Filters bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
      <p-datepicker
        [(ngModel)]="dateRange"
        selectionMode="range"
        [showIcon]="true"
        [showButtonBar]="true"
        placeholder="Filtrar por período"
        dateFormat="dd/mm/yy"
        [readonlyInput]="true"
        (onClearClick)="onDateRangeClear()"
        (onSelect)="onDateRangeSelect()"
        styleClass="w-full sm:w-72"
      />
      @if (dateRange && (dateRange[0] || dateRange[1])) {
        <button
          pButton [text]="true" severity="secondary" icon="pi pi-times" label="Limpar filtro"
          size="small"
          (click)="clearDateFilter()"
        ></button>
      }
    </div>

    <!-- Table card -->
    <div class="ff-card p-0 overflow-hidden">

      <!-- Full-page skeleton (first load) -->
      @if (loadingForm() || (loading() && responses().length === 0)) {
        <div class="p-5 space-y-2">
          @for (i of [1,2,3,4,5,6]; track i) {
            <p-skeleton height="48px" />
          }
        </div>
      }

      <!-- Empty state -->
      @else if (filteredResponses().length === 0) {
        <div class="text-center py-16">
          <div class="w-20 h-20 mx-auto mb-5 bg-surface-50 dark:bg-surface-700 rounded-2xl flex items-center justify-center">
            <i class="pi pi-inbox text-3xl text-surface-300"></i>
          </div>
          @if (dateRange && (dateRange[0] || dateRange[1])) {
            <h3 class="text-lg font-semibold text-surface-700 dark:text-surface-200 mb-1">Nenhuma resposta no período</h3>
            <p class="text-sm text-surface-500 mb-5">Tente um intervalo de datas diferente.</p>
            <button pButton [text]="true" severity="secondary" icon="pi pi-filter-slash"
              label="Limpar filtro" (click)="clearDateFilter()"></button>
          } @else {
            <h3 class="text-lg font-semibold text-surface-700 dark:text-surface-200 mb-1">Nenhuma resposta ainda</h3>
            <p class="text-sm text-surface-500">Compartilhe o link do formulário para começar a receber respostas.</p>
          }
        </div>
      }

      <!-- Table -->
      @else {
        <p-table
          [value]="filteredResponses()"
          [loading]="loading()"
          dataKey="id"
          styleClass="w-full"
        >
          <ng-template pTemplate="header">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider w-14">#</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Data/Hora</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider hidden sm:table-cell">ID</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider w-24">Detalhes</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-response let-rowIndex="rowIndex">
            <tr class="border-t border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors cursor-pointer"
                (click)="openDetail(response, rowIndex)">
              <td class="px-5 py-3 text-sm text-surface-400">
                {{ currentPage() * pageSize + rowIndex + 1 }}
              </td>
              <td class="px-5 py-3 text-sm text-surface-900 dark:text-surface-50 font-medium">
                {{ formatDate(response.submittedAt) }}
              </td>
              <td class="px-5 py-3 text-xs text-surface-400 font-mono hidden sm:table-cell">
                {{ response.id.substring(0, 8) }}...
              </td>
              <td class="px-5 py-3 text-right">
                <button
                  pButton
                  severity="secondary"
                  [text]="true"
                  icon="pi pi-eye"
                  size="small"
                  pTooltip="Ver detalhes"
                  tooltipPosition="left"
                  (click)="openDetail(response, rowIndex); $event.stopPropagation()"
                ></button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="loadingbody">
            <tr>
              <td colspan="4" class="p-5">
                <div class="space-y-2">
                  @for (i of [1,2,3]; track i) {
                    <p-skeleton height="40px" />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between px-5 py-3 border-t border-surface-100 dark:border-surface-700">
            <span class="text-xs text-surface-400">
              Página {{ currentPage() + 1 }} de {{ totalPages() }}
              · {{ totalElements() }} resposta{{ totalElements() !== 1 ? 's' : '' }}
            </span>
            <div class="flex items-center gap-1">
              <button
                pButton severity="secondary" [text]="true" icon="pi pi-chevron-left" size="small"
                [disabled]="currentPage() === 0"
                (click)="goToPage(currentPage() - 1)"
              ></button>

              @for (page of visiblePages(); track page) {
                @if (page === -1) {
                  <span class="px-1 text-surface-400 text-sm">…</span>
                } @else {
                  <button
                    pButton [text]="true" size="small"
                    [severity]="page === currentPage() ? 'primary' : 'secondary'"
                    [label]="'' + (page + 1)"
                    (click)="goToPage(page)"
                  ></button>
                }
              }

              <button
                pButton severity="secondary" [text]="true" icon="pi pi-chevron-right" size="small"
                [disabled]="currentPage() >= totalPages() - 1"
                (click)="goToPage(currentPage() + 1)"
              ></button>
            </div>
          </div>
        }
      }
    </div>

    <!-- Detail Dialog -->
    <p-dialog
      [visible]="detailVisible()"
      (visibleChange)="detailVisible.set($event)"
      [header]="'Resposta #' + selectedRowIndex()"
      [modal]="true"
      [style]="{ width: '560px', maxWidth: '95vw' }"
      [maximizable]="true"
      [draggable]="false"
      contentStyleClass="p-0"
    >
      @if (loadingDetail()) {
        <div class="p-5 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <p-skeleton height="64px" borderRadius="8px" />
          }
        </div>
      } @else if (selectedResponse()) {

        <!-- Submitted at -->
        <div class="px-5 py-4 border-b border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-700/50 rounded">
          <div class="flex items-center gap-2 text-sm text-surface-500">
            <i class="pi pi-clock text-xs"></i>
            <span>Enviado em <strong class="text-surface-700 dark:text-surface-200">{{ formatDate(selectedResponse()!.submittedAt) }}</strong></span>
          </div>
          <div class="flex items-center gap-2 text-xs text-surface-400 mt-1">
            <i class="pi pi-hashtag text-[10px]"></i>
            <span class="font-mono">{{ selectedResponse()!.id }}</span>
          </div>
        </div>

        <!-- Answers -->
        <div class="p-5 space-y-3">
          @if (payloadEntries().length === 0) {
            <p class="text-sm text-surface-400 text-center py-4">Sem dados de resposta.</p>
          }
          @for (entry of payloadEntries(); track entry.questionId) {
            <div class="rounded-lg border border-surface-100 dark:border-surface-700 p-3 bg-white dark:bg-surface-800">
              <p class="text-xs font-medium text-surface-400 mb-1 uppercase tracking-wide">{{ entry.label }}</p>
              <p class="text-sm text-surface-900 dark:text-surface-50 break-words whitespace-pre-wrap">{{ entry.displayValue }}</p>
            </div>
          }
        </div>

        <!-- Metadata (collapsible) -->
        @if (metadataEntries().length > 0) {
          <div class="px-5 pb-5 border-t border-surface-100 dark:border-surface-700">
            <button
              pButton [text]="true" severity="secondary" size="small"
              [icon]="showMetadata() ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
              [label]="(showMetadata() ? 'Ocultar' : 'Ver') + ' metadados (' + metadataEntries().length + ')'"
              class="mt-3"
              (click)="showMetadata.set(!showMetadata())"
            ></button>
            @if (showMetadata()) {
              <div class="mt-2 rounded-lg bg-surface-50 dark:bg-surface-700 p-3 space-y-2">
                @for (entry of metadataEntries(); track entry.key) {
                  <div class="flex gap-3 text-xs">
                    <span class="text-surface-400 shrink-0 min-w-28">{{ entry.key }}</span>
                    <span class="text-surface-700 dark:text-surface-200 break-all font-mono">{{ entry.value }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </p-dialog>
  `,
})
export class FormResponsesComponent implements OnInit {
  private readonly formApi = inject(FormApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  // ── State ──
  readonly formId = signal('');
  readonly form = signal<FormResponse | null>(null);
  readonly loadingForm = signal(true);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly responses = signal<ResponseSummaryResponse[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly currentPage = signal(0);
  readonly pageSize = 20;

  // ── Detail dialog ──
  readonly detailVisible = signal(false);
  readonly loadingDetail = signal(false);
  readonly selectedResponse = signal<ResponseDetailResponse | null>(null);
  readonly selectedRowIndex = signal(0);
  readonly showMetadata = signal(false);

  // ── Date filter ──
  dateRange: Date[] | null = null;

  // ── Computed ──

  readonly questionLabelMap = computed(() => {
    const schema = this.form()?.draftSchema;
    const map = new Map<string, { label: string; type: string }>();
    if (!schema) return map;
    for (const section of schema.sections ?? []) {
      for (const q of section.questions ?? []) {
        map.set(q.id, { label: q.label || 'Sem título', type: q.type });
      }
    }
    return map;
  });

  readonly filteredResponses = computed(() => {
    const all = this.responses();
    if (!this.dateRange || (!this.dateRange[0] && !this.dateRange[1])) return all;

    const [from, to] = this.dateRange;
    return all.filter(r => {
      const date = new Date(r.submittedAt);
      if (from && date < from) return false;
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        if (date > toEnd) return false;
      }
      return true;
    });
  });

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: number[] = [0];
    if (current > 2) pages.push(-1);
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
    if (current < total - 3) pages.push(-1);
    pages.push(total - 1);
    return pages;
  });

  readonly payloadEntries = computed(() => {
    const resp = this.selectedResponse();
    if (!resp?.payload) return [];
    const labelMap = this.questionLabelMap();
    return Object.entries(resp.payload).map(([qId, value]) => {
      const info = labelMap.get(qId);
      return {
        questionId: qId,
        label: info?.label ?? `Questão (${qId.substring(0, 8)}…)`,
        type: info?.type ?? 'unknown',
        value,
        displayValue: this.formatAnswerValue(value),
      };
    });
  });

  readonly metadataEntries = computed(() => {
    const resp = this.selectedResponse();
    if (!resp?.metadata) return [];
    return Object.entries(resp.metadata).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—'),
    }));
  });

  // ── Lifecycle ──

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.formId.set(id);
    this.loadForm();
  }

  // ── Data loading ──

  private loadForm(): void {
    this.formApi.getById(this.formId()).subscribe({
      next: (form) => {
        this.form.set(form);
        this.loadingForm.set(false);
        this.loadResponses(0);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Formulário não encontrado' });
        this.router.navigate(['/forms']);
      },
    });
  }

  private loadResponses(page: number): void {
    this.loading.set(true);
    this.currentPage.set(page);
    this.formApi.listResponses(this.formId(), page, this.pageSize).subscribe({
      next: (data) => {
        this.responses.set(data.content);
        this.totalElements.set(data.page.totalElements);
        this.totalPages.set(data.page.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar respostas' });
        this.loading.set(false);
      },
    });
  }

  // ── Actions ──

  openDetail(response: ResponseSummaryResponse, rowIndex: number): void {
    this.selectedRowIndex.set(this.currentPage() * this.pageSize + rowIndex + 1);
    this.selectedResponse.set(null);
    this.showMetadata.set(false);
    this.detailVisible.set(true);
    this.loadingDetail.set(true);

    this.formApi.getResponse(this.formId(), response.id).subscribe({
      next: (detail) => {
        this.selectedResponse.set(detail);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar detalhes' });
        this.loadingDetail.set(false);
        this.detailVisible.set(false);
      },
    });
  }

  exportCsv(): void {
    this.exporting.set(true);
    const formTitle = this.form()?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() ?? 'respostas';
    this.formApi.exportResponsesCsv(this.formId()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formTitle}_respostas.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.toast.add({ severity: 'success', summary: 'Exportado!', detail: 'CSV baixado com sucesso' });
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar CSV' });
        this.exporting.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/forms']);
  }

  goToAnalytics(): void {
    this.router.navigate(['/forms', this.formId(), 'analytics']);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.loadResponses(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Date filter ──

  onDateRangeSelect(): void {
    // filter is reactive via filteredResponses computed
  }

  onDateRangeClear(): void {
    this.dateRange = null;
  }

  clearDateFilter(): void {
    this.dateRange = null;
  }

  // ── Formatters ──

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatAnswerValue(value: any): string {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
}
