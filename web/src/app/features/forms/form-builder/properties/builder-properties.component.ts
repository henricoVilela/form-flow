import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { AccordionModule } from 'primeng/accordion';
import { SelectModule } from 'primeng/select';

import { BuilderStore } from '../builder.store';
import { BuilderQuestion, QUESTION_TYPES } from '../builder.models';

@Component({
  selector: 'app-builder-properties',
  imports: [
    CommonModule, FormsModule,
    InputTextModule, TextareaModule, ToggleSwitchModule,
    InputNumberModule, ButtonModule, DividerModule, AccordionModule, SelectModule,
  ],
  template: `
    <div class="properties">
      @if (!store.selectedQuestion()) {
        <!-- No selection -->
        <div class="no-selection">
          <i class="pi pi-arrow-left text-2xl text-surface-300 mb-3"></i>
          <p class="text-sm text-surface-400 text-center leading-relaxed">
            Selecione uma pergunta<br>no canvas para editar
          </p>
        </div>
      } @else {
        @let q = store.selectedQuestion()!;

        <!-- Header -->
        <div class="props-header">
          <div class="flex items-center gap-2 mb-1">
            <i [class]="getIcon(q.type) + ' text-sm text-primary-500'"></i>
            <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">
              {{ getTypeLabel(q.type) }}
            </span>
          </div>
        </div>

        <div class="props-body">
          <!-- Label -->
          <div class="field">
            <label class="field-label">Pergunta *</label>
            <input
              pInputText
              class="w-full"
              [ngModel]="q.label"
              (ngModelChange)="update({ label: $event })"
              placeholder="Texto da pergunta"
            />
          </div>

          <!-- Description -->
          <div class="field">
            <label class="field-label">Descrição auxiliar</label>
            <textarea
              pTextarea
              class="w-full"
              [rows]="2"
              [ngModel]="q.description"
              (ngModelChange)="update({ description: $event })"
              placeholder="Texto de ajuda (opcional)"
            ></textarea>
          </div>

          <!-- Placeholder (text types) -->
          @if (isTextType(q.type)) {
            <div class="field">
              <label class="field-label">Placeholder</label>
              <input
                pInputText
                class="w-full"
                [ngModel]="q.placeholder"
                (ngModelChange)="update({ placeholder: $event })"
                placeholder="Ex: Digite aqui..."
              />
            </div>
          }

          <!-- Required toggle -->
          @if (q.type !== 'statement') {
            <div class="field-row">
              <span class="field-label mb-0">Obrigatório</span>
              <p-toggleswitch
                [ngModel]="q.required"
                (ngModelChange)="update({ required: $event })"
              />
            </div>
          }

          <p-divider />

          <!-- ── OPTIONS (choice types) ── -->
          @if (hasOptions(q.type)) {
            <div class="field">
              <label class="field-label">Opções</label>

              @for (opt of q.options; track opt.id; let oi = $index) {
                <div class="option-row">
                  <span class="option-index">{{ oi + 1 }}</span>
                  <input
                    pInputText
                    class="flex-1"
                    [ngModel]="opt.label"
                    (ngModelChange)="store.updateOption(q.id, opt.id, $event)"
                    [placeholder]="'Opção ' + (oi + 1)"
                  />
                  <button
                    class="icon-btn-sm icon-btn--danger"
                    (click)="store.removeOption(q.id, opt.id)"
                    [disabled]="q.options.length <= 1"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </div>
              }

              <button
                pButton
                label="Adicionar opção"
                icon="pi pi-plus"
                severity="secondary"
                [text]="true"
                size="small"
                (click)="store.addOption(q.id)"
                class="mt-1"
              ></button>
            </div>

            <!-- Min/Max selections (multi_choice) -->
            @if (q.type === 'multi_choice') {
              <div class="field-grid">
                <div>
                  <label class="field-label">Mín. seleções</label>
                  <p-inputNumber
                    [ngModel]="q.validations.minSelections ?? null"
                    (ngModelChange)="updateValidation('minSelections', $event)"
                    [min]="0" [showButtons]="true" size="small" styleClass="w-full"
                  />
                </div>
                <div>
                  <label class="field-label">Máx. seleções</label>
                  <p-inputNumber
                    [ngModel]="q.validations.maxSelections ?? null"
                    (ngModelChange)="updateValidation('maxSelections', $event)"
                    [min]="1" [showButtons]="true" size="small" styleClass="w-full"
                  />
                </div>
              </div>
            }
          }

          <!-- ── VALIDATIONS (text types) ── -->
          @if (isTextType(q.type)) {
            <div class="field">
              <label class="field-label">Validações de texto</label>
              <div class="field-grid">
                <div>
                  <label class="field-label-sm">Mín. caracteres</label>
                  <p-inputNumber
                    [ngModel]="q.validations.minLength ?? null"
                    (ngModelChange)="updateValidation('minLength', $event)"
                    [min]="0" [showButtons]="true" size="small" styleClass="w-full"
                  />
                </div>
                <div>
                  <label class="field-label-sm">Máx. caracteres</label>
                  <p-inputNumber
                    [ngModel]="q.validations.maxLength ?? null"
                    (ngModelChange)="updateValidation('maxLength', $event)"
                    [min]="1" [showButtons]="true" size="small" styleClass="w-full"
                  />
                </div>
              </div>
            </div>

            <!-- Regex pattern -->
            <div class="field">
              <label class="field-label">Regex (padrão)</label>
              <input
                pInputText
                class="w-full"
                [ngModel]="q.validations.pattern ?? ''"
                (ngModelChange)="updateValidation('pattern', $event || undefined)"
                placeholder="Ex: ^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$"
              />
              <input
                pInputText
                class="w-full mt-2"
                [ngModel]="q.validations.patternMessage ?? ''"
                (ngModelChange)="updateValidation('patternMessage', $event || undefined)"
                placeholder="Mensagem de erro customizada"
              />
            </div>
          }

          <!-- ── VALIDATIONS (number) ── -->
          @if (q.type === 'number') {
            <div class="field">
              <label class="field-label">Tipo de Entrada</label>
              <p-select
                [ngModel]="q.numberConfig?.documentType ?? 'none'"
                (ngModelChange)="updateNumberDocType($event)"
                [options]="[
                  { label: 'Número', value: 'none' },
                  { label: 'CPF', value: 'cpf' },
                  { label: 'CNPJ', value: 'cnpj' }
                ]"
                optionLabel="label" optionValue="value"
                styleClass="w-full"
              />
            </div>

            @if ((q.numberConfig?.documentType ?? 'none') === 'none') {
              <div class="field">
                <label class="field-label">Limites numéricos</label>
                <div class="field-grid">
                  <div>
                    <label class="field-label-sm">Mínimo</label>
                    <p-inputNumber
                      [ngModel]="q.validations.min ?? null"
                      (ngModelChange)="updateValidation('min', $event)"
                      [showButtons]="true" size="small" styleClass="w-full"
                    />
                  </div>
                  <div>
                    <label class="field-label-sm">Máximo</label>
                    <p-inputNumber
                      [ngModel]="q.validations.max ?? null"
                      (ngModelChange)="updateValidation('max', $event)"
                      [showButtons]="true" size="small" styleClass="w-full"
                    />
                  </div>
                </div>
              </div>
            }
          }

          <!-- ── RATING config ── -->
          @if (q.type === 'rating' && q.ratingConfig) {
            <div class="field">
              <label class="field-label">Avaliação máxima</label>
              <p-inputNumber
                [ngModel]="q.ratingConfig.max"
                (ngModelChange)="updateRatingMax($event)"
                [min]="2" [max]="10" [showButtons]="true" size="small" styleClass="w-full"
              />
            </div>
          }

          <!-- ── SCALE config ── -->
          @if (q.type === 'scale' && q.scaleConfig) {
            <div class="field-grid">
              <div>
                <label class="field-label">Mín.</label>
                <p-inputNumber
                  [ngModel]="q.scaleConfig.min"
                  (ngModelChange)="updateScaleMin($event)"
                  [min]="0" [max]="q.scaleConfig.max - 1" [showButtons]="true" size="small" styleClass="w-full"
                />
              </div>
              <div>
                <label class="field-label">Máx.</label>
                <p-inputNumber
                  [ngModel]="q.scaleConfig.max"
                  (ngModelChange)="updateScaleMax($event)"
                  [min]="q.scaleConfig.min + 1" [max]="100" [showButtons]="true" size="small" styleClass="w-full"
                />
              </div>
            </div>
            <div class="field-grid mt-3">
              <div>
                <label class="field-label-sm">Label mín.</label>
                <input pInputText class="w-full"
                  [ngModel]="q.scaleConfig.minLabel"
                  (ngModelChange)="updateScaleMinLabel($event)"
                />
              </div>
              <div>
                <label class="field-label-sm">Label máx.</label>
                <input pInputText class="w-full"
                  [ngModel]="q.scaleConfig.maxLabel"
                  (ngModelChange)="updateScaleMaxLabel($event)"
                />
              </div>
            </div>
          }

          <!-- ── FILE UPLOAD config ── -->
          @if (q.type === 'file_upload') {
            <div class="field">
              <label class="field-label">Máx. arquivos</label>
              <p-inputNumber
                [ngModel]="q.validations.maxFiles ?? 3"
                (ngModelChange)="updateValidation('maxFiles', $event)"
                [min]="1" [max]="20" [showButtons]="true" size="small" styleClass="w-full"
              />
            </div>
          }

          <!-- ── CONDITIONS ── -->
          <p-divider />
          <div class="field">
            <div class="field-row">
              <label class="field-label mb-0">Lógica condicional</label>
              <p-toggleswitch
                [ngModel]="!!q.conditions"
                (ngModelChange)="toggleConditions($event)"
              />
            </div>

            @if (q.conditions) {
              <div class="condition-box">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-xs text-surface-500">Mostrar quando</span>
                  <p-select
                    [ngModel]="q.conditions.operator"
                    (ngModelChange)="updateConditionOperator($event)"
                    [options]="[{ label: 'TODAS', value: 'AND' }, { label: 'ALGUMA', value: 'OR' }]"
                    optionLabel="label" optionValue="value"
                    styleClass="w-24" size="small"
                  />
                  <span class="text-xs text-surface-500">das condições:</span>
                </div>

                @for (rule of q.conditions.rules; track $index; let ri = $index) {
                  <div class="condition-rule">
                    <p-select
                      [ngModel]="rule.questionId"
                      (ngModelChange)="updateConditionRule(ri, 'questionId', $event)"
                      [options]="getOtherQuestions(q.id)"
                      optionLabel="label" optionValue="id"
                      placeholder="Pergunta"
                      styleClass="flex-1" size="small"
                    />
                    <p-select
                      [ngModel]="rule.operator"
                      (ngModelChange)="updateConditionRule(ri, 'operator', $event)"
                      [options]="conditionOperators"
                      optionLabel="label" optionValue="value"
                      placeholder="Operador"
                      styleClass="w-32" size="small"
                    />
                    @if (rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty') {
                      <input
                        pInputText
                        class="flex-1"
                        [ngModel]="rule.value"
                        (ngModelChange)="updateConditionRule(ri, 'value', $event)"
                        placeholder="Valor"
                      />
                    }
                    <button class="icon-btn-sm icon-btn--danger" (click)="removeConditionRule(ri)">
                      <i class="pi pi-times text-xs"></i>
                    </button>
                  </div>
                }

                <button
                  pButton label="Adicionar regra" icon="pi pi-plus" severity="secondary"
                  [text]="true" size="small" (click)="addConditionRule()"
                ></button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .properties { height: 100%; display: flex; flex-direction: column; }

    .no-selection {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 32px;
    }

    .props-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid var(--ff-border);
    }

    .props-body {
      flex: 1; overflow-y: auto; padding: 16px 20px;
    }

    .field { margin-bottom: 16px; }

    .field-label {
      display: block; font-size: 12px; font-weight: 600;
      color: var(--ff-text-secondary); margin-bottom: 6px;
    }

    .field-label-sm {
      display: block; font-size: 11px; font-weight: 500;
      color: var(--ff-text-muted); margin-bottom: 4px;
    }

    .field-row {
      display: flex; align-items: center;
      justify-content: space-between; margin-bottom: 12px;
    }

    .field-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    }

    .option-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
    }
    .option-index {
      width: 20px; height: 20px; display: flex; align-items: center;
      justify-content: center; border-radius: 50%; background: var(--ff-surface-hover);
      color: var(--ff-text-muted); font-size: 10px; font-weight: 600; shrink: 0;
    }

    .condition-box {
      background: #fefce8; border: 1px solid #fef08a; border-radius: 8px;
      padding: 12px; margin-top: 8px;
    }
    :host-context(.dark) .condition-box { background: #422006; border-color: #92400e; }
    .condition-rule {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;
    }

    .icon-btn-sm {
      width: 24px; height: 24px; display: flex; align-items: center;
      justify-content: center; border: none; border-radius: 5px;
      background: transparent; color: var(--ff-text-muted); cursor: pointer;
      transition: all 150ms;
    }
    .icon-btn-sm:hover { background: var(--ff-surface-hover); color: var(--ff-text-secondary); }
    .icon-btn-sm.icon-btn--danger:hover { background: #fef2f2; color: #ef4444; }
    :host-context(.dark) .icon-btn-sm.icon-btn--danger:hover { background: #450a0a; color: #f87171; }
    .icon-btn-sm:disabled { opacity: 0.3; cursor: not-allowed; }
  `],
})
export class BuilderPropertiesComponent {
  readonly store = inject(BuilderStore);

