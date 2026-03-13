import { Component, inject, OnInit, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { RatingModule } from 'primeng/rating';
import { InputMaskModule } from 'primeng/inputmask';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { UploadApiService } from '@core/api/upload-api.service';
import { FormApiService, PublicFormResponse } from '@core/api/form-api.service';

interface Section {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

interface Question {
  id: string;
  type: string;
  label: string;
  description: string;
  required: boolean;
  placeholder: string;
  options: { id: string; label: string; value: string }[];
  validations: any;
  conditions: { operator: 'AND' | 'OR'; rules: ConditionRule[] } | null;
  ratingConfig: { max: number; icon: string } | null;
  scaleConfig: { min: number; max: number; minLabel: string; maxLabel: string } | null;
}

interface ConditionRule {
  questionId: string;
  operator: string;
  value: any;
}

type RendererState = 'loading' | 'welcome' | 'form' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-form-renderer',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, TextareaModule, RadioButtonModule,
    CheckboxModule, SelectModule, InputNumberModule, DatePickerModule,
    RatingModule, InputMaskModule, MessageModule, ProgressBarModule, SkeletonModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-center" />

    <div class="min-h-screen flex flex-col items-center px-4 pt-10 pb-[60px] bg-gradient-to-b from-surface-100 to-surface-200 max-[480px]:px-2 max-[480px]:pt-4 max-[480px]:pb-10">

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

      <!-- ── FORM ── -->
      @if (state() === 'form' && formData() && currentSection()) {
        <div class="w-full max-w-[640px] bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] animate-slide-up max-[480px]:p-5 max-[480px]:rounded-xl">
          <div class="mb-2">
            <h1 class="text-xl font-display font-bold text-surface-900">{{ formData()!.title }}</h1>
            @if (sections().length > 1) {
              <p class="text-xs text-surface-400 mt-1">Seção {{ currentStep() + 1 }} de {{ sections().length }}</p>
            }
          </div>

          @if (sections().length > 1) {
            <div class="h-1 bg-surface-200 rounded-sm mb-6">
              <div class="h-full bg-primary-600 rounded-sm transition-[width] duration-[350ms]" [style.width.%]="progressPercent()"></div>
            </div>
          }

          <div>
            @if (currentSection()!.title && sections().length > 1) {
              <div class="bg-surface-50 rounded-xl px-[18px] py-[14px] mb-6">
                <h2 class="text-base font-semibold text-surface-800">{{ currentSection()!.title }}</h2>
                @if (currentSection()!.description) {
                  <p class="text-sm text-surface-500 mt-0.5">{{ currentSection()!.description }}</p>
                }
              </div>
            }

            @for (q of currentSection()!.questions; track q.id) {
              @if (isVisible(q)) {
                <div class="mb-6">
                  @if (q.type !== 'statement') {
                    <label class="block text-[15px] font-medium text-surface-900 mb-2 leading-snug">
                      {{ q.label || 'Pergunta sem título' }}
                      @if (q.required) { <span class="text-red-500">*</span> }
                    </label>
                    @if (q.description) {
                      <p class="text-xs text-surface-400 mb-2">{{ q.description }}</p>
                    }
                  }

                  @switch (q.type) {
                    @case ('short_text') {
                      <input pInputText class="w-full" [placeholder]="q.placeholder || ''"
                             [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)" />
                    }
                    @case ('long_text') {
                      <textarea pTextarea class="w-full" [rows]="4" [placeholder]="q.placeholder || ''"
                                [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)"></textarea>
                    }
                    @case ('email') {
                      <input pInputText type="email" class="w-full" [placeholder]="q.placeholder || 'email&#64;exemplo.com'"
                             [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)" />
                    }
                    @case ('phone') {
                      <p-inputmask mask="(99) 99999-9999" [placeholder]="q.placeholder || '(00) 00000-0000'" styleClass="w-full"
                             [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)" />
                    }
                    @case ('url') {
                      <input pInputText type="url" class="w-full" [placeholder]="q.placeholder || 'https://'"
                             [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)" />
                    }
                    @case ('number') {
                      <p-inputNumber [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)"
                                     [placeholder]="q.placeholder || ''" styleClass="w-full" />
                    }
                    @case ('date') {
                      <p-datepicker [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)"
                                    dateFormat="dd/mm/yy" styleClass="w-full" placeholder="Selecione uma data" />
                    }
                    @case ('single_choice') {
                      <div class="flex flex-col gap-3">
                        @for (opt of q.options; track opt.id) {
                          <div class="flex items-center gap-2">
                            <p-radiobutton [name]="q.id" [value]="opt.value"
                                           [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)" />
                            <label class="text-sm text-surface-700 cursor-pointer">{{ opt.label }}</label>
                          </div>
                        }
                      </div>
                    }
                    @case ('multi_choice') {
                      <div class="flex flex-col gap-3">
                        @for (opt of q.options; track opt.id) {
                          <div class="flex items-center gap-2">
                            <p-checkbox [value]="opt.value"
                                        [ngModel]="answers()[q.id] || []"
                                        (ngModelChange)="setAnswer(q.id, $event)" />
                            <label class="text-sm text-surface-700 cursor-pointer">{{ opt.label }}</label>
                          </div>
                        }
                      </div>
                    }
                    @case ('dropdown') {
                      <p-select [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)"
                                [options]="q.options" optionLabel="label" optionValue="value"
                                placeholder="Selecione uma opção" styleClass="w-full" />
                    }
                    @case ('file_upload') {
                      <div class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-surface-200 rounded-xl cursor-pointer transition-all duration-200 hover:border-primary-300 hover:bg-surface-50"
                        (click)="fileInput.click()"
                        (dragover)="$event.preventDefault()"
                        (drop)="onFileDrop($event, q.id)">
                        <input #fileInput type="file" hidden [multiple]="true" (change)="onFileSelect($event, q.id)" />
                        <i class="pi pi-cloud-upload text-2xl text-surface-300 mb-2"></i>
                        <p class="text-sm text-surface-500">Arraste arquivos ou clique para enviar</p>
                        @if (q.validations?.maxFiles) {
                          <p class="text-xs text-surface-400 mt-1">Máx. {{ q.validations.maxFiles }} arquivos</p>
                        }
                      </div>
                      @if (hasFilesNames(q.id)) {
                        <div class="mt-2 space-y-1">
                          @for (fname of fileNames()[q.id]; track fname; let fi = $index) {
                            <div class="flex items-center gap-2 text-[13px] text-surface-500 bg-surface-50 rounded-lg px-3 py-2">
                              <i class="pi pi-file text-xs text-surface-400"></i>
                              <span class="flex-1 truncate">{{ fname }}</span>
                              <button class="bg-transparent border-0 p-0 text-surface-400 cursor-pointer transition-colors duration-150 hover:text-red-500 leading-none" (click)="removeFile(q.id, fi)">
                                <i class="pi pi-times text-xs"></i>
                              </button>
                            </div>
                          }
                        </div>
                      }
                    }
                    @case ('rating') {
                      <p-rating [ngModel]="answers()[q.id]" (ngModelChange)="setAnswer(q.id, $event)" [stars]="q.ratingConfig?.max ?? 5"/>
                    }
                    @case ('scale') {
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-surface-500 shrink-0">{{ q.scaleConfig?.minLabel }}</span>
                        <div class="flex gap-1.5 flex-1 justify-center flex-wrap">
                          @for (n of scaleRange(q.scaleConfig?.min ?? 1, q.scaleConfig?.max ?? 10); track n) {
                            <button class="w-10 h-10 flex items-center justify-center border-[1.5px] rounded-[10px] text-sm font-medium cursor-pointer transition-all duration-150 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50"
                                    [ngClass]="answers()[q.id] === n
                                      ? 'bg-primary-600 text-white border-primary-600 scale-[1.08]'
                                      : 'bg-white border-surface-200 text-surface-500'"
                                    (click)="setAnswer(q.id, n)">{{ n }}</button>
                          }
                        </div>
                        <span class="text-xs text-surface-500 shrink-0">{{ q.scaleConfig?.maxLabel }}</span>
                      </div>
                    }
                    @case ('statement') {
                      <div class="flex gap-2.5 px-[18px] py-[14px] bg-primary-50 rounded-[10px]">
                        <i class="pi pi-info-circle text-primary-400 shrink-0 mt-0.5"></i>
                        <span class="text-sm text-surface-600">{{ q.label }}</span>
                      </div>
                    }
                  }

                  @if (hasError(q.id)) {
                    <p-message severity="error" [text]="getError(q.id)" styleClass="mt-2 w-full" />
                  }
                </div>
              }
            }
          </div>

          <!-- Nav -->
          <div class="flex items-center justify-between pt-6 border-t border-surface-200 mt-2">
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
          </div>
        </div>
      }

      <!-- ── SUCCESS ── -->
      @if (state() === 'success') {
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
          <button pButton label="Enviar outra resposta" icon="pi pi-refresh" severity="secondary" [outlined]="true" (click)="resetForm()"></button>
        </div>
      }

      <!-- Branding -->
      <div class="flex items-center gap-1.5 mt-6 opacity-70">
        <span class="text-xs text-surface-400">Criado com</span>
        <div class="flex items-center gap-1.5">
          <div class="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
            <i class="pi pi-bolt text-white"></i>
          </div>
          <span class="text-sm font-semibold text-surface-500">FormFlow</span>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class FormRendererComponent implements OnInit {
  private readonly formApi = inject(FormApiService);
  private readonly uploadApi = inject(UploadApiService);
  private readonly toast = inject(MessageService);

  readonly formId = input.required<string>();

  readonly state = signal<RendererState>('loading');
  readonly formData = signal<PublicFormResponse | null>(null);
  readonly sections = signal<Section[]>([]);
  readonly answers = signal<Record<string, any>>({});
  readonly errors = signal<Record<string, string>>({});
  readonly currentStep = signal(0);
  readonly fileNames = signal<Record<string, string[]>>({});
  readonly startedAt = new Date();

  readonly currentSection = computed(() => this.sections()[this.currentStep()] ?? null);
  readonly progressPercent = computed(() => {
    const total = this.sections().length;
    return total <= 1 ? 100 : ((this.currentStep() + 1) / total) * 100;
  });

  ngOnInit(): void {
    this.formApi.getPublicForm(this.formId()).subscribe({
      next: (data) => {
        this.formData.set(data);
        this.sections.set((data.schema?.sections ?? []).filter((s: any) => s.questions?.length > 0));
        this.state.set(data.welcomeMessage || data.description ? 'welcome' : 'form');
      },
      error: () => this.state.set('error'),
    });
  }

  hasFilesNames(qId: string): boolean {
    return !!this.fileNames()[qId]?.length;
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

  isSelected(qId: string, value: string): boolean {
    const arr = this.answers()[qId];
    return arr && Array.isArray(arr) && arr.includes(value);
  }

  toggleMulti(qId: string, value: string): void {
    const current: string[] = this.answers()[qId] || [];
    this.setAnswer(qId, current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  }

  // ── File upload ──

  onFileSelect(event: Event, qId: string): void {
    event.preventDefault();
    const files = (event.target as HTMLInputElement).files;
    if (files) this.uploadFiles(qId, Array.from(files));
  }

  onFileDrop(event: DragEvent, qId: string): void {
    event.preventDefault();
    if (event.dataTransfer?.files) this.uploadFiles(qId, Array.from(event.dataTransfer.files));
  }

  private uploadFiles(qId: string, files: File[]): void {
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

  private validateQuestion(q: Question): string | null {
    const val = this.answers()[q.id];
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
      if (isNaN(Number(val))) return 'Valor numérico inválido';
      if (v.min !== undefined && Number(val) < v.min) return `Mínimo: ${v.min}`;
      if (v.max !== undefined && Number(val) > v.max) return `Máximo: ${v.max}`;
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
    if (!this.validateStep()) return;
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
    }).subscribe({
      next: () => this.state.set('success'),
      error: (err) => {
        this.state.set('form');
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.message ?? 'Erro ao enviar resposta', life: 6000 });
      },
    });
  }

  scaleRange(min: number, max: number): number[] {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
}
