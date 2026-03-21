import { Injectable, signal, computed } from '@angular/core';
import {
  BuilderSection, BuilderQuestion, QuestionType,
  FormSchema, FormSettings,
  createSection, createQuestion, createOption
} from './builder.models';

@Injectable()
export class BuilderStore {
  // ── Core state ──
  readonly sections = signal<BuilderSection[]>([]);
  readonly settings = signal<FormSettings>({
    showProgressBar: true,
    showQuestionNumbers: true,
  });
  readonly selectedQuestionId = signal<string | null>(null);
  readonly selectedSectionId = signal<string | null>(null);
  readonly dirty = signal(false);
  readonly lastSavedAt = signal<Date | null>(null);
  readonly saving = signal(false);

  // ── Computed ──

  readonly totalQuestions = computed(() =>
    this.sections().reduce((sum, s) => sum + s.questions.length, 0)
  );

  readonly selectedQuestion = computed(() => {
    const qId = this.selectedQuestionId();
    if (!qId) return null;
    for (const section of this.sections()) {
      const q = section.questions.find(q => q.id === qId);
      if (q) return q;
    }
    return null;
  });

  readonly selectedSection = computed(() => {
    const sId = this.selectedSectionId();
    if (!sId) return null;
    return this.sections().find(s => s.id === sId) ?? null;
  });

  readonly allQuestions = computed(() =>
    this.sections().flatMap(s => s.questions)
  );

  // ── Initialize from schema ──

  loadSchema(schema: any): void {
    if (!schema?.sections) {
      const firstSection = createSection('Seção 1');
      this.sections.set([firstSection]);
      // ✅ FIX: auto-seleciona a primeira seção
      this.selectedSectionId.set(firstSection.id);
      return;
    }

    const sections: BuilderSection[] = (schema.sections as any[]).map(s => ({
      id: s.id,
      title: s.title ?? '',
      description: s.description ?? '',
      questions: (s.questions ?? []).map((q: any) => ({
        id: q.id,
        type: q.type,
        label: q.label ?? '',
        description: q.description ?? '',
        required: q.required ?? false,
        placeholder: q.placeholder ?? '',
        options: q.options ?? [],
        validations: q.validations ?? {},
        conditions: q.conditions ?? null,
        matrixConfig: q.matrixConfig ?? null,
        ratingConfig: q.ratingConfig ?? null,
        scaleConfig: q.scaleConfig ?? null,
        numberConfig: q.numberConfig ?? null,
      })),
    }));

    this.sections.set(sections.length > 0 ? sections : [createSection('Seção 1')]);

    // ✅ FIX: auto-seleciona a primeira seção ao carregar
    if (this.sections().length > 0) {
      this.selectedSectionId.set(this.sections()[0].id);
    }

    if (schema.settings) {
      this.settings.set(schema.settings);
    }

    this.dirty.set(false);
  }

  // ── Export schema ──

  toSchema(): FormSchema {
    return {
      sections: this.sections(),
      settings: this.settings(),
    };
  }

  // ── Section actions ──

  addSection(): void {
    this.pushHistory();
    const index = this.sections().length + 1;
    const section = createSection(`Seção ${index}`);
    this.sections.update(s => [...s, section]);
    // ✅ FIX: seleciona a nova seção automaticamente
    this.selectSection(section.id);
    this.markDirty();
  }

  /**
   * ✅ NOVO: Seleciona uma seção (sem selecionar questão).
   * Usado quando o usuário clica no header da seção.
   * O toolbox usa selectedSectionId para saber onde adicionar.
   */
  selectSection(sectionId: string): void {
    this.selectedSectionId.set(sectionId);
    this.selectedQuestionId.set(null);
  }

