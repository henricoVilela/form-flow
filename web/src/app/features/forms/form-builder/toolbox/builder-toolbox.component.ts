import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QUESTION_TYPES, QuestionTypeInfo } from '../builder.models';
import { BuilderStore } from '../builder.store';

interface TypeGroup {
  label: string;
  types: QuestionTypeInfo[];
}

@Component({
  selector: 'app-builder-toolbox',
  imports: [CommonModule],
  template: `
    <div class="toolbox">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-surface-400 px-4 mb-3">
        Componentes
      </h3>

      @for (group of groups; track group.label) {
        <div class="mb-4">
          <span class="block text-[11px] font-medium text-surface-400 px-4 mb-1.5">
            {{ group.label }}
          </span>

          @for (qType of group.types; track qType.type) {
            <button
              class="toolbox-item"
              (click)="addToCanvas(qType)"
              [title]="'Clique para adicionar ' + qType.label"
            >
              <i [class]="qType.icon + ' text-sm text-primary-500'"></i>
              <span class="text-sm text-surface-700">{{ qType.label }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .toolbox {
      padding: 16px 0;
      overflow-y: auto;
      height: 100%;
    }

    .toolbox-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: calc(100% - 16px);
      margin: 0 8px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      transition: all 150ms ease;
      text-align: left;
    }

    .toolbox-item:hover {
      background: var(--ff-surface-hover);
      border-color: var(--ff-border);
    }

    .toolbox-item:active {
      transform: scale(0.98);
      background: #eff6ff;
      border-color: #bfdbfe;
    }
  `],
})
export class BuilderToolboxComponent {
  private readonly store = inject(BuilderStore);

  readonly groups: TypeGroup[];

  constructor() {
    // Group question types
    const groupMap = new Map<string, QuestionTypeInfo[]>();
    for (const qt of QUESTION_TYPES) {
      const arr = groupMap.get(qt.group) ?? [];
      arr.push(qt);
      groupMap.set(qt.group, arr);
    }
    this.groups = Array.from(groupMap.entries()).map(([label, types]) => ({ label, types }));
  }

  addToCanvas(qType: QuestionTypeInfo): void {
    const sections = this.store.sections();
    if (sections.length === 0) return;

    // Add to selected section, or last section
    const targetId = this.store.selectedSectionId() ?? sections[sections.length - 1].id;
    this.store.addQuestion(targetId, qType.type);
  }
}
