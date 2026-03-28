import {
  Component, inject, input, signal, computed, OnDestroy, OnInit, HostBinding,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { FormApiService, PublicFormResponse } from '@core/api/form-api.service';
import { QuestionFieldComponent, RendererQuestion } from '@shared/question-field/question-field.component';
import { UploadApiService } from '@core/api/upload-api.service';

// ── Interfaces ───────────────────────────────────────────────────────────────

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

const EMOJIS_5 = ['😠', '😕', '😐', '🙂', '😄'];

function buildEmojiSet(max: number): string[] {
  if (max === 5) return EMOJIS_5;
  if (max === 3) return ['😠', '😐', '😄'];
  if (max === 4) return ['😕', '😐', '🙂', '😄'];
  return Array.from({ length: max }, (_, i) =>
    EMOJIS_5[Math.round((i / (max - 1)) * (EMOJIS_5.length - 1))]
  );
}

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-kiosk-form-renderer',
  imports: [CommonModule, FormsModule, ButtonModule, ToastModule, TooltipModule, QuestionFieldComponent],
  providers: [MessageService],
  host: { '[class.kiosk-light]': '!isDark()' },
  template: `
    <p-toast position="top-center" />

    <!-- ── FORM STATE ── -->
    @if (kioskState() !== 'thanks') {
      <div class="kiosk-bg min-h-screen flex flex-col items-center justify-center px-6 py-10 relative">

        <!-- Form title -->
        <p class="k-muted text-xs uppercase tracking-[0.2em] mb-6 font-medium">
          {{ formData().title }}
        </p>

        <!-- Hero card -->
        <div class="kiosk-card w-full max-w-2xl text-center">

          <h1 class="k-heading text-2xl sm:text-3xl font-bold leading-snug mb-10 px-2">
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
              <div class="flex justify-between text-sm px-2">
                <span class="k-muted">{{ sc.minLabel }}</span>
                <span class="k-muted">{{ sc.maxLabel }}</span>
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

          <!-- Auto-submit indicator -->
          @if (primaryAnswer() !== null && visibleSecondary().length === 0 && kioskState() !== 'submitting') {
            <div class="mt-8 flex flex-col items-center gap-3">
              <p class="k-muted text-sm">Enviando avaliação…</p>
              <div class="k-progress-track w-48 h-1 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-400 rounded-full"
                  [style.width.%]="autoSubmitProgress()"
                  [style.transition]="autoSubmitTransition()"
                ></div>
              </div>
            </div>
          }

          <!-- Submitting spinner -->
          @if (kioskState() === 'submitting') {
            <div class="mt-8 flex items-center justify-center gap-3 k-muted">
              <i class="pi pi-spin pi-spinner text-xl"></i>
              <span class="text-sm">Registrando…</span>
            </div>
          }
        </div>

        <!-- Conditional questions -->
        @if (primaryAnswer() !== null && visibleSecondary().length > 0) {
          <div class="w-full max-w-2xl mt-6 animate-slide-up">
            <div class="kiosk-secondary-card rounded-2xl p-6 space-y-5">
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

        <!-- Bottom bar: branding + toggle -->
        <div class="absolute bottom-5 left-0 right-0 flex items-center justify-between px-5">
          <!-- Branding -->
          <div class="flex items-center gap-1.5 opacity-30">
            <span class="k-muted text-xs">Criado com</span>
            <div class="flex items-center gap-1">
              <div class="w-5 h-5 bg-primary-500 rounded flex items-center justify-center">
                <i class="pi pi-bolt text-white text-xs"></i>
              </div>
              <span class="k-muted text-xs font-semibold">FormFlow</span>
            </div>
          </div>

          <!-- Theme toggle (apenas quando tema = auto) -->
          @if (themeSetting() === 'auto') {
            <button
              class="kiosk-theme-toggle"
              (click)="toggleTheme()"
              [pTooltip]="isDark() ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
              tooltipPosition="top"
              [attr.aria-label]="isDark() ? 'Tema claro' : 'Tema escuro'"
            >
              <i [class]="isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
            </button>
          }
        </div>
      </div>
    }

    <!-- ── THANKS STATE ── -->
    @if (kioskState() === 'thanks') {
      <div class="thanks-bg min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">

        <!-- Ícone com ripple -->
        <div class="relative flex items-center justify-center mb-10">
          <div class="absolute w-64 h-64 rounded-full thanks-ring" style="animation-delay: 0.9s"></div>
          <div class="absolute w-48 h-48 rounded-full thanks-ring" style="animation-delay: 0s"></div>
          <div class="relative z-10 w-32 h-32 rounded-full thanks-icon-circle flex items-center justify-center thanks-pop-in">
            <i class="pi pi-check thanks-check-color"></i>
          </div>
        </div>

        <h1 class="k-thanks-heading text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          {{ formData().thankYouMessage ? 'Obrigado!' : 'Avaliação enviada!' }}
        </h1>

        @if (formData().thankYouMessage) {
          <p class="k-thanks-body text-lg max-w-sm mb-12 whitespace-pre-line leading-relaxed">
            {{ formData().thankYouMessage }}
          </p>
        } @else {
          <p class="k-thanks-body text-base mb-12 max-w-xs leading-relaxed">
            Sua resposta foi registrada com sucesso.
          </p>
        }

        <div class="k-countdown-track w-56 h-1.5 rounded-full overflow-hidden mb-3">
          <div
            class="k-countdown-bar h-full rounded-full"
            [style.width.%]="countdownPercent()"
            style="transition: width 1s linear"
          ></div>
        </div>
        <p class="k-thanks-faint text-sm mb-10">Nova avaliação em {{ countdown() }}s</p>

        <button
          pButton
          label="Avaliar novamente"
          icon="pi pi-refresh"
          severity="secondary"
          [outlined]="true"
          (click)="resetKiosk()"
        ></button>

        @if (themeSetting() === 'auto') {
          <button
            class="kiosk-theme-toggle absolute bottom-5 right-5"
            (click)="toggleTheme()"
            [attr.aria-label]="isDark() ? 'Tema claro' : 'Tema escuro'"
          >
            <i [class]="isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </button>
        }
      </div>
    }
  `,
  styles: [`
    /* ─────────────────────────────────────────────
       CSS Custom Properties — Dark (padrão)
    ───────────────────────────────────────────── */
    :host {
      --k-bg:              linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      --k-thanks-bg:       linear-gradient(135deg, #064e3b 0%, #065f46 50%, #064e3b 100%);

      --k-heading:         #ffffff;
      --k-muted:           rgba(148,163,184,1);   /* slate-400 */
      --k-body:            rgba(255,255,255,0.70);
      --k-faint:           rgba(255,255,255,0.40);

      --k-card-bg:         rgba(255,255,255,0.04);
      --k-card-border:     rgba(255,255,255,0.08);
      --k-2nd-card-bg:     rgba(255,255,255,0.05);
      --k-2nd-card-border: rgba(255,255,255,0.10);

      --k-emoji-hover:     rgba(255,255,255,0.08);
      --k-emoji-sel-bg:    rgba(255,255,255,0.15);
      --k-emoji-sel-bdr:   rgba(255,255,255,0.40);

      --k-star-empty:      rgba(255,255,255,0.20);

      --k-scale-bdr:       rgba(255,255,255,0.15);
      --k-scale-text:      rgba(255,255,255,0.60);
      --k-scale-hov-bdr:   rgba(255,255,255,0.50);
      --k-scale-hov-text:  #ffffff;
      --k-scale-hov-bg:    rgba(255,255,255,0.08);
      --k-scale-sel-bg:    #ffffff;
      --k-scale-sel-text:  #0f172a;
      --k-scale-sel-bdr:   #ffffff;

      --k-progress-track:  rgba(255,255,255,0.10);

      --k-thanks-heading:    #ffffff;
      --k-thanks-body:       rgba(255,255,255,0.70);
      --k-thanks-faint:      rgba(255,255,255,0.40);
      --k-cdown-track:       rgba(255,255,255,0.20);
      --k-cdown-bar:         rgba(255,255,255,0.70);
      --k-thanks-icon-bg:    rgba(16,185,129,0.25);
      --k-thanks-icon-color: #6ee7b7;
      --k-thanks-ring-bg:    rgba(16,185,129,0.12);

      --k-toggle-bg:       rgba(255,255,255,0.10);
      --k-toggle-text:     rgba(255,255,255,0.55);
      --k-toggle-hov:      rgba(255,255,255,0.18);

      --k-field-label:     rgba(255,255,255,0.85);
      --k-field-hint:      rgba(255,255,255,0.40);
    }

    /* ─────────────────────────────────────────────
       CSS Custom Properties — Light (override)
    ───────────────────────────────────────────── */
    :host.kiosk-light {
      --k-bg:              linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
      --k-thanks-bg:       linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #ecfdf5 100%);

      --k-heading:         #0f172a;
      --k-muted:           #64748b;              /* slate-500 */
      --k-body:            rgba(15,23,42,0.65);
      --k-faint:           rgba(15,23,42,0.38);

      --k-card-bg:         rgba(255,255,255,0.88);
      --k-card-border:     rgba(15,23,42,0.08);
      --k-2nd-card-bg:     rgba(255,255,255,0.92);
      --k-2nd-card-border: rgba(15,23,42,0.10);

      --k-emoji-hover:     rgba(15,23,42,0.05);
      --k-emoji-sel-bg:    rgba(99,102,241,0.08);
      --k-emoji-sel-bdr:   rgba(99,102,241,0.45);

      --k-star-empty:      rgba(15,23,42,0.18);

      --k-scale-bdr:       rgba(15,23,42,0.15);
      --k-scale-text:      rgba(15,23,42,0.55);
      --k-scale-hov-bdr:   rgba(15,23,42,0.40);
      --k-scale-hov-text:  #0f172a;
      --k-scale-hov-bg:    rgba(15,23,42,0.05);
      --k-scale-sel-bg:    #0f172a;
      --k-scale-sel-text:  #ffffff;
      --k-scale-sel-bdr:   #0f172a;

      --k-progress-track:  rgba(15,23,42,0.10);

      --k-thanks-heading:    #064e3b;
      --k-thanks-body:       rgba(6,78,59,0.70);
      --k-thanks-faint:      rgba(6,78,59,0.45);
      --k-cdown-track:       rgba(6,78,59,0.15);
      --k-cdown-bar:         rgba(6,78,59,0.55);
      --k-thanks-icon-bg:    rgba(5,150,105,0.15);
      --k-thanks-icon-color: #059669;
      --k-thanks-ring-bg:    rgba(5,150,105,0.08);

      --k-toggle-bg:       rgba(15,23,42,0.08);
      --k-toggle-text:     rgba(15,23,42,0.50);
      --k-toggle-hov:      rgba(15,23,42,0.13);

      --k-field-label:     rgba(15,23,42,0.85);
      --k-field-hint:      rgba(15,23,42,0.40);
    }

    /* ─────────────────────────────────────────────
       Utility classes que consomem as variáveis
    ───────────────────────────────────────────── */
    .k-heading       { color: var(--k-heading); }
    .k-muted         { color: var(--k-muted); }
    .k-body          { color: var(--k-body); }
    .k-faint         { color: var(--k-faint); }
    .k-thanks-heading{ color: var(--k-thanks-heading); }
    .k-thanks-body   { color: var(--k-thanks-body); }
    .k-thanks-faint  { color: var(--k-thanks-faint); }

    .k-progress-track { background: var(--k-progress-track); }
    .k-countdown-track { background: var(--k-cdown-track); }
    .k-countdown-bar  { background: var(--k-cdown-bar); }

    /* ─────────────────────────────────────────────
       Backgrounds
    ───────────────────────────────────────────── */
    .kiosk-bg    { background: var(--k-bg); }
    .thanks-bg   { background: var(--k-thanks-bg); }

    /* ─────────────────────────────────────────────
       Cards
    ───────────────────────────────────────────── */
    .kiosk-card {
      background:    var(--k-card-bg);
      border:        1px solid var(--k-card-border);
      border-radius: 1.5rem;
      padding:       2.5rem 2rem;
    }
    .kiosk-secondary-card {
      background: var(--k-2nd-card-bg);
      border:     1px solid var(--k-2nd-card-border);
    }

    /* ─────────────────────────────────────────────
       Emoji buttons
    ───────────────────────────────────────────── */
    .kiosk-emoji-btn {
      display:        flex;
      flex-direction: column;
      align-items:    center;
      background:     transparent;
      border:         2px solid transparent;
      border-radius:  1rem;
      padding:        0.5rem 0.6rem;
      cursor:         pointer;
      transition:     all 0.2s ease;
    }
    .kiosk-emoji-btn:hover {
      background:  var(--k-emoji-hover);
      transform:   scale(1.1);
    }
    .kiosk-emoji-btn.selected {
      background:   var(--k-emoji-sel-bg);
      border-color: var(--k-emoji-sel-bdr);
      transform:    scale(1.18);
    }
    .kiosk-emoji-btn.dimmed { opacity: 0.35; }

    .emoji-glyph {
      font-size:   3.5rem;
      line-height: 1;
      display:     block;
    }
    @media (min-width: 640px) {
      .emoji-glyph { font-size: 4.5rem; }
    }

    /* ─────────────────────────────────────────────
       Star buttons
    ───────────────────────────────────────────── */
    .kiosk-star-btn {
      background:  transparent;
      border:      none;
      cursor:      pointer;
      color:       var(--k-star-empty);
      padding:     0.25rem;
      transition:  all 0.15s ease;
      line-height: 1;
    }
    .kiosk-star-btn:hover  { color: #fbbf24; transform: scale(1.15); }
    .kiosk-star-btn.filled { color: #fbbf24; }
    .kiosk-star-btn i { font-size: 2.5rem; }
    @media (min-width: 640px) {
      .kiosk-star-btn i { font-size: 3.5rem; }
    }

    /* ─────────────────────────────────────────────
       Scale buttons
    ───────────────────────────────────────────── */
    .kiosk-scale-btn {
      width:         3.25rem;
      height:        3.25rem;
      border-radius: 0.75rem;
      border:        2px solid var(--k-scale-bdr);
      background:    transparent;
      color:         var(--k-scale-text);
      font-size:     1.1rem;
      font-weight:   600;
      cursor:        pointer;
      transition:    all 0.15s ease;
    }
    .kiosk-scale-btn:hover {
      border-color: var(--k-scale-hov-bdr);
      color:        var(--k-scale-hov-text);
      background:   var(--k-scale-hov-bg);
    }
    .kiosk-scale-btn.selected {
      background:   var(--k-scale-sel-bg);
      color:        var(--k-scale-sel-text);
      border-color: var(--k-scale-sel-bdr);
      transform:    scale(1.1);
    }

    /* ─────────────────────────────────────────────
       Theme toggle button
    ───────────────────────────────────────────── */
    .kiosk-theme-toggle {
      width:         2.25rem;
      height:        2.25rem;
      border-radius: 50%;
      border:        none;
      background:    var(--k-toggle-bg);
      color:         var(--k-toggle-text);
      cursor:        pointer;
      display:       flex;
      align-items:   center;
      justify-content: center;
      transition:    all 0.2s ease;
      font-size:     0.9rem;
    }
    .kiosk-theme-toggle:hover {
      background: var(--k-toggle-hov);
    }

    /* ─────────────────────────────────────────────
       Thanks screen — ícone + animações
    ───────────────────────────────────────────── */
    .thanks-icon-circle {
      background: var(--k-thanks-icon-bg);
    }
    .thanks-check-color {
      color: var(--k-thanks-icon-color);
      font-size: 3.5rem;
    }

    .thanks-ring {
      background: var(--k-thanks-ring-bg);
      animation: k-ripple 2.8s ease-out infinite;
    }

    .thanks-pop-in {
      animation: k-pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    @keyframes k-ripple {
      0%   { transform: scale(0.85); opacity: 0; }
      18%  { opacity: 0.55; }
      100% { transform: scale(1.55); opacity: 0; }
    }

    @keyframes k-pop-in {
      from { transform: scale(0.3); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }

    /* ─────────────────────────────────────────────
       Override PrimeNG question-field colors
    ───────────────────────────────────────────── */
    :host ::ng-deep .kiosk-secondary-card app-question-field label {
      color: var(--k-field-label) !important;
    }
    :host ::ng-deep .kiosk-secondary-card app-question-field p {
      color: var(--k-field-hint) !important;
    }
  `],
})
export class KioskFormRendererComponent implements OnInit, OnDestroy {
  private readonly formApi    = inject(FormApiService);
  private readonly uploadApi  = inject(UploadApiService);
  private readonly toast      = inject(MessageService);

