import {
  Component, inject, input, signal, computed, OnDestroy, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { FormApiService, PublicFormResponse } from '@core/api/form-api.service';
import { QuestionFieldComponent, RendererQuestion } from '@shared/question-field/question-field.component';
import { UploadApiService } from '@core/api/upload-api.service';

// ── Interfaces (espelham as do form-renderer) ───────────────────────────────

interface Section {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

interface Question extends RendererQuestion {
  conditions: { operator: 'AND' | 'OR'; rules: ConditionRule[] } | null;
}

interface ConditionRule {
  questionId: string;
  operator: string;
  value: any;
}

type KioskState = 'form' | 'submitting' | 'thanks';

// Mapeamento de emojis por posição (1=muito insatisfeito → N=muito satisfeito)
const EMOJIS_5 = ['😠', '😕', '😐', '🙂', '😄'];

function buildEmojiSet(max: number): string[] {
  if (max === 5) return EMOJIS_5;
  if (max === 3) return ['😠', '😐', '😄'];
  if (max === 4) return ['😕', '😐', '🙂', '😄'];
  return Array.from({ length: max }, (_, i) => {
    const idx = Math.round((i / (max - 1)) * (EMOJIS_5.length - 1));
    return EMOJIS_5[idx];
  });
}

// ── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-kiosk-form-renderer',
  imports: [CommonModule, FormsModule, ButtonModule, ToastModule, QuestionFieldComponent],
  providers: [MessageService],
  template: `
    <p-toast position="top-center" />

    <!-- ── FORM STATE ── -->
    @if (kioskState() !== 'thanks') {
      <div class="kiosk-bg min-h-screen flex flex-col items-center justify-center px-6 py-10 relative">

        <!-- Form title chip -->
        <p class="text-slate-400 text-xs uppercase tracking-[0.2em] mb-6 font-medium">
          {{ formData().title }}
        </p>

        <!-- Hero question card -->
        <div class="kiosk-card w-full max-w-2xl text-center">

          <!-- Primary question label -->
          <h1 class="text-2xl sm:text-3xl font-bold text-white leading-snug mb-10 px-2">
            {{ primaryQuestion()?.label || 'Como foi sua experiência?' }}
          </h1>

          <!-- ── EMOJI RATING ── -->
          @if (isEmojiRating()) {
            <div class="flex justify-center items-end gap-2 sm:gap-5 flex-wrap">
              @for (emoji of emojiSet(); let i = $index; track i) {
                @let value = i + 1;
                @let selected = primaryAnswer() === value;
                <button
                  class="kiosk-emoji-btn"
                  [class.selected]="selected"
                  [class.dimmed]="primaryAnswer() !== null && !selected"
                  (click)="onPrimarySelect(value)"
                  [attr.aria-label]="'Nota ' + value"
                >
                  <span class="emoji-glyph">{{ emoji }}</span>
                  <!-- <span class="emoji-label text-xs mt-1 text-slate-400">{{ value }}</span> -->
                </button>
              }
            </div>
          }

          <!-- ── STAR RATING ── -->
          @else if (primaryQuestion()?.type === 'rating') {
            <div class="flex justify-center items-center gap-2 sm:gap-4 flex-wrap">
              @for (n of starsRange(); let i = $index; track i) {
                @let value = i + 1;
                @let filled = (primaryAnswer() ?? 0) >= value;
                <button
                  class="kiosk-star-btn"
                  [class.filled]="filled"
                  (click)="onPrimarySelect(value)"
                  [attr.aria-label]="'Nota ' + value"
                >
                  <i [class]="filled ? 'pi pi-star-fill' : 'pi pi-star'"></i>
                </button>
              }
            </div>
          }

          <!-- ── SCALE ── -->
          @else if (primaryQuestion()?.type === 'scale') {
            @let sc = primaryQuestion()!.scaleConfig!;
            <div class="space-y-4">
              <div class="flex justify-between text-sm text-slate-400 px-2">
                <span>{{ sc.minLabel }}</span>
                <span>{{ sc.maxLabel }}</span>
              </div>
              <div class="flex justify-center flex-wrap gap-2">
                @for (n of scaleRange(sc.min, sc.max); let i = $index; track i) {
                  @let selected = primaryAnswer() === n;
                  <button
                    class="kiosk-scale-btn"
                    [class.selected]="selected"
                    (click)="onPrimarySelect(n)"
                  >{{ n }}</button>
                }
              </div>
            </div>
          }

          <!-- ── AUTO-SUBMIT indicator ── -->
          @if (primaryAnswer() !== null && visibleSecondary().length === 0 && kioskState() !== 'submitting') {
            <div class="mt-8 flex flex-col items-center gap-3">
              <p class="text-slate-400 text-sm">Enviando avaliação…</p>
              <div class="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-400 rounded-full"
                  [style.width.%]="autoSubmitProgress()"
                  [style.transition]="autoSubmitTransition()"
                ></div>
              </div>
            </div>
          }

          <!-- ── SUBMITTING spinner ── -->
          @if (kioskState() === 'submitting') {
            <div class="mt-8 flex items-center justify-center gap-3 text-slate-300">
              <i class="pi pi-spin pi-spinner text-xl"></i>
              <span class="text-sm">Registrando…</span>
            </div>
          }
        </div>

        <!-- ── Conditional questions ── -->
        @if (primaryAnswer() !== null && visibleSecondary().length > 0) {
          <div class="w-full max-w-2xl mt-6 animate-slide-up">
            <div class="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
              @for (q of visibleSecondary(); track q.id) {
                <div>
                  <app-question-field
                    [question]="q"
                    [answer]="answers()[q.id]"
                    [error]="errors()[q.id] || null"
                    [fileNames]="fileNames()[q.id] || []"
                    (answerChange)="setAnswer(q.id, $event)"
                    (filesSelected)="uploadFiles(q.id, $event)"
                    (fileRemove)="removeFile(q.id, $event)"
                  />
                </div>
              }
              <div class="pt-2 flex justify-center">
                <button
                  pButton
                  label="Enviar avaliação"
                  icon="pi pi-check"
                  size="large"
                  [loading]="kioskState() === 'submitting'"
                  (click)="onSubmit()"
                ></button>
              </div>
            </div>
          </div>
        }

        <!-- Branding -->
        <div class="absolute bottom-5 flex items-center gap-1.5 opacity-30">
          <span class="text-xs text-slate-400">Criado com</span>
          <div class="flex items-center gap-1">
            <div class="w-5 h-5 bg-primary-500 rounded flex items-center justify-center">
              <i class="pi pi-bolt text-white text-xs"></i>
            </div>
            <span class="text-xs font-semibold text-slate-300">FormFlow</span>
          </div>
        </div>
      </div>
    }

    <!-- ── THANKS STATE ── -->
    @if (kioskState() === 'thanks') {
      <div class="thanks-bg min-h-screen flex flex-col items-center justify-center px-6 text-center animate-slide-up">
        <div class="text-7xl sm:text-8xl mb-6 select-none">✅</div>

        <h1 class="text-3xl sm:text-4xl font-bold text-white mb-4">
          Obrigado!
        </h1>

        @if (formData().thankYouMessage) {
          <p class="text-white/70 text-lg max-w-md mb-10 whitespace-pre-line leading-relaxed">
            {{ formData().thankYouMessage }}
          </p>
        } @else {
          <p class="text-white/60 text-lg mb-10">
            Sua avaliação foi registrada com sucesso.
          </p>
        }

        <!-- Countdown bar -->
        <div class="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
          <div
            class="h-full bg-white/70 rounded-full"
            [style.width.%]="countdownPercent()"
            style="transition: width 1s linear"
          ></div>
        </div>
        <p class="text-white/40 text-sm mb-8">
          Nova avaliação em {{ countdown() }}s
        </p>

        <button
          pButton
          label="Avaliar novamente"
          icon="pi pi-refresh"
          severity="secondary"
          [outlined]="true"
          (click)="resetKiosk()"
        ></button>
      </div>
    }
  `,
  styles: [`
    .kiosk-bg {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    }
    .thanks-bg {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #064e3b 100%);
    }
    .kiosk-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.5rem;
      padding: 2.5rem 2rem;
    }

    /* ── Emoji buttons ── */
    .kiosk-emoji-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: transparent;
      border: 2px solid transparent;
      border-radius: 1rem;
      padding: 0.5rem 0.6rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .kiosk-emoji-btn:hover {
      background: rgba(255,255,255,0.08);
      transform: scale(1.1);
    }
    .kiosk-emoji-btn.selected {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.4);
      transform: scale(1.18);
    }
    .kiosk-emoji-btn.dimmed {
      opacity: 0.35;
    }
    .emoji-glyph {
      font-size: 3.5rem;
      line-height: 1;
      display: block;
    }
    @media (min-width: 640px) {
      .emoji-glyph { font-size: 4.5rem; }
    }

    /* ── Star buttons ── */
    .kiosk-star-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: rgba(255,255,255,0.2);
      font-size: 2.5rem;
      padding: 0.25rem;
      transition: all 0.15s ease;
      line-height: 1;
    }
    .kiosk-star-btn:hover { color: #fbbf24; transform: scale(1.15); }
    .kiosk-star-btn.filled { color: #fbbf24; }
    .kiosk-star-btn i { font-size: 2.5rem; }
    @media (min-width: 640px) {
      .kiosk-star-btn i { font-size: 3.5rem; }
    }

    /* ── Scale buttons ── */
    .kiosk-scale-btn {
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 0.75rem;
      border: 2px solid rgba(255,255,255,0.15);
      background: transparent;
      color: rgba(255,255,255,0.6);
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .kiosk-scale-btn:hover {
      border-color: rgba(255,255,255,0.5);
      color: white;
      background: rgba(255,255,255,0.08);
    }
    .kiosk-scale-btn.selected {
      background: white;
      color: #0f172a;
      border-color: white;
      transform: scale(1.1);
    }

    /* Override PrimeNG label/description colors inside kiosk dark card */
    :host ::ng-deep .kiosk-bg app-question-field label {
      color: rgba(255,255,255,0.85) !important;
    }
    :host ::ng-deep .kiosk-bg app-question-field .text-surface-400 {
      color: rgba(255,255,255,0.4) !important;
    }
  `],
})
export class KioskFormRendererComponent implements OnInit, OnDestroy {
  private readonly formApi = inject(FormApiService);
  private readonly uploadApi = inject(UploadApiService);
  private readonly toast = inject(MessageService);

