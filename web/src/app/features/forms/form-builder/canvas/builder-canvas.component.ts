import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { BuilderStore } from '../builder.store';
import { QUESTION_TYPES } from '../builder.models';

@Component({
  selector: 'app-builder-canvas',
  imports: [CommonModule, FormsModule, CdkDrag, CdkDropList, ButtonModule, InputTextModule, TooltipModule, CdkDragPlaceholder],
  template: `
    <div class="canvas" (click)="onCanvasClick($event)">
      @for (section of store.sections(); track section.id; let si = $index) {
        <div
          class="canvas-section"
          [class.canvas-section--active]="store.selectedSectionId() === section.id"
        >
          <div class="section-header" (click)="onSectionHeaderClick($event, section.id)">
            <div class="flex-1 min-w-0">
              <input
                class="section-title-input"
                [value]="section.title"
                (input)="onSectionTitleChange(section.id, $event)"
                (focus)="onSectionFocus(section.id)"
                placeholder="Título da seção"
              />
              <input
                class="section-desc-input"
                [value]="section.description"
                (input)="onSectionDescChange(section.id, $event)"
                (focus)="onSectionFocus(section.id)"
                placeholder="Descrição (opcional)"
              />
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <!-- Indicador de seção selecionada -->
              @if (store.selectedSectionId() === section.id) {
                <span class="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium mr-1">
                  Ativa
                </span>
              }
              <button class="icon-btn" (click)="store.moveSectionUp(section.id); $event.stopPropagation()" [disabled]="si === 0"
                      pTooltip="Mover acima" tooltipPosition="top">
                <i class="pi pi-chevron-up text-xs"></i>
              </button>
              <button class="icon-btn" (click)="store.moveSectionDown(section.id); $event.stopPropagation()"
                      [disabled]="si === store.sections().length - 1"
                      pTooltip="Mover abaixo" tooltipPosition="top">
                <i class="pi pi-chevron-down text-xs"></i>
              </button>
              <button class="icon-btn icon-btn--danger" (click)="store.removeSection(section.id); $event.stopPropagation()"
                      [disabled]="store.sections().length <= 1"
                      pTooltip="Remover seção" tooltipPosition="top">
                <i class="pi pi-trash text-xs"></i>
              </button>
            </div>
          </div>

          <!-- Questions drop list -->
          <div
            cdkDropList
            [cdkDropListData]="section.id"
            (cdkDropListDropped)="onDrop($event, section.id)"
            class="questions-list"
            [class.questions-list--empty]="section.questions.length === 0"
          >
            @for (question of section.questions; track question.id; let qi = $index) {
              <div
                cdkDrag
                class="question-card"
                [class.question-card--selected]="store.selectedQuestionId() === question.id"
                (click)="selectQuestion($event, question.id, section.id)"
              >
                <div class="drag-handle" cdkDragHandle>
                  <i class="pi pi-bars text-xs text-surface-300"></i>
                </div>

                <div class="question-body">
                  <div class="flex items-center gap-2 mb-1">
                    <i [class]="getIcon(question.type) + ' text-xs text-primary-400'"></i>
                    <span class="text-[11px] text-surface-400 font-medium">
                      {{ getTypeLabel(question.type) }}
                    </span>
                    @if (question.required) {
                      <span class="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">
                        Obrigatório
                      </span>
                    }
                    @if (question.conditions) {
                      <span class="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium"
                            pTooltip="Condicional" tooltipPosition="top">
                        <i class="pi pi-bolt text-[9px]"></i> Condição
                      </span>
                    }
                  </div>

                  <p class="text-sm text-surface-800 font-medium">
                    {{ question.label || 'Pergunta sem título' }}
                  </p>

                  @if (question.description) {
                    <p class="text-xs text-surface-400 mt-0.5 line-clamp-1">{{ question.description }}</p>
                  }

                  @if (hasOptions(question.type) && question.options.length > 0) {
                    <div class="flex flex-wrap gap-1.5 mt-2">
                      @for (opt of question.options.slice(0, 4); track opt.id) {
                        <span class="text-[11px] px-2 py-0.5 bg-surface-50 text-surface-500 rounded-md border border-surface-200">
                          {{ opt.label || 'Sem label' }}
                        </span>
                      }
                      @if (question.options.length > 4) {
                        <span class="text-[11px] px-2 py-0.5 text-surface-400">
                          +{{ question.options.length - 4 }}
                        </span>
                      }
                    </div>
                  }
                </div>

                <div class="question-actions">
                  <button class="icon-btn-sm" (click)="store.duplicateQuestion(question.id); $event.stopPropagation()"
                          pTooltip="Duplicar" tooltipPosition="top">
                    <i class="pi pi-copy text-xs"></i>
                  </button>
                  <button class="icon-btn-sm icon-btn--danger" (click)="store.removeQuestion(question.id); $event.stopPropagation()"
                          pTooltip="Remover" tooltipPosition="top">
                    <i class="pi pi-trash text-xs"></i>
                  </button>
                </div>

                <div *cdkDragPlaceholder class="drag-placeholder"></div>
              </div>
            }

            @if (section.questions.length === 0) {
              <div class="empty-section" (click)="onSectionHeaderClick($event, section.id)">
                <i class="pi pi-plus-circle text-xl text-surface-300 mb-2"></i>
                <p class="text-sm text-surface-400">
                  @if (store.selectedSectionId() === section.id) {
                    Seção selecionada — clique em um componente à esquerda
                  } @else {
                    Clique aqui para selecionar esta seção
                  }
                </p>
              </div>
            }
          </div>
        </div>
      }

      <button class="add-section-btn" (click)="store.addSection()">
        <i class="pi pi-plus text-sm"></i>
        <span>Adicionar seção</span>
      </button>
    </div>
  `,
  styles: [`
    .canvas { max-width: 720px; margin: 0 auto; padding: 0 16px 60px; }

    .canvas-section {
      background: white; border: 2px solid var(--ff-border);
      border-radius: 12px; margin-bottom: 20px; transition: border-color 200ms ease;
    }
    .canvas-section--active { border-color: #93c5fd; }

    .section-header {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 16px 20px 12px; border-bottom: 1px solid var(--ff-border);
      cursor: pointer; transition: background 150ms;
    }
    .section-header:hover { background: #fafbfc; }

    .section-title-input {
      display: block; width: 100%; border: none; outline: none;
      font-size: 16px; font-weight: 600;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      color: var(--ff-text); background: transparent; padding: 2px 0;
    }
    .section-title-input::placeholder { color: var(--ff-text-muted); font-weight: 400; }

    .section-desc-input {
      display: block; width: 100%; border: none; outline: none;
      font-size: 13px; color: var(--ff-text-secondary);
      background: transparent; padding: 2px 0; margin-top: 2px;
    }
    .section-desc-input::placeholder { color: var(--ff-text-muted); }

    .questions-list { min-height: 40px; padding: 8px; }
    .questions-list--empty { padding: 0; }

    .question-card {
      display: flex; align-items: flex-start; gap: 8px; padding: 12px; margin: 4px 0;
      border: 1.5px solid transparent; border-radius: 10px; cursor: pointer;
      transition: all 150ms ease; background: white;
    }
    .question-card:hover { background: #f8fafc; border-color: var(--ff-border); }
    .question-card--selected { background: #eff6ff !important; border-color: #93c5fd !important; }

    .drag-handle { padding: 4px 2px; cursor: grab; opacity: 0.4; transition: opacity 150ms; }
    .drag-handle:hover { opacity: 1; }
    .question-card:hover .drag-handle { opacity: 0.7; }

    .question-body { flex: 1; min-width: 0; }

    .question-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 150ms; }
    .question-card:hover .question-actions { opacity: 1; }

    .drag-placeholder {
      height: 52px; border: 2px dashed #93c5fd; border-radius: 10px;
      background: #eff6ff; margin: 4px 0;
    }

    :host ::ng-deep .cdk-drag-preview {
      box-shadow: 0 8px 24px rgba(0,0,0,0.12); border-radius: 10px;
      background: white; border: 1.5px solid #93c5fd;
    }

    .empty-section {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 32px 16px; text-align: center; cursor: pointer;
    }
    .empty-section:hover { background: #f8fafc; border-radius: 0 0 10px 10px; }

    .add-section-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 14px; border: 2px dashed var(--ff-border); border-radius: 12px;
      background: transparent; color: var(--ff-text-secondary); font-size: 14px;
      font-weight: 500; cursor: pointer; transition: all 200ms ease;
    }
    .add-section-btn:hover { border-color: #93c5fd; color: var(--ff-primary); background: #eff6ff; }

    .icon-btn {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border: none; border-radius: 6px; background: transparent;
      color: var(--ff-text-muted); cursor: pointer; transition: all 150ms;
    }
    .icon-btn:hover { background: var(--ff-surface-hover); color: var(--ff-text-secondary); }
    .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .icon-btn--danger:hover { background: #fef2f2; color: #ef4444; }

    .icon-btn-sm {
      width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
      border: none; border-radius: 5px; background: transparent;
      color: var(--ff-text-muted); cursor: pointer; transition: all 150ms;
    }
    .icon-btn-sm:hover { background: var(--ff-surface-hover); color: var(--ff-text-secondary); }
    .icon-btn-sm.icon-btn--danger:hover { background: #fef2f2; color: #ef4444; }
  `],
})
export class BuilderCanvasComponent {
  readonly store = inject(BuilderStore);

