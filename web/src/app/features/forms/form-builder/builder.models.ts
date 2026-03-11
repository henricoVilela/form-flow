import { v4 as uuid } from 'uuid';

// ── Types ──

export type QuestionType =
  | 'short_text' | 'long_text' | 'email' | 'phone' | 'url'
  | 'number' | 'single_choice' | 'multi_choice' | 'dropdown'
  | 'date' | 'file_upload' | 'statement'
  | 'matrix' | 'rating' | 'scale';

export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  icon: string;
  group: string;
}

// ── Schema structures ──

export interface BuilderSection {
  id: string;
  title: string;
  description: string;
  questions: BuilderQuestion[];
}

export interface BuilderQuestion {
  id: string;
  type: QuestionType;
  label: string;
  description: string;
  required: boolean;
  placeholder: string;
  options: BuilderOption[];
  validations: BuilderValidations;
  conditions: BuilderConditions | null;
  matrixConfig: BuilderMatrixConfig | null;
  ratingConfig: BuilderRatingConfig | null;
  scaleConfig: BuilderScaleConfig | null;
}

export interface BuilderOption {
  id: string;
  label: string;
  value: string;
}

export interface BuilderValidations {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  minSelections?: number;
  maxSelections?: number;
  maxFiles?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number;
}

export interface BuilderConditions {
  operator: 'AND' | 'OR';
  rules: BuilderConditionRule[];
}

export interface BuilderConditionRule {
  questionId: string;
  operator: string;
  value: any;
}

export interface BuilderMatrixConfig {
  rows: { id: string; label: string }[];
  columns: { id: string; label: string; value: number }[];
}

export interface BuilderRatingConfig {
  max: number;
  icon: string;
}

export interface BuilderScaleConfig {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

// ── Schema (for publish) ──

export interface FormSchema {
  sections: BuilderSection[];
  settings: FormSettings;
}

export interface FormSettings {
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
}

// ── Catalog of available question types ──

export const QUESTION_TYPES: QuestionTypeInfo[] = [
  { type: 'short_text',    label: 'Texto curto',     icon: 'pi pi-minus',         group: 'Texto' },
  { type: 'long_text',     label: 'Texto longo',     icon: 'pi pi-align-left',    group: 'Texto' },
  { type: 'email',         label: 'E-mail',          icon: 'pi pi-at',            group: 'Texto' },
  { type: 'phone',         label: 'Telefone',        icon: 'pi pi-phone',         group: 'Texto' },
  { type: 'url',           label: 'URL',             icon: 'pi pi-link',          group: 'Texto' },
  { type: 'number',        label: 'Número',          icon: 'pi pi-hashtag',       group: 'Numérico' },
  { type: 'rating',        label: 'Avaliação',       icon: 'pi pi-star',          group: 'Numérico' },
  { type: 'scale',         label: 'Escala',          icon: 'pi pi-sliders-h',     group: 'Numérico' },
  { type: 'single_choice', label: 'Escolha única',   icon: 'pi pi-circle',        group: 'Escolha' },
  { type: 'multi_choice',  label: 'Múltipla escolha',icon: 'pi pi-check-square',  group: 'Escolha' },
  { type: 'dropdown',      label: 'Dropdown',        icon: 'pi pi-chevron-down',  group: 'Escolha' },
  { type: 'date',          label: 'Data',            icon: 'pi pi-calendar',      group: 'Outros' },
  { type: 'file_upload',   label: 'Upload',          icon: 'pi pi-upload',        group: 'Outros' },
  { type: 'statement',     label: 'Texto informativo',icon: 'pi pi-info-circle',  group: 'Outros' },
];

// ── Factories ──

export function createSection(title = 'Nova seção'): BuilderSection {
  return { id: uuid(), title, description: '', questions: [] };
}

export function createQuestion(type: QuestionType): BuilderQuestion {
  const info = QUESTION_TYPES.find(t => t.type === type)!;
  const base: BuilderQuestion = {
    id: uuid(),
    type,
    label: '',
    description: '',
    required: false,
    placeholder: '',
    options: [],
    validations: {},
    conditions: null,
    matrixConfig: null,
    ratingConfig: null,
    scaleConfig: null,
  };

  // Defaults por tipo
  if (['single_choice', 'multi_choice', 'dropdown'].includes(type)) {
    base.options = [
      { id: uuid(), label: 'Opção 1', value: 'opcao_1' },
      { id: uuid(), label: 'Opção 2', value: 'opcao_2' },
    ];
  }
  if (type === 'rating') {
    base.ratingConfig = { max: 5, icon: 'star' };
  }
  if (type === 'scale') {
    base.scaleConfig = { min: 1, max: 10, minLabel: 'Discordo', maxLabel: 'Concordo' };
  }

  return base;
}

export function createOption(): BuilderOption {
  return { id: uuid(), label: '', value: '' };
}