  updateSection(sectionId: string, updates: Partial<BuilderSection>): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
    );
    this.markDirty();
  }

  removeSection(sectionId: string): void {
    this.pushHistory();
    const remaining = this.sections().filter(sec => sec.id !== sectionId);
    this.sections.set(remaining);

    if (this.selectedSectionId() === sectionId) {
      // ✅ FIX: seleciona outra seção ao remover a atual
      this.selectedSectionId.set(remaining.length > 0 ? remaining[0].id : null);
      this.selectedQuestionId.set(null);
    }
    this.markDirty();
  }

  moveSectionUp(sectionId: string): void {
    this.pushHistory();
    this.sections.update(sections => {
      const idx = sections.findIndex(s => s.id === sectionId);
      if (idx <= 0) return sections;
      const arr = [...sections];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
    this.markDirty();
  }

  moveSectionDown(sectionId: string): void {
    this.pushHistory();
    this.sections.update(sections => {
      const idx = sections.findIndex(s => s.id === sectionId);
      if (idx < 0 || idx >= sections.length - 1) return sections;
      const arr = [...sections];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
    this.markDirty();
  }

  // ── Question actions ──

  addQuestion(sectionId: string, type: QuestionType): void {
    this.pushHistory();
    const question = createQuestion(type);
    this.sections.update(sections =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions: [...s.questions, question] }
          : s
      )
    );
    this.selectQuestion(question.id, sectionId);
    this.markDirty();
  }

  updateQuestion(questionId: string, updates: Partial<BuilderQuestion>): void {
    this.sections.update(sections =>
      sections.map(s => ({
        ...s,
        questions: s.questions.map(q =>
          q.id === questionId ? { ...q, ...updates } : q
        ),
      }))
    );
    this.markDirty();
  }

  removeQuestion(questionId: string): void {
    this.pushHistory();
    this.sections.update(sections =>
      sections.map(s => ({
        ...s,
        questions: s.questions.filter(q => q.id !== questionId),
      }))
    );
    if (this.selectedQuestionId() === questionId) {
      this.selectedQuestionId.set(null);
    }
    this.markDirty();
  }

  duplicateQuestion(questionId: string): void {
    this.pushHistory();
    this.sections.update(sections =>
      sections.map(s => {
        const idx = s.questions.findIndex(q => q.id === questionId);
        if (idx === -1) return s;
        const original = s.questions[idx];
        const clone: BuilderQuestion = {
          ...JSON.parse(JSON.stringify(original)),
          id: crypto.randomUUID(),
          label: original.label + ' (Cópia)',
        };
        clone.options = clone.options.map((o: any) => ({ ...o, id: crypto.randomUUID() }));
        const questions = [...s.questions];
        questions.splice(idx + 1, 0, clone);
        return { ...s, questions };
      })
    );
    this.markDirty();
  }

  reorderQuestions(sectionId: string, previousIndex: number, currentIndex: number): void {
    this.pushHistory();
    this.sections.update(sections =>
      sections.map(s => {
        if (s.id !== sectionId) return s;
        const questions = [...s.questions];
        const [moved] = questions.splice(previousIndex, 1);
        questions.splice(currentIndex, 0, moved);
        return { ...s, questions };
      })
    );
    this.markDirty();
  }

  // ── Selection ──

  selectQuestion(questionId: string, sectionId: string): void {
    this.selectedQuestionId.set(questionId);
    this.selectedSectionId.set(sectionId);
  }

  clearSelection(): void {
    this.selectedQuestionId.set(null);
    // NÃO limpa selectedSectionId — mantém a seção ativa para o toolbox
  }

  // ── Options ──

  addOption(questionId: string): void {
    this.pushHistory();
    this.sections.update(sections =>
      sections.map(s => ({
        ...s,
        questions: s.questions.map(q => {
          if (q.id !== questionId) return q;
          const idx = q.options.length + 1;
          return { ...q, options: [...q.options, { id: crypto.randomUUID(), label: `Opção ${idx}`, value: `opcao_${idx}` }] };
        }),
      }))
    );
    this.markDirty();
  }

  removeOption(questionId: string, optionId: string): void {
    this.pushHistory();
    this.sections.update(sections =>
      sections.map(s => ({
        ...s,
        questions: s.questions.map(q =>
          q.id === questionId
            ? { ...q, options: q.options.filter(o => o.id !== optionId) }
            : q
        ),
      }))
    );
    this.markDirty();
  }

  updateOption(questionId: string, optionId: string, label: string): void {
    this.sections.update(sections =>
      sections.map(s => ({
        ...s,
        questions: s.questions.map(q =>
          q.id === questionId
            ? {
                ...q,
                options: q.options.map(o =>
                  o.id === optionId
                    ? { ...o, label, value: label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }
                    : o
                ),
              }
            : q
        ),
      }))
    );
    this.markDirty();
  }

  // ── Undo history ──

  private _history: BuilderSection[][] = [];
  private readonly MAX_HISTORY = 50;

  private pushHistory(): void {
    this._history.push(JSON.parse(JSON.stringify(this.sections())));
    if (this._history.length > this.MAX_HISTORY) {
      this._history.shift();
    }
  }

  undo(): boolean {
    if (this._history.length === 0) return false;
    this.sections.set(this._history.pop()!);
    this.markDirty();
    return true;
  }

  // ── Dirty tracking ──

  private markDirty(): void {
    this.dirty.set(true);
  }

  markClean(): void {
    this.dirty.set(false);
    this.lastSavedAt.set(new Date());
  }

  markSaving(saving: boolean): void {
    this.saving.set(saving);
  }
}
