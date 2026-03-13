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
    RatingModule, MessageModule, ProgressBarModule, SkeletonModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-center" />

    <div class="renderer-page">
      <!-- ── LOADING ── -->
      @if (state() === 'loading') {
        <div class="renderer-card">
          <p-skeleton height="32px" width="60%" styleClass="mb-4" />
          <p-skeleton height="18px" width="40%" styleClass="mb-8" />
          <p-skeleton height="48px" styleClass="mb-4" />
          <p-skeleton height="48px" styleClass="mb-4" />
          <p-skeleton height="48px" />
        </div>
      }

      <!-- ── ERROR ── -->
      @if (state() === 'error') {
        <div class="renderer-card text-center py-16">
          <div class="error-icon">
            <i class="pi pi-exclamation-triangle text-2xl text-red-400"></i>
          </div>
          <h2 class="text-xl font-display font-bold text-surface-900 mb-2">Formulário não encontrado</h2>
          <p class="text-sm text-surface-500">Este formulário não existe, não está publicado ou expirou.</p>
        </div>
      }

      <!-- ── WELCOME ── -->
      @if (state() === 'welcome' && formData()) {
        <div class="renderer-card text-center">
          <div class="welcome-icon">
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
        <div class="renderer-card">
          <div class="renderer-header">
            <h1 class="text-xl font-display font-bold text-surface-900">{{ formData()!.title }}</h1>
            @if (sections().length > 1) {
              <p class="text-xs text-surface-400 mt-1">Seção {{ currentStep() + 1 }} de {{ sections().length }}</p>
            }
          </div>

          @if (sections().length > 1) {
            <div class="renderer-progress">
              <div class="renderer-progress-fill" [style.width.%]="progressPercent()"></div>
            </div>
          }

          <div class="renderer-section">
            @if (currentSection()!.title && sections().length > 1) {
              <div class="section-label">
                <h2 class="text-base font-semibold text-surface-800">{{ currentSection()!.title }}</h2>
                @if (currentSection()!.description) {
                  <p class="text-sm text-surface-500 mt-0.5">{{ currentSection()!.description }}</p>
                }
              </div>
            }

            @for (q of currentSection()!.questions; track q.id) {
              @if (isVisible(q)) {
                <div class="renderer-field">
                  @if (q.type !== 'statement') {
                    <label class="renderer-label">
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
                      <input pInputText type="tel" class="w-full" [placeholder]="q.placeholder || '(00) 00000-0000'"
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
                          <div class="renderer-option" [class.renderer-option--selected]="answers()[q.id] === opt.value"
                               (click)="setAnswer(q.id, opt.value)">
                            <span class="renderer-radio" [class.renderer-radio--active]="answers()[q.id] === opt.value"></span>
                            <span>{{ opt.label }}</span>
                          </div>
                        }
                      </div>
                    }
                    @case ('multi_choice') {
                      <div class="flex flex-col gap-3">
                        @for (opt of q.options; track opt.id) {
                          <div class="renderer-option" [class.renderer-option--selected]="isSelected(q.id, opt.value)"
                               (click)="toggleMulti(q.id, opt.value)">
                            <span class="renderer-checkbox" [class.renderer-checkbox--active]="isSelected(q.id, opt.value)">
                              @if (isSelected(q.id, opt.value)) { <i class="pi pi-check text-[10px]"></i> }
                            </span>
                            <span>{{ opt.label }}</span>
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
                      <div class="renderer-upload"
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
                            <div class="file-item">
                              <i class="pi pi-file text-xs text-surface-400"></i>
                              <span class="flex-1 truncate">{{ fname }}</span>
                              <button class="file-remove" (click)="removeFile(q.id, fi)">
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
                      <div class="renderer-scale">
                        <span class="text-xs text-surface-500 shrink-0">{{ q.scaleConfig?.minLabel }}</span>
                        <div class="flex gap-1.5 flex-1 justify-center flex-wrap">
                          @for (n of scaleRange(q.scaleConfig?.min ?? 1, q.scaleConfig?.max ?? 10); track n) {
                            <button class="scale-btn" [class.scale-btn--active]="answers()[q.id] === n"
                                    (click)="setAnswer(q.id, n)">{{ n }}</button>
                          }
                        </div>
                        <span class="text-xs text-surface-500 shrink-0">{{ q.scaleConfig?.maxLabel }}</span>
                      </div>
                    }
                    @case ('statement') {
                      <div class="renderer-statement">
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
          <div class="renderer-nav">
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
        <div class="renderer-card text-center">
          <div class="success-icon">
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
      <div class="renderer-footer">
        <span class="text-xs text-surface-400">Criado com</span>
        <div class="flex items-center gap-1.5">
          <div class="w-4 h-4 bg-primary-600 rounded flex items-center justify-center">
            <i class="pi pi-bolt text-white" style="font-size: 8px"></i>
          </div>
          <span class="text-xs font-semibold text-surface-500">FormFlow</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .renderer-page {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; padding: 40px 16px 60px;
      background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%);
    }
    .renderer-card {
      width: 100%; max-width: 640px; background: white;
      border-radius: 16px; padding: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
      animation: cardIn 0.35s ease-out;
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .error-icon, .welcome-icon, .success-icon {
      width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
    }
    .error-icon { background: #fef2f2; }
    .welcome-icon { background: #eff6ff; }
    .success-icon { background: #ecfdf5; }

    .renderer-header { margin-bottom: 8px; }
    .renderer-progress { height: 4px; background: #e2e8f0; border-radius: 2px; margin-bottom: 24px; }
    .renderer-progress-fill { height: 100%; background: var(--ff-primary); border-radius: 2px; transition: width 350ms ease; }

    .section-label { background: #f8fafc; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; }
    .renderer-field { margin-bottom: 24px; }
    .renderer-label { display: block; font-size: 15px; font-weight: 500; color: var(--ff-text); margin-bottom: 8px; line-height: 1.4; }

    .renderer-option {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border: 1.5px solid var(--ff-border);
      border-radius: 10px; cursor: pointer; transition: all 150ms;
      font-size: 14px; color: var(--ff-text-secondary);
    }
    .renderer-option:hover { border-color: #93c5fd; background: #f8fafc; }
    .renderer-option--selected { border-color: var(--ff-primary) !important; background: #eff6ff !important; color: var(--ff-text) !important; }

    .renderer-radio {
      width: 20px; height: 20px; border: 2px solid var(--ff-border);
      border-radius: 50%; shrink: 0; transition: all 150ms;
      display: flex; align-items: center; justify-content: center;
    }
    .renderer-radio--active { border-color: var(--ff-primary); border-width: 6px; }

    .renderer-checkbox {
      width: 20px; height: 20px; border: 2px solid var(--ff-border);
      border-radius: 5px; shrink: 0; transition: all 150ms;
      display: flex; align-items: center; justify-content: center;
    }
    .renderer-checkbox--active { border-color: var(--ff-primary); background: var(--ff-primary); color: white; }

    .renderer-upload {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 32px;
      border: 2px dashed var(--ff-border); border-radius: 12px;
      cursor: pointer; transition: all 200ms;
    }
    .renderer-upload:hover { border-color: #93c5fd; background: #f8fafc; }

    .file-item {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: var(--ff-text-secondary);
      background: #f8fafc; border-radius: 8px; padding: 8px 12px;
    }
    .file-remove { background: none; border: none; color: var(--ff-text-muted); cursor: pointer; transition: color 150ms; }
    .file-remove:hover { color: #ef4444; }

    .renderer-scale { display: flex; align-items: center; gap: 12px; }
    .scale-btn {
      width: 40px; height: 40px; display: flex; align-items: center;
      justify-content: center; border: 1.5px solid var(--ff-border);
      border-radius: 10px; font-size: 14px; font-weight: 500;
      color: var(--ff-text-secondary); background: white;
      cursor: pointer; transition: all 150ms;
    }
    .scale-btn:hover { border-color: #93c5fd; color: var(--ff-primary); background: #eff6ff; }
    .scale-btn--active { background: var(--ff-primary) !important; color: white !important; border-color: var(--ff-primary) !important; transform: scale(1.08); }

    .renderer-statement { display: flex; gap: 10px; padding: 14px 18px; background: #eff6ff; border-radius: 10px; }

    .renderer-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 24px; border-top: 1px solid var(--ff-border); margin-top: 8px;
    }
    .renderer-footer { display: flex; align-items: center; gap: 6px; margin-top: 24px; opacity: 0.7; }

    @media (max-width: 480px) {
      .renderer-page { padding: 16px 8px 40px; }
      .renderer-card { padding: 24px 20px; border-radius: 12px; }
    }
  `],
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