  readonly formData = input.required<PublicFormResponse>();
  readonly respondentToken = input<string | null>(null);

  readonly kioskState = signal<KioskState>('form');
  readonly answers = signal<Record<string, any>>({});
  readonly errors = signal<Record<string, string>>({});
  readonly fileNames = signal<Record<string, string[]>>({});
  readonly countdown = signal(0);
  readonly autoSubmitProgress = signal(0);
  readonly autoSubmitTransition = signal('none');

  private startedAt = new Date();
  private countdownInterval?: ReturnType<typeof setInterval>;
  private autoSubmitTimeout?: ReturnType<typeof setTimeout>;
  private autoSubmitProgressTimeout?: ReturnType<typeof setTimeout>;

  // ── Parsed sections from schema ──────────────────────────────────────────

  readonly sections = computed<Section[]>(() => {
    const raw: any[] = this.formData().schema?.sections ?? [];
    return raw
      .filter((s: any) => s.questions?.length > 0)
      .map((s: any) => ({
        id: s.id,
        title: s.title ?? '',
        description: s.description ?? '',
        questions: (s.questions ?? []).map((q: any): Question => ({
          id: q.id,
          type: q.type,
          label: q.label ?? '',
          description: q.description ?? '',
          required: q.required ?? false,
          placeholder: q.placeholder ?? '',
          options: q.options ?? [],
          validations: q.validations ?? {},
          conditions: q.conditions ?? null,
          ratingConfig: q.ratingConfig ?? null,
          scaleConfig: q.scaleConfig ?? null,
          numberConfig: q.numberConfig ?? null,
          matrixConfig: q.matrixConfig ?? null,
        })),
      }));
  });

