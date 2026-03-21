import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

import { BuilderStore } from '../builder.store';
import { BuilderQuestion } from '../builder.models';
import { QuestionFieldComponent } from '@shared/question-field/question-field.component';

@Component({
  selector: 'app-builder-preview-dialog',
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule,
    QuestionFieldComponent,
  ],
  template: `
    <p-dialog
      header="Preview interativo"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '680px', maxHeight: '90vh' }"
      [contentStyle]="{ overflow: 'auto', padding: '0' }"
      (onShow)="onOpen()"
    >
      @if (store.totalQuestions() === 0) {
        <div class="text-center py-12 text-surface-400 px-6">
          <i class="pi pi-eye-slash text-2xl mb-2"></i>
          <p class="text-sm">Adicione perguntas para visualizar o preview</p>
        </div>
      } @else if (submitted()) {
        <!-- Tela de sucesso -->
        <div class="text-center py-16 px-6">
          <div class="w-16 h-16 mx-auto mb-4 bg-emerald-50 dark:bg-emerald-950 rounded-2xl flex items-center justify-center">
            <i class="pi pi-check text-3xl text-emerald-500"></i>
          </div>
          <h3 class="text-xl font-display font-bold text-surface-900 dark:text-surface-0 mb-2">Resposta enviada!</h3>
          <p class="text-sm text-surface-500 mb-6">Obrigado por preencher o formulário.</p>
          <div class="flex justify-center gap-2">
            <button pButton label="Preencher novamente" icon="pi pi-refresh"
                    severity="secondary" [outlined]="true" (click)="reset()"></button>
            <button pButton label="Fechar" (click)="visible = false"></button>
          </div>
        </div>
      } @else {
        <div>
          <!-- Progress bar -->
          @if (store.settings().showProgressBar && visibleSections().length > 1) {
            <div class="h-1 bg-surface-200 dark:bg-surface-700 rounded-sm mx-6 mt-4">
              <div class="h-full bg-[var(--ff-primary)] rounded-sm transition-[width] duration-300" [style.width.%]="progressPercent()"></div>
            </div>
            <div class="text-xs text-surface-400 text-center mt-1 mb-4">
              Seção {{ currentStep() + 1 }} de {{ visibleSections().length }}
            </div>
          }

          <!-- Current section -->
          @let section = visibleSections()[currentStep()]; 
          
            <div class="px-6">
              <div class="py-3 px-4 bg-surface-100 dark:bg-surface-800 rounded-lg mb-5">
                <h3 class="text-lg font-display font-semibold text-surface-900 dark:text-surface-0">
                  {{ section.title || 'Seção ' + (currentStep() + 1) }}
                </h3>
                @if (section.description) {
                  <p class="text-sm text-surface-500 mt-0.5">{{ section.description }}</p>
                }
              </div>

              @for (q of section.questions; track q.id) {
                @if (isQuestionVisible(q)) {
                  <div class="mb-6">
                    <app-question-field
                      [question]="q"
                      [answer]="answers()[q.id]"
                      [error]="errors()[q.id] || null"
                      [showNumber]="store.settings().showQuestionNumbers"
                      [questionNumber]="getGlobalIndex(q.id)"
                      (answerChange)="setAnswer(q.id, $event)"
                    />
                  </div>
                }
              }
            </div>
          

          <!-- Navigation buttons -->
          <div class="flex items-center justify-between px-6 pt-4 pb-6 border-t border-[var(--ff-border)] mt-4">
            @if (currentStep() > 0) {
              <button pButton label="Anterior" icon="pi pi-arrow-left" severity="secondary"
                      [outlined]="true" (click)="prevStep()"></button>
            } @else {
              <span></span>
            }

            @if (currentStep() < visibleSections().length - 1) {
              <button pButton label="Próximo" icon="pi pi-arrow-right" iconPos="right"
                      (click)="nextStep()"></button>
            } @else {
              <button pButton label="Enviar" icon="pi pi-check" (click)="onSubmit()"></button>
            }
          </div>
        </div>
      }
    </p-dialog>
  `,

})
export class BuilderPreviewDialogComponent {
  readonly store = inject(BuilderStore);
  visible = false;

  // ── State ──
  readonly answers = signal<Record<string, any>>({});
  readonly errors = signal<Record<string, string>>({});
  readonly currentStep = signal(0);
  readonly submitted = signal(false);

  // ── Computed ──

  readonly visibleSections = computed(() => {
    // Filtra seções que têm pelo menos 1 questão
    return this.store.sections().filter(s => s.questions.length > 0);
  });

  readonly progressPercent = computed(() => {
    const total = this.visibleSections().length;
    if (total <= 1) return 100;
    return ((this.currentStep() + 1) / total) * 100;
  });

  // ── Lifecycle ──

  open(): void { this.visible = true; }

  onOpen(): void { this.reset(); }

  reset(): void {
    this.answers.set({});
    this.errors.set({});
    this.currentStep.set(0);
    this.submitted.set(false);
  }