  readonly conditionOperators = [
    { label: '= Igual', value: 'equals' },
    { label: '≠ Diferente', value: 'not_equals' },
    { label: 'Contém', value: 'contains' },
    { label: '> Maior', value: 'greater_than' },
    { label: '< Menor', value: 'less_than' },
    { label: 'Vazio', value: 'is_empty' },
    { label: 'Não vazio', value: 'is_not_empty' },
  ];

  update(partial: Partial<BuilderQuestion>): void {
    const qId = this.store.selectedQuestionId();
    if (qId) this.store.updateQuestion(qId, partial);
  }

  updateValidation(key: string, value: any): void {
    const q = this.store.selectedQuestion();
    if (!q) return;
    this.update({ validations: { ...q.validations, [key]: value } });
  }

  isTextType(type: string): boolean {
    return ['short_text', 'long_text', 'email', 'phone', 'url'].includes(type);
  }

  hasOptions(type: string): boolean {
    return ['single_choice', 'multi_choice', 'dropdown'].includes(type);
  }

  getIcon(type: string): string {
    return QUESTION_TYPES.find(t => t.type === type)?.icon ?? 'pi pi-question';
  }

  getTypeLabel(type: string): string {
    return QUESTION_TYPES.find(t => t.type === type)?.label ?? type;
  }

