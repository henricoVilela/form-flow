import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { MessageService } from 'primeng/api';
import {
  FormApiService,
  AnalyticsResponse,
  QuestionAnalytics,
} from '@core/api/form-api.service';

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

@Component({
  selector: 'app-form-analytics',
  imports: [CommonModule, ButtonModule, SkeletonModule, TooltipModule, ChartModule],
  template: `
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <button
          pButton severity="secondary" [text]="true" icon="pi pi-arrow-left"
          pTooltip="Voltar" tooltipPosition="bottom"
          (click)="goBack()"
        ></button>
        <div>
          @if (loading()) {
            <p-skeleton height="24px" width="200px" styleClass="mb-1" />
            <p-skeleton height="16px" width="140px" />
          } @else {
            <h1 class="ff-page-title">Analytics</h1>
            <p class="ff-page-subtitle">{{ analytics()?.formTitle }}</p>
          }
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Days selector -->
        <div class="flex gap-1 p-1 bg-surface-100 rounded-lg">
          @for (opt of daysOptions; track opt.value) {
            <button
              (click)="setDays(opt.value)"
              [class]="'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 '
                + (selectedDays() === opt.value
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700')"
            >{{ opt.label }}</button>
          }
        </div>

        <button
          pButton label="Respostas" icon="pi pi-inbox"
          severity="secondary" [outlined]="true" size="small"
          (click)="goToResponses()"
        ></button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

      @if (loading()) {
        @for (i of [1,2,3,4]; track i) {
          <div class="ff-card">
            <p-skeleton height="12px" width="80px" styleClass="mb-3" />
            <p-skeleton height="36px" width="70px" styleClass="mb-2" />
            <p-skeleton height="12px" width="100px" />
          </div>
        }
      } @else {
        <div class="ff-card">
          <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Total</p>
          <p class="text-3xl font-bold text-surface-900">{{ analytics()?.summary?.totalResponses ?? 0 }}</p>
          <p class="text-xs text-surface-400 mt-1">respostas recebidas</p>
        </div>

        <div class="ff-card">
          <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Últimos 7 dias</p>
          <p class="text-3xl font-bold text-indigo-600">{{ analytics()?.summary?.responsesLast7Days ?? 0 }}</p>
          <p class="text-xs text-surface-400 mt-1">respostas</p>
        </div>

        <div class="ff-card">
          <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Últimos 30 dias</p>
          <p class="text-3xl font-bold text-violet-600">{{ analytics()?.summary?.responsesLast30Days ?? 0 }}</p>
          <p class="text-xs text-surface-400 mt-1">respostas</p>
        </div>

        <div class="ff-card">
          <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Tempo médio</p>
          <p class="text-3xl font-bold text-surface-900">
            {{ formatDuration(analytics()?.summary?.averageCompletionTimeSeconds ?? null) }}
          </p>
          <p class="text-xs text-surface-400 mt-1">de preenchimento</p>
        </div>
      }
    </div>

    <!-- Timeline chart -->
    <div class="ff-card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-surface-700">Respostas por dia</h3>
        @if (!loading() && analytics()) {
          <span class="text-xs text-surface-400">últimos {{ selectedDays() }} dias</span>
        }
      </div>

      @if (loading()) {
        <p-skeleton height="200px" />
      } @else if ((analytics()?.summary?.totalResponses ?? 0) === 0) {
        <div class="flex items-center justify-center h-[200px] text-sm text-surface-400">
          <div class="text-center">
            <i class="pi pi-chart-line text-3xl text-surface-200 block mb-2"></i>
            Nenhuma resposta ainda
          </div>
        </div>
      } @else {
        <p-chart
          type="line"
          [data]="timelineChartData()"
          [options]="lineChartOptions"
          height="200px"
        />
      }
    </div>

    <!-- No responses empty state -->
    @if (!loading() && (analytics()?.summary?.totalResponses ?? 0) === 0) {
      <div class="ff-card text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 bg-surface-50 rounded-2xl flex items-center justify-center">
          <i class="pi pi-chart-bar text-2xl text-surface-300"></i>
        </div>
        <h3 class="text-base font-semibold text-surface-700 mb-1">Sem dados para analisar</h3>
        <p class="text-sm text-surface-500">Compartilhe o formulário para começar a receber respostas.</p>
      </div>
    }

    <!-- Question cards grid -->
    @if (!loading() && visibleQuestions().length > 0) {
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-surface-600 uppercase tracking-wide">
          Por questão — {{ visibleQuestions().length }} questão{{ visibleQuestions().length !== 1 ? 'ões' : '' }}
        </h2>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        @for (q of visibleQuestions(); track q.questionId) {
          <div class="ff-card flex flex-col gap-4">

            <!-- Question header -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-start gap-2 flex-1 min-w-0">
                <span class="w-7 h-7 rounded-md bg-surface-100 flex items-center justify-center shrink-0 mt-0.5">
                  <i class="pi {{ getTypeIcon(q.type) }} text-xs text-surface-500"></i>
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-surface-900 line-clamp-2">{{ q.label }}</p>
                  <p class="text-xs text-surface-400 mt-0.5">{{ getTypeLabel(q.type) }}</p>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-semibold text-surface-900">{{ q.totalAnswered }}</p>
                <p class="text-xs text-surface-400">respondidas</p>
              </div>
            </div>

            <!-- Answer rate bar -->
            <div>
              <div class="flex justify-between text-xs text-surface-400 mb-1">
                <span>Taxa de resposta</span>
                <span class="font-medium text-surface-600">{{ (q.answerRate * 100).toFixed(0) }}%</span>
              </div>
              <div class="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-indigo-500 transition-all"
                  [style.width.%]="q.answerRate * 100"
                ></div>
              </div>
            </div>

            <!-- No answers -->
            @if (q.totalAnswered === 0) {
              <div class="text-center py-4 text-xs text-surface-400">
                <i class="pi pi-inbox block text-xl text-surface-200 mb-1"></i>
                Sem respostas para esta questão
              </div>
            }

            <!-- Choice distribution -->
            @else if (q.choiceDistribution) {
              <p-chart
                type="bar"
                [data]="buildChoiceChartData(q)"
                [options]="hBarOptions"
                [style.height]="getChoiceChartHeight(q) + 'px'"
              />
            }

            <!-- Numeric / Rating / Scale stats -->
            @else if (q.numericStats) {
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Média</p>
                  <p class="text-xl font-bold text-indigo-600">{{ q.numericStats.average | number:'1.1-2' }}</p>
                </div>
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Mediana</p>
                  <p class="text-xl font-bold text-violet-600">{{ q.numericStats.median | number:'1.1-2' }}</p>
                </div>
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Mínimo</p>
                  <p class="text-xl font-bold text-surface-700">{{ q.numericStats.min | number:'1.0-2' }}</p>
                </div>
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Máximo</p>
                  <p class="text-xl font-bold text-surface-700">{{ q.numericStats.max | number:'1.0-2' }}</p>
                </div>
              </div>
              @if (q.numericStats.standardDeviation != null) {
                <p class="text-xs text-surface-400 text-center">
                  Desvio padrão: <span class="font-medium text-surface-600">{{ q.numericStats.standardDeviation | number:'1.1-2' }}</span>
                </p>
              }
            }

            <!-- Text stats -->
            @else if (q.textStats) {
              <div class="grid grid-cols-3 gap-3 mb-2">
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Comp. médio</p>
                  <p class="text-lg font-bold text-surface-900">{{ q.textStats.averageLength | number:'1.0-0' }}</p>
                  <p class="text-xs text-surface-400">caracteres</p>
                </div>
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Mínimo</p>
                  <p class="text-lg font-bold text-surface-900">{{ q.textStats.minLength }}</p>
                  <p class="text-xs text-surface-400">caracteres</p>
                </div>
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Máximo</p>
                  <p class="text-lg font-bold text-surface-900">{{ q.textStats.maxLength }}</p>
                  <p class="text-xs text-surface-400">caracteres</p>
                </div>
              </div>
              @if (this.hasTopWords(q)) {
                <div>
                  <p class="text-xs font-medium text-surface-500 mb-2">Palavras mais frequentes</p>
                  <p-chart
                    type="bar"
                    [data]="buildTopWordsChartData(q)"
                    [options]="hBarOptions"
                    [style.height]="getTopWordsChartHeight(q) + 'px'"
                  />
                </div>
              }
            }

            <!-- Date stats -->
            @else if (q.dateStats) {
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-surface-50 rounded-lg p-3">
                  <p class="text-xs text-surface-400 mb-1">Primeira data</p>
                  <p class="text-sm font-semibold text-surface-800">{{ formatDateShort(q.dateStats.earliest) }}</p>
                </div>
                <div class="bg-surface-50 rounded-lg p-3">
                  <p class="text-xs text-surface-400 mb-1">Última data</p>
                  <p class="text-sm font-semibold text-surface-800">{{ formatDateShort(q.dateStats.latest) }}</p>
                </div>
              </div>
            }

            <!-- File stats -->
            @else if (q.fileStats) {
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Total de arquivos</p>
                  <p class="text-2xl font-bold text-surface-900">{{ q.fileStats.totalFiles }}</p>
                </div>
                <div class="bg-surface-50 rounded-lg p-3 text-center">
                  <p class="text-xs text-surface-400 mb-1">Média por resposta</p>
                  <p class="text-2xl font-bold text-surface-900">{{ q.fileStats.averageFilesPerResponse | number:'1.1-1' }}</p>
                </div>
              </div>
            }

          </div>
        }
      </div>
    }
  `,
})
export class FormAnalyticsComponent implements OnInit {
  private readonly formApi = inject(FormApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  // ── State ──
  readonly formId = signal('');
  readonly loading = signal(true);
  readonly analytics = signal<AnalyticsResponse | null>(null);
  readonly selectedDays = signal(30);

  readonly daysOptions = [
    { label: '7 dias', value: 7 },
    { label: '30 dias', value: 30 },
    { label: '90 dias', value: 90 },
  ];

  // ── Computed ──

  readonly visibleQuestions = computed(() =>
    (this.analytics()?.questions ?? []).filter(q => q.type !== 'statement')
  );

  readonly timelineChartData = computed(() => {
    const a = this.analytics();
    if (!a) return { labels: [], datasets: [] };

    const filled = this.fillTimelineGaps(a.timeline, this.selectedDays());
    return {
      labels: filled.map(t => this.formatDateLabel(t.date)),
      datasets: [{
        label: 'Respostas',
        data: filled.map(t => t.count),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#6366f1',
        borderWidth: 2,
      }],
    };
  });

  // ── Chart options ──

  readonly lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.parsed.y} resposta${ctx.parsed.y !== 1 ? 's' : ''}` } },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0 },
        grid: { color: 'rgba(0,0,0,0.04)' },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 10 },
      },
    },
  };

  readonly hBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0 },
        grid: { color: 'rgba(0,0,0,0.04)' },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 12 } },
      },
    },
  };

  // ── Lifecycle ──

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.formId.set(id);
    this.loadAnalytics();
  }

  // ── Data loading ──

  private loadAnalytics(): void {
    this.loading.set(true);
    this.formApi.getAnalytics(this.formId(), this.selectedDays()).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar analytics' });
        this.loading.set(false);
      },
    });
  }

  setDays(days: number): void {
    if (this.selectedDays() === days) return;
    this.selectedDays.set(days);
    this.loadAnalytics();
  }

  // ── Navigation ──

  goBack(): void {
    this.router.navigate(['/forms']);
  }

  goToResponses(): void {
    this.router.navigate(['/forms', this.formId(), 'responses']);
  }

  // ── Chart builders ──

  buildChoiceChartData(q: QuestionAnalytics): any {
    if (!q.choiceDistribution) return { labels: [], datasets: [] };
    const entries = Object.entries(q.choiceDistribution.distribution)
      .sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([label]) => label),
      datasets: [{
        data: entries.map(([, count]) => count),
        backgroundColor: entries.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'cc'),
        borderColor: entries.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 1,
        borderRadius: 4,
      }],
    };
  }

  buildTopWordsChartData(q: QuestionAnalytics): any {
    if (!q.textStats?.topWords?.length) return { labels: [], datasets: [] };
    const words = [...q.textStats.topWords].sort((a, b) => b.count - a.count).slice(0, 10);
    return {
      labels: words.map(w => w.word),
      datasets: [{
        data: words.map(w => w.count),
        backgroundColor: '#818cf8cc',
        borderColor: '#818cf8',
        borderWidth: 1,
        borderRadius: 4,
      }],
    };
  }

  getChoiceChartHeight(q: QuestionAnalytics): number {
    const count = Object.keys(q.choiceDistribution?.distribution ?? {}).length;
    return Math.max(120, count * 36 + 24);
  }

  getTopWordsChartHeight(q: QuestionAnalytics): number {
    const count = Math.min(q.textStats?.topWords?.length ?? 0, 10);
    return Math.max(100, count * 30 + 20);
  }

  // ── Timeline helpers ──

  private fillTimelineGaps(
    timeline: { date: string; count: number }[],
    days: number,
  ): { date: string; count: number }[] {
    const countMap = new Map(timeline.map(t => [t.date, t.count]));
    const filled: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      filled.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 });
    }
    return filled;
  }

  private formatDateLabel(dateStr: string): string {
    const [, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  }

  // ── Formatters ──

  formatDuration(seconds: number | null): string {
    if (seconds == null) return '—';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      short_text: 'Texto curto', long_text: 'Texto longo',
      email: 'E-mail', phone: 'Telefone', url: 'URL',
      number: 'Número', single_choice: 'Escolha única',
      multi_choice: 'Múltipla escolha', dropdown: 'Lista suspensa',
      date: 'Data', file_upload: 'Upload de arquivo',
      rating: 'Avaliação', scale: 'Escala', matrix: 'Matriz',
    };
    return labels[type] ?? type;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      short_text: 'pi-align-left', long_text: 'pi-align-justify',
      email: 'pi-envelope', phone: 'pi-phone', url: 'pi-link',
      number: 'pi-hashtag', single_choice: 'pi-circle',
      multi_choice: 'pi-check-square', dropdown: 'pi-chevron-down',
      date: 'pi-calendar', file_upload: 'pi-paperclip',
      rating: 'pi-star', scale: 'pi-sliders-h', matrix: 'pi-table',
    };
    return icons[type] ?? 'pi-question';
  }

  hasTopWords(q: QuestionAnalytics): boolean {
    const textStats = q.textStats;
    return textStats != null && textStats.topWords && textStats.topWords.length > 0;
  }
}
