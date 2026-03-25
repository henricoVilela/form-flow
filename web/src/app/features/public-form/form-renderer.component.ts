import { Component, inject, OnInit, signal, computed, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { UploadApiService } from '@core/api/upload-api.service';
import { FormApiService, PublicFormResponse } from '@core/api/form-api.service';
import { QuestionFieldComponent, RendererQuestion } from '@shared/question-field/question-field.component';
import { KioskFormRendererComponent } from './kiosk-form-renderer.component';

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

type RendererState = 'loading' | 'password' | 'welcome' | 'form' | 'submitting' | 'success' | 'error' | 'token-error' | 'token-limit' | 'form-limit';

@Component({
  selector: 'app-form-renderer',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, MessageModule, SkeletonModule, ToastModule,
    QuestionFieldComponent, KioskFormRendererComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-center" />

    <div [class]="isKiosk() && state() === 'form' ? '' : 'min-h-screen flex flex-col items-center px-4 pt-10 pb-[60px] bg-gradient-to-b from-surface-100 to-surface-200 max-[480px]:px-2 max-[480px]:pt-4 max-[480px]:pb-10'"
         [attr.style]="themeVars()"
    >

      <!-- ── LOADING ── -->
      @if (state() === 'loading') {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up max-[480px]:p-5 max-[480px]:rounded-xl">
          <p-skeleton height="32px" width="60%" styleClass="mb-4" />
          <p-skeleton height="18px" width="40%" styleClass="mb-8" />
          <p-skeleton height="48px" styleClass="mb-4" />
          <p-skeleton height="48px" styleClass="mb-4" />
          <p-skeleton height="48px" />
        </div>
      }

      <!-- ── ERROR ── -->
      @if (state() === 'error') {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up text-center py-16 max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 flex items-center justify-center">
            <i class="pi pi-exclamation-triangle text-2xl text-red-400"></i>
          </div>
          <h2 class="text-xl font-display font-bold text-surface-900 mb-2">Formulário não encontrado</h2>
          <p class="text-sm text-surface-500">Este formulário não existe, não está publicado ou expirou.</p>
        </div>
      }

      <!-- ── TOKEN INVÁLIDO ── -->
      @if (state() === 'token-error') {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up text-center py-16 max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 flex items-center justify-center">
            <i class="pi pi-ban text-2xl text-red-400"></i>
          </div>
          <h2 class="text-xl font-display font-bold text-surface-900 mb-2">Link inválido</h2>
          <p class="text-sm text-surface-500">Este link de acesso não é válido ou foi desativado.</p>
        </div>
      }

      <!-- ── LIMITE ATINGIDO (respondente) ── -->
      @if (state() === 'token-limit') {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up text-center py-16 max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-50 flex items-center justify-center">
            <i class="pi pi-lock text-2xl text-amber-400"></i>
          </div>
          <h2 class="text-xl font-display font-bold text-surface-900 mb-2">Limite atingido</h2>
          <p class="text-sm text-surface-500">O número máximo de respostas para este acesso já foi atingido.</p>
        </div>
      }

      <!-- ── LIMITE GLOBAL DO FORMULÁRIO ── -->
      @if (state() === 'form-limit') {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up text-center py-16 max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-50 flex items-center justify-center">
            <i class="pi pi-ban text-2xl text-amber-400"></i>
          </div>
          <h2 class="text-xl font-display font-bold text-surface-900 mb-2">Formulário encerrado</h2>
          <p class="text-sm text-surface-500">Este formulário atingiu o limite máximo de respostas e não está mais aceitando novas submissões.</p>
        </div>
      }

      <!-- ── PASSWORD ── -->
      @if (state() === 'password') {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary-50 flex items-center justify-center">
            <i class="pi pi-lock text-2xl text-primary-500"></i>
          </div>
          <h2 class="text-xl font-display font-bold text-surface-900 mb-2 text-center">Formulário protegido</h2>
          <p class="text-sm text-surface-500 mb-6 text-center">Digite a senha para acessar este formulário.</p>
          <div class="flex flex-col gap-3">
            <input pInputText type="password" class="w-full" placeholder="Senha de acesso"
                   [(ngModel)]="passwordInput"
                   (keydown.enter)="submitPassword()" />
            @if (passwordError()) {
              <p-message severity="error" [text]="passwordError()!" styleClass="w-full" />
            }
            <button pButton label="Acessar" icon="pi pi-arrow-right" iconPos="right"
                    [loading]="passwordChecking()"
                    (click)="submitPassword()"></button>
          </div>
        </div>
      }

      <!-- ── WELCOME ── -->
      @if (state() === 'welcome' && formData()) {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up text-center max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary-50 flex items-center justify-center">
            <i class="pi pi-file-edit text-2xl text-primary-500"></i>
          </div>
          <h1 class="text-2xl font-display font-bold text-surface-900 mb-2">{{ formData()!.title }}</h1>
          @if (formData()!.description) {
            <p class="text-sm text-surface-500 mb-4 max-w-md mx-auto">{{ formData()!.description }}</p>
          }
          @if (formData()!.welcomeMessage) {
            <p class="text-sm text-surface-600 mb-6 max-w-md mx-auto whitespace-pre-line">{{ formData()!.welcomeMessage }}</p>
          }
          <button pButton label="Começar" icon="pi pi-arrow-right" iconPos="right" (click)="startForm()"></button>
        </div>
      }

      <!-- ── FORM: Kiosk ── -->
      @if (state() === 'form' && formData() && isKiosk()) {
        <app-kiosk-form-renderer
          [formData]="formData()!"
          [respondentToken]="respondentToken"
        />
      }

      <!-- ── FORM: Normal ── -->
      @if (state() === 'form' && formData() && !isKiosk()) {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="mb-2">
            <h1 class="text-xl font-display font-bold text-surface-900">{{ formData()!.title }}</h1>
            @if (!isSinglePage() && sections().length > 1) {
              <p class="text-xs text-surface-400 mt-1">Seção {{ currentStep() + 1 }} de {{ sections().length }}</p>
            }
          </div>

          @if (!isSinglePage() && sections().length > 1) {
            <div class="h-1 bg-surface-200 rounded-sm mb-6">
              <div class="h-full bg-primary-600 rounded-sm transition-[width] duration-[350ms]" [style.width.%]="progressPercent()"></div>
            </div>
          }

          <!-- Sections (SINGLE_PAGE = all, MULTI_STEP = current) -->
          @for (section of visibleSections(); track section.id) {
              @if (sections().length > 1 && section.title) {
                <div class="bg-surface-50 rounded-xl px-[18px] py-[14px] mb-6 mt-2">
                  <h2 class="text-base font-semibold text-surface-800">{{ section.title }}</h2>
                  @if (section.description) {
                    <p class="text-sm text-surface-500 mt-0.5">{{ section.description }}</p>
                  }
                </div>
              }
              @for (q of section.questions; track q.id) {
                @if (isVisible(q)) {
                  <div class="mb-6">
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
              }
          }

          <!-- Nav -->
          <div class="flex items-center justify-between pt-6 border-t border-surface-200 mt-2">
            @if (isSinglePage()) {
              <span></span>
              <button pButton label="Enviar resposta" icon="pi pi-check" [loading]="state() === 'submitting'" (click)="onSubmit()"></button>
            } @else {
              @if (currentStep() > 0) {
                <button pButton label="Anterior" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (click)="prevStep()"></button>
              } @else {
                <span></span>
              }
              @if (currentStep() < sections().length - 1) {
                <button pButton label="Próximo" icon="pi pi-arrow-right" iconPos="right" (click)="nextStep()"></button>
              } @else {
                <button pButton label="Enviar resposta" icon="pi pi-check" [loading]="state() === 'submitting'" (click)="onSubmit()"></button>
              }
            }
          </div>
        </div>
      }

      <!-- ── SUCCESS ── -->
      @if (state() === 'success' && !isKiosk()) {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up text-center max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <i class="pi pi-check-circle text-3xl text-emerald-500"></i>
          </div>
          <h2 class="text-2xl font-display font-bold text-surface-900 mb-2">Resposta enviada!</h2>
          @if (formData()?.thankYouMessage) {
            <p class="text-sm text-surface-600 mb-6 max-w-md mx-auto whitespace-pre-line">{{ formData()!.thankYouMessage }}</p>
          } @else {
            <p class="text-sm text-surface-500 mb-6">Obrigado por preencher o formulário.</p>
          }
          @if (!respondentToken) {
            <button pButton label="Enviar outra resposta" icon="pi pi-refresh" severity="secondary" [outlined]="true" (click)="resetForm()"></button>
          }
        </div>
      }

      <!-- Branding (oculto no kiosk — o renderer kiosk tem o próprio) -->
      @if (!isKiosk()) {
      <div class="flex items-center gap-1.5 mt-6 opacity-70">
        <span class="text-xs text-surface-400">Criado com</span>
        <div class="flex items-center gap-1.5">
          <div class="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
            <i class="pi pi-bolt text-white"></i>
          </div>
          <span class="text-sm font-semibold text-surface-500">FormFlow</span>
        </div>
      </div>
      }
    </div>
  `,
  styles: [],
})
export class FormRendererComponent implements OnInit {
  private readonly formApi = inject(FormApiService);
  private readonly uploadApi = inject(UploadApiService);
  private readonly toast = inject(MessageService);
  private readonly route = inject(ActivatedRoute);

  readonly formId = input.required<string>();

  readonly state = signal<RendererState>('loading');
  readonly formData = signal<PublicFormResponse | null>(null);
  readonly sections = signal<Section[]>([]);
  readonly answers = signal<Record<string, any>>({});
  readonly errors = signal<Record<string, string>>({});
  readonly currentStep = signal(0);
  readonly fileNames = signal<Record<string, string[]>>({});
  readonly startedAt = new Date();

  passwordInput = '';
  readonly passwordError = signal<string | null>(null);
  readonly passwordChecking = signal(false);
  readonly pendingPrimaryColor = signal<string | null>(null);
  respondentToken: string | null = null;

  readonly isSinglePage = computed(() => this.formData()?.layout === 'SINGLE_PAGE');
  readonly isKiosk = computed(() => this.formData()?.layout === 'KIOSK');

  readonly themeVars = computed(() => {
    const color = (this.formData()?.schema?.settings?.theme?.primaryColor as string | undefined)
      ?? this.pendingPrimaryColor()
      ?? undefined;
    if (!color) return null;
    return [
      `--ff-primary:${color}`,
      `--p-button-primary-background:${color}`,
      `--p-button-primary-hover-background:${color}`,
      `--p-button-primary-active-background:${color}`,
      `--p-button-primary-border-color:${color}`,
      `--p-button-primary-hover-border-color:${color}`,
      `--p-button-primary-active-border-color:${color}`,
      `--p-primary-color:${color}`,
    ].join(';');
  });
  readonly currentSection = computed(() => this.sections()[this.currentStep()] ?? null);
  readonly progressPercent = computed(() => {
    const total = this.sections().length;
    return total <= 1 ? 100 : ((this.currentStep() + 1) / total) * 100;
  });

  readonly visibleSections = computed(() =>
    this.isSinglePage()
      ? this.sections()
      : (this.currentSection() ? [this.currentSection()!] : [])
  );

  private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  ngOnInit(): void {
    this.respondentToken = this.route.snapshot.queryParamMap.get('t');
    this.loadMeta();
    this.loadForm();
  }

  private loadMeta(): void {
    const id = this.formId();
    const request$ = this.UUID_REGEX.test(id)
      ? this.formApi.getPublicFormMeta(id)
      : this.formApi.getPublicFormMetaBySlug(id);
    request$.subscribe({
      next: (meta) => {
        if (meta.primaryColor) this.pendingPrimaryColor.set(meta.primaryColor);
      },
      error: () => { /* silent — meta is best-effort */ },
    });
  }

  private loadForm(password?: string): void {
    const id = this.formId();
    const request$ = this.UUID_REGEX.test(id)
      ? this.formApi.getPublicForm(id, password, this.respondentToken ?? undefined)
      : this.formApi.getPublicFormBySlug(id, password, this.respondentToken ?? undefined);

    request$.subscribe({
      next: (data) => {
        this.formData.set(data);
        this.sections.set((data.schema?.sections ?? []).filter((s: any) => s.questions?.length > 0));
        this.passwordChecking.set(false);
        // Kiosk nunca mostra welcome — vai direto para o formulário
        const showWelcome = data.layout !== 'KIOSK' && (!!data.welcomeMessage || !!data.description);
        this.state.set(showWelcome ? 'welcome' : 'form');
      },
      error: (err) => {
        this.passwordChecking.set(false);
        const code = err.error?.error;
        if (err.status === 401 && code === 'PASSWORD_REQUIRED') {
          this.state.set('password');
        } else if (err.status === 403 && code === 'WRONG_PASSWORD') {
          this.passwordError.set('Senha incorreta. Tente novamente.');
        } else if (code === 'TOKEN_INVALID') {
          this.state.set('token-error');
        } else if (code === 'RESPONDENT_LIMIT_REACHED') {
          this.state.set('token-limit');
        } else if (code === 'FORM_RESPONSE_LIMIT_REACHED') {
          this.state.set('form-limit');
        } else {
          this.state.set('error');
        }
      },
    });
  }

  submitPassword(): void {
    if (!this.passwordInput.trim()) return;
    this.passwordError.set(null);
    this.passwordChecking.set(true);
    this.loadForm(this.passwordInput);
  }

  startForm(): void { this.state.set('form'); }

  resetForm(): void {
    this.answers.set({}); this.errors.set({}); this.currentStep.set(0); this.fileNames.set({});
    this.state.set('form');
  }

  // ── Answers ──

  setAnswer(qId: string, value: any): void {
    this.answers.update(a => ({ ...a, [qId]: value }));
    if (this.errors()[qId]) {
      this.errors.update(e => { const c = { ...e }; delete c[qId]; return c; });
    }
  }

  // ── File upload ──

  uploadFiles(qId: string, files: File[]): void {
    for (const file of files) {
      this.uploadApi.uploadFile(this.formId(), file).subscribe({
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

  // ── Conditions ──

  isVisible(q: Question): boolean {
    if (!q.conditions?.rules?.length) return true;
    const results = q.conditions.rules.map(r => this.evalRule(r));
    return q.conditions.operator === 'AND' ? results.every(r => r) : results.some(r => r);
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
      case 'is_empty':     return !actual || (Array.isArray(actual) && !actual.length);
      case 'is_not_empty': return !!actual && !(Array.isArray(actual) && !actual.length);
      default:             return true;
    }
  }

  // ── Validation ──

  private validateStep(): boolean {
    const section = this.currentSection();
    if (!section) return true;
    const newErrors: Record<string, string> = {};
    for (const q of section.questions) {
      if (!this.isVisible(q) || q.type === 'statement') continue;
      const err = this.validateQuestion(q);
      if (err) newErrors[q.id] = err;
    }
    this.errors.set(newErrors);
    return !Object.keys(newErrors).length;
  }

  private validateAll(): boolean {
    const newErrors: Record<string, string> = {};
    for (const section of this.sections()) {
      for (const q of section.questions) {
        if (!this.isVisible(q) || q.type === 'statement') continue;
        const err = this.validateQuestion(q);
        if (err) newErrors[q.id] = err;
      }
    }
    this.errors.set(newErrors);
    return !Object.keys(newErrors).length;
  }

  private validateQuestion(q: Question): string | null {
    const val = this.answers()[q.id];
    if (q.type === 'matrix' && q.matrixConfig) {
      const rowCount = q.matrixConfig.rows.length;
      const answered = val && typeof val === 'object' ? Object.keys(val).length : 0;
      if (q.required && answered < rowCount) return 'Responda todas as linhas';
      return null;
    }
    const empty = val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length);
    if (q.required && empty) return 'Campo obrigatório';
    if (empty) return null;
    const v = q.validations ?? {};
    const str = String(val ?? '');
    if (['short_text','long_text','email','phone','url'].includes(q.type)) {
      if (v.minLength && str.length < v.minLength) return `Mínimo ${v.minLength} caracteres`;
      if (v.maxLength && str.length > v.maxLength) return `Máximo ${v.maxLength} caracteres`;
      if (v.pattern) { try { if (!new RegExp(v.pattern).test(str)) return v.patternMessage || 'Formato inválido'; } catch {} }
    }
    if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'E-mail inválido';
    if (q.type === 'phone' && !/^[+]?[0-9\s\-().]{7,20}$/.test(str)) return 'Telefone inválido';
    if (q.type === 'url' && !/^https?:\/\/.+/.test(str)) return 'URL inválida';
    if (q.type === 'number') {
      if ((q.numberConfig?.documentType ?? 'none') === 'none') {
        if (isNaN(Number(val))) return 'Valor numérico inválido';
        if (v.min !== undefined && Number(val) < v.min) return `Mínimo: ${v.min}`;
        if (v.max !== undefined && Number(val) > v.max) return `Máximo: ${v.max}`;
      }
    }
    if (q.type === 'multi_choice' && Array.isArray(val)) {
      if (v.minSelections && val.length < v.minSelections) return `Selecione no mínimo ${v.minSelections}`;
      if (v.maxSelections && val.length > v.maxSelections) return `Selecione no máximo ${v.maxSelections}`;
    }
    return null;
  }

  hasError(qId: string): boolean { return !!this.errors()[qId]; }
  getError(qId: string): string { return this.errors()[qId] ?? ''; }

  // ── Nav ──

  nextStep(): void {
    if (this.validateStep()) {
      this.currentStep.update(s => Math.min(s + 1, this.sections().length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    this.errors.set({});
    this.currentStep.update(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Submit ──

  onSubmit(): void {
    const valid = this.isSinglePage() ? this.validateAll() : this.validateStep();
    if (!valid) return;
    const form = this.formData()!;
    this.state.set('submitting');

    const allQuestions = this.sections().flatMap(s => s.questions);
    const payload: Record<string, any> = {};
    for (const q of allQuestions) {
      if (!this.isVisible(q) || q.type === 'statement') continue;
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
    }, this.respondentToken ?? undefined).subscribe({
      next: () => this.state.set('success'),
      error: (err) => {
        const code = err.error?.error;
        if (code === 'FORM_RESPONSE_LIMIT_REACHED') {
          this.state.set('form-limit');
        } else {
          this.state.set('form');
          this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Erro ao enviar resposta', life: 6000 });
        }
      },
    });
  }

}