  // ── Conditions ──

  getOtherQuestions(currentId: string) {
    return this.store.allQuestions().filter(q => q.id !== currentId).map(q => ({
      id: q.id,
      label: q.label || `(${QUESTION_TYPES.find(t => t.type === q.type)?.label})`,
    }));
  }

  toggleConditions(enabled: boolean): void {
    if (enabled) {
      this.update({ conditions: { operator: 'AND', rules: [{ questionId: '', operator: 'equals', value: '' }] } });
    } else {
      this.update({ conditions: null });
    }
  }

  updateConditionOperator(operator: 'AND' | 'OR'): void {
    const q = this.store.selectedQuestion();
    if (!q?.conditions) return;
    this.update({ conditions: { ...q.conditions, operator } });
  }

  updateConditionRule(index: number, field: string, value: any): void {
    const q = this.store.selectedQuestion();
    if (!q?.conditions) return;
    const rules = [...q.conditions.rules];
    rules[index] = { ...rules[index], [field]: value };
    this.update({ conditions: { ...q.conditions, rules } });
  }

  addConditionRule(): void {
    const q = this.store.selectedQuestion();
    if (!q?.conditions) return;
    this.update({
      conditions: {
        ...q.conditions,
        rules: [...q.conditions.rules, { questionId: '', operator: 'equals', value: '' }],
      },
    });
  }