  // ── Answers ──

  setAnswer(questionId: string, value: any): void {
    this.answers.update(a => ({ ...a, [questionId]: value }));
    // Limpa erro ao editar
    if (this.errors()[questionId]) {
      this.errors.update(e => {
        const copy = { ...e };
        delete copy[questionId];
        return copy;
      });
    }
  }

  // ── Condition evaluation ──

  isQuestionVisible(question: BuilderQuestion): boolean {
    if (!question.conditions) return true;

    const rules = question.conditions.rules;
    if (!rules || rules.length === 0) return true;

    const results = rules.map(rule => this.evaluateRule(rule));

    if (question.conditions.operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  private evaluateRule(rule: { questionId: string; operator: string; value: any }): boolean {
    if (!rule.questionId) return true;
    
    const actual = this.answers()[rule.questionId];
    const expected = rule.value;

    switch (rule.operator) {
      case 'equals':
        return String(actual ?? '') === String(expected ?? '');
      case 'not_equals':
        return String(actual ?? '') !== String(expected ?? '');
      case 'contains':
        return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'is_empty':
        return actual === undefined || actual === null || actual === '' || (Array.isArray(actual) && actual.length === 0);
      case 'is_not_empty':
        return actual !== undefined && actual !== null && actual !== '' && !(Array.isArray(actual) && actual.length === 0);
      default:
        return true;
    }
  }

  // ── Validation ──

  private validateCurrentStep(): boolean {
    const section = this.visibleSections()[this.currentStep()];
    if (!section) return true;

    const newErrors: Record<string, string> = {};

    for (const q of section.questions) {
      if (!this.isQuestionVisible(q)) continue;
      if (q.type === 'statement') continue;

      const value = this.answers()[q.id];
      const error = this.validateQuestion(q, value);
      if (error) newErrors[q.id] = error;
    }

    this.errors.set(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  private validateQuestion(q: BuilderQuestion, value: any): string | null {
    const isEmpty = value === undefined || value === null || value === '' ||
                    (Array.isArray(value) && value.length === 0);

    // Required
    if (q.required && isEmpty) return 'Campo obrigatório';
    if (isEmpty) return null; // não obrigatório e vazio = ok

    const v = q.validations;
    const strValue = String(value ?? '');

    // Text validations
    if (['short_text', 'long_text', 'email', 'phone', 'url'].includes(q.type)) {
      if (v.minLength && strValue.length < v.minLength)
        return `Mínimo de ${v.minLength} caracteres`;
      if (v.maxLength && strValue.length > v.maxLength)
        return `Máximo de ${v.maxLength} caracteres`;
      if (v.pattern) {
        try {
          if (!new RegExp(v.pattern).test(strValue))
            return v.patternMessage || 'Formato inválido';
        } catch { /* regex inválido */ }
      }
    }

    // Email format
    if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue))
      return 'E-mail inválido';

    // Phone format
    if (q.type === 'phone' && !/^[+]?[0-9\s\-().]{7,20}$/.test(strValue))
      return 'Telefone inválido';

    // URL format
    if (q.type === 'url' && !/^https?:\/\/.+/.test(strValue))
      return 'URL inválida (use http:// ou https://)';

    // Number validations
    if (q.type === 'number') {
      if ((q.numberConfig?.documentType ?? 'none') !== 'none') return null;
      const num = Number(value);
      if (isNaN(num)) return 'Valor deve ser numérico';
      if (v.min !== undefined && num < v.min) return `Valor mínimo: ${v.min}`;
      if (v.max !== undefined && num > v.max) return `Valor máximo: ${v.max}`;
    }

    // Multi-choice validations
    if (q.type === 'multi_choice' && Array.isArray(value)) {
      if (v.minSelections && value.length < v.minSelections)
        return `Selecione no mínimo ${v.minSelections} opções`;
      if (v.maxSelections && value.length > v.maxSelections)
        return `Selecione no máximo ${v.maxSelections} opções`;
    }

    return null;
  }

  hasError(questionId: string): boolean {
    return !!this.errors()[questionId];
  }

  getError(questionId: string): string {
    return this.errors()[questionId] ?? '';
  }

  // ── Navigation ──

  nextStep(): void {
    if (this.validateCurrentStep()) {
      this.currentStep.update(s => Math.min(s + 1, this.visibleSections().length - 1));
    }
  }

  prevStep(): void {
    this.errors.set({});
    this.currentStep.update(s => Math.max(s - 1, 0));
  }

  onSubmit(): void {
    if (this.validateCurrentStep()) {
      this.submitted.set(true);
      console.log('Preview submit — answers:', this.answers());
    }
  }

  // ── Helpers ──

  getGlobalIndex(questionId: string): number {
    let idx = 0;
    for (const section of this.store.sections()) {
      for (const q of section.questions) {
        idx++;
        if (q.id === questionId) return idx;
      }
    }
    return 0;
  }

}