  readonly allQuestions = computed<Question[]>(() =>
    this.sections().flatMap(s => s.questions)
  );

  // Primeira questão de rating/scale — vira o "hero"
  readonly primaryQuestion = computed<Question | null>(() =>
    this.allQuestions().find(q => q.type === 'rating' || q.type === 'scale') ?? null
  );

  readonly primaryAnswer = computed<number | null>(() => {
    const q = this.primaryQuestion();
    return q ? (this.answers()[q.id] ?? null) : null;
  });

  // Questões secundárias — excluindo a primária e statements
  readonly secondaryQuestions = computed<Question[]>(() => {
    const primary = this.primaryQuestion();
    return this.allQuestions().filter(q => q.id !== primary?.id && q.type !== 'statement');
  });

  // Visíveis com base nas condições (só avaliadas após primary ter resposta)
  readonly visibleSecondary = computed<Question[]>(() => {
    if (this.primaryAnswer() === null) return [];
    return this.secondaryQuestions().filter(q => this.isVisible(q));
  });

  readonly isEmojiRating = computed(() =>
    this.primaryQuestion()?.ratingConfig?.icon === 'emoji'
  );

  readonly emojiSet = computed(() => {
    const max = this.primaryQuestion()?.ratingConfig?.max ?? 5;
    return buildEmojiSet(max);
  });