  removeConditionRule(index: number): void {
    const q = this.store.selectedQuestion();
    if (!q?.conditions) return;
    const rules = q.conditions.rules.filter((_, i) => i !== index);
    if (rules.length === 0) {
      this.update({ conditions: null });
    } else {
      this.update({ conditions: { ...q.conditions, rules } });
    }
  }

  updateNumberDocType(documentType: 'none' | 'cpf' | 'cnpj'): void {
    this.update({ numberConfig: { documentType } });
  }

  updateRatingMax(max: number): void {
    const q = this.store.selectedQuestion();
    if (!q?.ratingConfig) return;

    this.update({
      ratingConfig: {
        ...q.ratingConfig,
        max
      }
    });
  }

  updateScaleMin(min: number): void {
    const q = this.store.selectedQuestion();
    if (!q?.scaleConfig) return;

    this.update({
      scaleConfig: {
        ...q.scaleConfig,
        min
      }
    });
  }

  updateScaleMax(max: number): void {
    const q = this.store.selectedQuestion();
    if (!q?.scaleConfig) return;

    this.update({
      scaleConfig: {
        ...q.scaleConfig,
        max
      }
    });
  }

  updateScaleMinLabel(minLabel: string): void {
    const q = this.store.selectedQuestion();
    if (!q?.scaleConfig) return;

    this.update({
      scaleConfig: {
        ...q.scaleConfig,
        minLabel
      }
    });
  }

  updateScaleMaxLabel(maxLabel: string): void {
    const q = this.store.selectedQuestion();
    if (!q?.scaleConfig) return;

    this.update({
      scaleConfig: {
        ...q.scaleConfig,
        maxLabel
      }
    });
  }
}