  readonly formData       = input.required<PublicFormResponse>();
  readonly respondentToken = input<string | null>(null);

  readonly kioskState         = signal<KioskState>('form');
  readonly answers            = signal<Record<string, any>>({});
  readonly errors             = signal<Record<string, string>>({});
  readonly fileNames          = signal<Record<string, string[]>>({});
  readonly countdown          = signal(0);
  readonly autoSubmitProgress = signal(0);
  readonly autoSubmitTransition = signal('none');

  // ── Tema ──────────────────────────────────────────────────────────────────

  private readonly systemPrefersDark = signal(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  // Sobrescrita manual (só usada quando tema = 'auto')
  private readonly manualDark = signal<boolean | null>(null);

  readonly themeSetting = computed<'auto' | 'light' | 'dark'>(() =>
    (this.formData().schema?.settings?.kioskSettings?.theme ?? 'auto') as 'auto' | 'light' | 'dark'
  );

  readonly isDark = computed(() => {
    const setting = this.themeSetting();
    if (setting === 'dark')  return true;
    if (setting === 'light') return false;
    // 'auto': usa override manual ou preferência do sistema
    return this.manualDark() ?? this.systemPrefersDark();
  });

  toggleTheme(): void {
    this.manualDark.set(!this.isDark());
  }

  // ── Outros signals ────────────────────────────────────────────────────────

  private startedAt = new Date();
  private countdownInterval?: ReturnType<typeof setInterval>;
  private autoSubmitTimeout?: ReturnType<typeof setTimeout>;
  private mediaQuery?: MediaQueryList;
  private mediaQueryListener = (e: MediaQueryListEvent) => {
    this.systemPrefersDark.set(e.matches);
  };

  // ── Schema parseado ───────────────────────────────────────────────────────

  readonly sections = computed<Section[]>(() => {
    const raw: any[] = this.formData().schema?.sections ?? [];
    return raw
      .filter((s: any) => s.questions?.length > 0)
      .map((s: any) => ({
        id:          s.id,
        title:       s.title ?? '',
        description: s.description ?? '',
        questions:   (s.questions ?? []).map((q: any): Question => ({
          id:           q.id,
          type:         q.type,
          label:        q.label ?? '',
          description:  q.description ?? '',
          required:     q.required ?? false,
          placeholder:  q.placeholder ?? '',
          options:      q.options ?? [],
          validations:  q.validations ?? {},
          conditions:   q.conditions ?? null,
          ratingConfig: q.ratingConfig ?? null,
          scaleConfig:  q.scaleConfig ?? null,
          numberConfig: q.numberConfig ?? null,
          matrixConfig: q.matrixConfig ?? null,
        })),
      }));
  });

  readonly allQuestions = computed<Question[]>(() =>
    this.sections().flatMap(s => s.questions)
  );

  readonly primaryQuestion = computed<Question | null>(() =>
    this.allQuestions().find(q => q.type === 'rating' || q.type === 'scale') ?? null
  );

  readonly primaryAnswer = computed<number | null>(() => {
    const q = this.primaryQuestion();
    return q ? (this.answers()[q.id] ?? null) : null;
  });

  readonly secondaryQuestions = computed<Question[]>(() => {
    const primary = this.primaryQuestion();
    return this.allQuestions().filter(q => q.id !== primary?.id && q.type !== 'statement');
  });

  readonly visibleSecondary = computed<Question[]>(() => {
    if (this.primaryAnswer() === null) return [];
    return this.secondaryQuestions().filter(q => this.isVisible(q));
  });

  readonly isEmojiRating = computed(() =>
    this.primaryQuestion()?.ratingConfig?.icon === 'emoji'
  );

  readonly emojiSet = computed(() =>
    buildEmojiSet(this.primaryQuestion()?.ratingConfig?.max ?? 5)
  );

  readonly resetDelay = computed(() =>
    this.formData().schema?.settings?.kioskSettings?.resetDelay ?? 5
  );

  readonly countdownPercent = computed(() => {
    const total = this.resetDelay();
    return total <= 0 ? 0 : (this.countdown() / total) * 100;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', this.mediaQueryListener);
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.mediaQuery?.removeEventListener('change', this.mediaQueryListener);
  }

  // ── Seleção primária ──────────────────────────────────────────────────────

  onPrimarySelect(value: number): void {
    if (this.kioskState() === 'submitting') return;
    const q = this.primaryQuestion();
    if (!q) return;

    this.clearTimers();
    this.autoSubmitProgress.set(0);
    this.autoSubmitTransition.set('none');

    this.answers.update(a => ({ ...a, [q.id]: value }));
    this.errors.update(e => { const c = { ...e }; delete c[q.id]; return c; });

    setTimeout(() => {
      if (this.visibleSecondary().length === 0) {
        this.autoSubmitTransition.set('width 1.5s linear');
        this.autoSubmitProgress.set(100);
        this.autoSubmitTimeout = setTimeout(() => this.onSubmit(), 1500);
      }
    }, 30);
  }

  // ── Respostas secundárias ─────────────────────────────────────────────────

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
    const ids = [...(this.answers()[qId] || [])]; ids.splice(index, 1); this.setAnswer(qId, ids);
    const names = [...(this.fileNames()[qId] || [])]; names.splice(index, 1);
    this.fileNames.update(fn => ({ ...fn, [qId]: names }));
  }

  // ── Condições ─────────────────────────────────────────────────────────────

  isVisible(q: Question): boolean {
    if (!q.conditions?.rules?.length) return true;
    const results = q.conditions.rules.map(r => this.evalRule(r));
    return q.conditions.operator === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  }

  private evalRule(rule: ConditionRule): boolean {
    if (!rule.questionId) return true;
    const actual   = this.answers()[rule.questionId];
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
    const primary    = this.primaryQuestion();
    const newErrors: Record<string, string> = {};

    if (primary && !this.answers()[primary.id]) {
      newErrors[primary.id] = 'Campo obrigatório';
    }
    for (const q of this.visibleSecondary()) {
      if (q.type === 'statement') continue;
      const val = this.answers()[q.id];
      const empty = val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length);
      if (q.required && empty) newErrors[q.id] = 'Campo obrigatório';
    }
    if (Object.keys(newErrors).length > 0) { this.errors.set(newErrors); return; }

    this.clearTimers();
    this.kioskState.set('submitting');

    const form    = this.formData();
    const payload: Record<string, any> = {};

    for (const q of this.allQuestions()) {
      if (q.id !== primary?.id && !this.isVisible(q)) continue;
      if (q.type === 'statement') continue;
      const val = this.answers()[q.id];
      if (val !== undefined && val !== null && val !== '') {
        let formatted = val;
        if (q.type === 'date' && val instanceof Date) formatted = val.toISOString().split('T')[0];
        if (q.type === 'number' && ['cpf', 'cnpj'].includes(q.numberConfig?.documentType ?? ''))
          formatted = String(val).replace(/\D/g, '');
        payload[q.id] = { type: q.type, value: formatted };
      }
    }

    this.formApi.submitResponse(form.formId, {
      formVersionId: form.formVersionId,
      payload,
      metadata: {
        startedAt:   this.startedAt.toISOString(),
        submittedAt: new Date().toISOString(),
        userAgent:   navigator.userAgent,
      },
    }, this.respondentToken() ?? undefined).subscribe({
      next:  () => this.showThanks(),
      error: (err) => {
        this.kioskState.set('form');
        const msg = err.error?.error === 'FORM_RESPONSE_LIMIT_REACHED'
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
      if (current <= 1) this.resetKiosk();
      else this.countdown.set(current - 1);
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
    if (this.countdownInterval)  { clearInterval(this.countdownInterval);  this.countdownInterval  = undefined; }
    if (this.autoSubmitTimeout)  { clearTimeout(this.autoSubmitTimeout);   this.autoSubmitTimeout  = undefined; }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  starsRange(): number[] {
    return Array.from({ length: this.primaryQuestion()?.ratingConfig?.max ?? 5 }, (_, i) => i + 1);
  }

  scaleRange(min: number, max: number): number[] {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
}