  readonly resetDelay = computed(() =>
    this.formData().schema?.settings?.kioskSettings?.resetDelay ?? 5
  );

  readonly countdownPercent = computed(() => {
    const total = this.resetDelay();
    if (total <= 0) return 0;
    return (this.countdown() / total) * 100;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // noop — state starts at 'form'
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // ── Primary question selection ────────────────────────────────────────────

  onPrimarySelect(value: number): void {
    if (this.kioskState() === 'submitting') return;

    const q = this.primaryQuestion();
    if (!q) return;

    // Limpa auto-submit anterior se usuário mudar a nota
    this.clearTimers();
    this.autoSubmitProgress.set(0);
    this.autoSubmitTransition.set('none');

    this.answers.update(a => ({ ...a, [q.id]: value }));
    this.errors.update(e => { const c = { ...e }; delete c[q.id]; return c; });

    // Aguarda um tick para o computed visibleSecondary atualizar
    setTimeout(() => {
      const visible = this.visibleSecondary();
      if (visible.length === 0) {
        // Sem questões condicionais — auto-submit em 1.5s com barra de progresso
        this.autoSubmitTransition.set('width 1.5s linear');
        this.autoSubmitProgress.set(100);
        this.autoSubmitTimeout = setTimeout(() => this.onSubmit(), 1500);
      }
    }, 30);
  }

  // ── Secondary questions ───────────────────────────────────────────────────

  setAnswer(qId: string, value: any): void {
    this.answers.update(a => ({ ...a, [qId]: value }));
    this.errors.update(e => { const c = { ...e }; delete c[qId]; return c; });
  }

  uploadFiles(qId: string, files: File[]): void {
    for (const file of files) {
      this.uploadApi.uploadFile(this.formData().formId, file).subscribe({
        next: (fileId) => {
          this.setAnswer(qId, [...(this.answers()[qId] || []), fileId]);
          this.fileNames.update(fn => ({ ...fn, [qId]: [...(fn[qId] || []), file.name] }));
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Erro no upload', detail: file.name }),
      });
    }
  }

  removeFile(qId: string, index: number): void {
    const ids = [...(this.answers()[qId] || [])];
    ids.splice(index, 1);
    this.setAnswer(qId, ids);
    const names = [...(this.fileNames()[qId] || [])];
    names.splice(index, 1);
    this.fileNames.update(fn => ({ ...fn, [qId]: names }));
  }

  // ── Visibility / Conditions ───────────────────────────────────────────────

  isVisible(q: Question): boolean {
    if (!q.conditions?.rules?.length) return true;
    const results = q.conditions.rules.map(r => this.evalRule(r));
    return q.conditions.operator === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  }

  private evalRule(rule: ConditionRule): boolean {
    if (!rule.questionId) return true;
    const actual = this.answers()[rule.questionId];
    const expected = rule.value;
    switch (rule.operator) {
      case 'equals':       return String(actual ?? '') === String(expected ?? '');
      case 'not_equals':   return String(actual ?? '') !== String(expected ?? '');
      case 'contains':     return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
      case 'greater_than': return Number(actual) > Number(expected);
      case 'less_than':    return Number(actual) < Number(expected);
      case 'gte':          return Number(actual) >= Number(expected);
      case 'lte':          return Number(actual) <= Number(expected);
      case 'is_empty':     return !actual || (Array.isArray(actual) && !actual.length);
      case 'is_not_empty': return !!actual && !(Array.isArray(actual) && !actual.length);
      default:             return true;
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    // Valida questões visíveis (exceto primary, que já foi respondida)
    const newErrors: Record<string, string> = {};
    const primary = this.primaryQuestion();

    if (primary && !this.answers()[primary.id]) {
      newErrors[primary.id] = 'Campo obrigatório';
    }

    for (const q of this.visibleSecondary()) {
      if (q.type === 'statement') continue;
      const val = this.answers()[q.id];
      const empty = val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length);
      if (q.required && empty) {
        newErrors[q.id] = 'Campo obrigatório';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      this.errors.set(newErrors);
      return;
    }

    this.clearTimers();
    this.kioskState.set('submitting');

    const form = this.formData();
    const payload: Record<string, any> = {};

    for (const q of this.allQuestions()) {
      if (!this.isVisible(q) && q !== primary) continue;
      if (q.type === 'statement') continue;
      const val = this.answers()[q.id];
      if (val !== undefined && val !== null && val !== '') {
        let formatted = val;
        if (q.type === 'date' && val instanceof Date) {
          formatted = val.toISOString().split('T')[0];
        }
        if (q.type === 'number' && ['cpf', 'cnpj'].includes(q.numberConfig?.documentType ?? '')) {
          formatted = String(val).replace(/\D/g, '');
        }
        payload[q.id] = { type: q.type, value: formatted };
      }
    }

    this.formApi.submitResponse(form.formId, {
      formVersionId: form.formVersionId,
      payload,
      metadata: {
        startedAt: this.startedAt.toISOString(),
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
    }, this.respondentToken() ?? undefined).subscribe({
      next: () => this.showThanks(),
      error: (err) => {
        this.kioskState.set('form');
        const code = err.error?.error;
        const msg = code === 'FORM_RESPONSE_LIMIT_REACHED'
          ? 'Este formulário atingiu o limite máximo de respostas.'
          : (err.error?.message ?? 'Erro ao enviar avaliação');
        this.toast.add({ severity: 'error', summary: 'Erro', detail: msg, life: 5000 });
      },
    });
  }

  // ── Thanks & Reset ────────────────────────────────────────────────────────

  private showThanks(): void {
    const delay = this.resetDelay();
    this.countdown.set(delay);
    this.kioskState.set('thanks');

    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current <= 1) {
        this.resetKiosk();
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  resetKiosk(): void {
    this.clearTimers();
    this.answers.set({});
    this.errors.set({});
    this.fileNames.set({});
    this.autoSubmitProgress.set(0);
    this.autoSubmitTransition.set('none');
    this.startedAt = new Date();
    this.kioskState.set('form');
  }

  private clearTimers(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
    if (this.autoSubmitTimeout) {
      clearTimeout(this.autoSubmitTimeout);
      this.autoSubmitTimeout = undefined;
    }
    if (this.autoSubmitProgressTimeout) {
      clearTimeout(this.autoSubmitProgressTimeout);
      this.autoSubmitProgressTimeout = undefined;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  starsRange(): number[] {
    const max = this.primaryQuestion()?.ratingConfig?.max ?? 5;
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  scaleRange(min: number, max: number): number[] {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
}
