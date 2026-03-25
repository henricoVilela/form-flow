import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { FormApiService, CreateFormRequest, FormResponse } from '@core/api/form-api.service';
import { MessageService } from 'primeng/api';
import { finalize, switchMap, map, of } from 'rxjs';

@Component({
  selector: 'app-create-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule,
    DialogModule, InputTextModule, TextareaModule, SelectModule, ButtonModule, TooltipModule,
  ],
  template: `
    <p-dialog
      header="Novo formulário"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '480px', minHeight: '40rem' }"
      (onHide)="onClose()"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5 pt-2">
        <!-- Título -->
        <div>
          <label for="title" class="ff-input-label">Título *</label>
          <input
            pInputText
            id="title"
            formControlName="title"
            placeholder="Ex: Pesquisa de Satisfação"
            class="w-full"
            autofocus
          />
          @if (form.controls.title.dirty && form.controls.title.hasError('required')) {
            <small class="text-red-500 mt-1 block">Título é obrigatório</small>
          }
        </div>

        <!-- Descrição -->
        <div>
          <label for="description" class="ff-input-label">Descrição</label>
          <textarea
            pTextarea
            id="description"
            formControlName="description"
            placeholder="Breve descrição do formulário (opcional)"
            [rows]="3"
            class="w-full"
          ></textarea>
        </div>

        <!-- Layout -->
        <div>
          <label for="layout" class="ff-input-label">Layout</label>
          <p-select
            id="layout"
            formControlName="layout"
            [options]="layoutOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecione o layout"
            styleClass="w-full"
          />
          <small class="text-surface-400 mt-1 block">
            @if (form.value.layout === 'SINGLE_PAGE') { Todas as perguntas em uma página }
            @else if (form.value.layout === 'KIOSK') { Avaliação presencial para totens e quiosques }
            @else { Uma seção por vez (wizard) }
          </small>
        </div>

        <!-- Cor primária -->
        <div>
          <label class="ff-input-label">Cor primária</label>
          <div class="flex items-center gap-3">
            <div class="relative w-10 h-10 rounded-lg overflow-hidden border border-surface-200 cursor-pointer shadow-sm flex-shrink-0">
              <div class="w-full h-full" [style.background]="primaryColor"></div>
              <input
                type="color"
                [value]="primaryColor"
                (input)="onColorInput($event)"
                class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
            <span class="text-sm font-mono text-surface-600 uppercase">{{ primaryColor }}</span>
            @if (primaryColor !== DEFAULT_COLOR) {
              <button pButton [text]="true" severity="secondary" size="small" icon="pi pi-refresh"
                      (click)="primaryColor = DEFAULT_COLOR"
                      pTooltip="Restaurar padrão" tooltipPosition="top"></button>
            }
          </div>
        </div>
      </form>

      <ng-template #footer>
        <div class="flex justify-end gap-2 pt-2">
          <button
            pButton
            label="Cancelar"
            severity="secondary"
            [text]="true"
            (click)="onClose()"
          ></button>
          <button
            pButton
            label="Criar formulário"
            icon="pi pi-plus"
            [loading]="saving"
            [disabled]="form.invalid || saving"
            (click)="onSubmit()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class CreateFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly formApi = inject(FormApiService);
  private readonly toast = inject(MessageService);

  /** Evento emitido quando um formulário é criado com sucesso */
  readonly created = output<FormResponse>();

  visible = false;
  saving = false;

  readonly DEFAULT_COLOR = '#6366f1';
  primaryColor = this.DEFAULT_COLOR;

  readonly layoutOptions = [
    { label: 'Multi-step (Wizard)', value: 'MULTI_STEP' },
    { label: 'Página única', value: 'SINGLE_PAGE' },
    { label: 'Totem / Kiosk', value: 'KIOSK' },
  ];

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    layout: ['MULTI_STEP' as 'MULTI_STEP' | 'SINGLE_PAGE' | 'KIOSK'],
  });

  open(): void {
    this.form.reset({ title: '', description: '', layout: 'MULTI_STEP' });
    this.primaryColor = this.DEFAULT_COLOR;
    this.visible = true;
  }

  onColorInput(event: Event): void {
    this.primaryColor = (event.target as HTMLInputElement).value;
  }

  onClose(): void {
    this.visible = false;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const request: CreateFormRequest = this.form.getRawValue();
    const color = this.primaryColor;

    this.formApi.create(request).pipe(
      switchMap(form => {
        if (color === this.DEFAULT_COLOR) return of(form);
        return this.formApi.update(form.id, {
          title: form.title,
          schema: {
            sections: [],
            settings: { showProgressBar: true, showQuestionNumbers: false, theme: { primaryColor: color } },
          },
        }).pipe(map(() => form));
      }),
      finalize(() => this.saving = false),
    ).subscribe({
      next: (form) => {
        this.toast.add({
          severity: 'success',
          summary: 'Formulário criado!',
          detail: form.title,
        });
        this.visible = false;
        this.created.emit(form);
      },
      error: (err) => {
        this.toast.add({
          severity: 'error',
          summary: 'Erro ao criar',
          detail: err.error?.message ?? 'Tente novamente',
        });
      },
    });
  }
}