  onDrop(event: CdkDragDrop<string>, sectionId: string): void {
    if (event.previousContainer === event.container) {
      this.store.reorderQuestions(sectionId, event.previousIndex, event.currentIndex);
    }
  }

  /** ✅ FIX: Clicar no header da seção seleciona ela */
  onSectionHeaderClick(event: Event, sectionId: string): void {
    event.stopPropagation();
    this.store.selectSection(sectionId);
  }

  /** ✅ FIX: Focar nos inputs do header também seleciona a seção */
  onSectionFocus(sectionId: string): void {
    this.store.selectSection(sectionId);
  }

  selectQuestion(event: Event, questionId: string, sectionId: string): void {
    event.stopPropagation();
    this.store.selectQuestion(questionId, sectionId);
  }

  onCanvasClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('canvas')) {
      this.store.clearSelection();
    }
  }

  onSectionTitleChange(sectionId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.updateSection(sectionId, { title: value });
  }

  onSectionDescChange(sectionId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.updateSection(sectionId, { description: value });
  }

  getIcon(type: string): string {
    return QUESTION_TYPES.find(t => t.type === type)?.icon ?? 'pi pi-question';
  }

  getTypeLabel(type: string): string {
    return QUESTION_TYPES.find(t => t.type === type)?.label ?? type;
  }

  hasOptions(type: string): boolean {
    return ['single_choice', 'multi_choice', 'dropdown'].includes(type);
  }
}
