import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

/** Interface mínima compatível com a Question do renderer e BuilderQuestion do preview. */
export interface RendererQuestion {
  id: string;
  type: string;
  label: string;
  description: string;
  required: boolean;
  placeholder: string;
  options: { id: string; label: string; value: string }[];
  validations: any;
  ratingConfig:  { max: number; icon?: string } | null;
  scaleConfig:   { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
  numberConfig:  { documentType: 'none' | 'cpf' | 'cnpj' } | null;
  matrixConfig:  { rows: { id: string; label: string }[]; columns: { id: string; label: string; value: number }[] } | null;
}

@Component({
  selector: 'app-question-field',
  imports: [
    CommonModule, FormsModule,
    InputTextModule, TextareaModule, RadioButtonModule, CheckboxModule,
    SelectModule, InputNumberModule, DatePickerModule,
    RatingModule, InputMaskModule, MessageModule,
  ],
  template: `
    @let q = question();

    <!-- Label + descrição (statement é exceção: sem label acima) -->
    @if (q.type !== 'statement') {
      <label class="block text-[15px] font-medium text-surface-900 dark:text-surface-0 mb-2 leading-snug">
        @if (showNumber() && questionNumber()) {
          <span class="text-surface-400 mr-1">{{ questionNumber() }}.</span>
        }
        {{ q.label || 'Pergunta sem título' }}
        @if (q.required) { <span class="text-red-500 ml-0.5">*</span> }
      </label>
      @if (q.description) {
        <p class="text-xs text-surface-400 mb-2">{{ q.description }}</p>
      }
    }

    <!-- ── Render por tipo ── -->
    @switch (q.type) {

      @case ('short_text') {
        <input pInputText class="w-full" [placeholder]="q.placeholder || ''"
               [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)" />
      }

      @case ('long_text') {
        <textarea pTextarea class="w-full" [rows]="4" [placeholder]="q.placeholder || ''"
                  [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)"></textarea>
      }

      @case ('email') {
        <input pInputText type="email" class="w-full" [placeholder]="q.placeholder || 'email&#64;exemplo.com'"
               [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)" />
      }

      @case ('phone') {
        <p-inputmask mask="(99) 99999-9999" [placeholder]="q.placeholder || '(00) 00000-0000'" styleClass="w-full"
               [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)" />
      }

      @case ('url') {
        <input pInputText type="url" class="w-full" [placeholder]="q.placeholder || 'https://'"
               [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)" />
      }

      @case ('number') {
        @if (q.numberConfig?.documentType === 'cpf') {
          <p-inputmask mask="999.999.999-99" [placeholder]="q.placeholder || '000.000.000-00'" styleClass="w-full"
                 [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)" />
        } @else if (q.numberConfig?.documentType === 'cnpj') {
          <p-inputmask mask="99.999.999/9999-99" [placeholder]="q.placeholder || '00.000.000/0000-00'" styleClass="w-full"
                 [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)" />
        } @else {
          <p-inputNumber [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)"
                         [placeholder]="q.placeholder || ''" styleClass="w-full" />
        }
      }

      @case ('date') {
        <p-datepicker [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)"
                      dateFormat="dd/mm/yy" styleClass="w-full" placeholder="Selecione uma data" />
      }

      @case ('single_choice') {
        <div class="flex flex-col gap-3">
          @for (opt of q.options; track opt.id) {
            <div class="flex items-center gap-2">
              <p-radiobutton [name]="q.id" [value]="opt.value"
                             [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)" />
              <label class="text-sm text-surface-700 dark:text-surface-200 cursor-pointer">{{ opt.label }}</label>
            </div>
          }
        </div>
      }

      @case ('multi_choice') {
        <div class="flex flex-col gap-3">
          @for (opt of q.options; track opt.id) {
            <div class="flex items-center gap-2">
              <p-checkbox [value]="opt.value"
                          [ngModel]="answer() || []"
                          (ngModelChange)="answerChange.emit($event)" />
              <label class="text-sm text-surface-700 dark:text-surface-200 cursor-pointer">{{ opt.label }}</label>
            </div>
          }
        </div>
      }

      @case ('dropdown') {
        <p-select [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)"
                  [options]="q.options" optionLabel="label" optionValue="value"
                  placeholder="Selecione uma opção" styleClass="w-full" />
      }

      @case ('matrix') {
        @if (q.matrixConfig) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th class="py-2 pr-4 text-left w-1/3"></th>
                  @for (col of q.matrixConfig.columns; track col.id) {
                    <th class="py-2 px-3 text-center font-medium text-surface-600 dark:text-surface-300 text-xs">{{ col.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of q.matrixConfig.rows; track row.id; let ri = $index) {
                  <tr [class]="ri % 2 === 0 ? 'bg-surface-50 dark:bg-surface-800' : 'bg-white dark:bg-surface-900'">
                    <td class="py-3 pr-4 pl-3 text-sm text-surface-700 dark:text-surface-200 font-medium rounded-l-lg">{{ row.label }}</td>
                    @for (col of q.matrixConfig.columns; track col.id) {
                      <td class="py-3 px-3 text-center">
                        <input
                          type="radio"
                          [name]="q.id + '_' + row.id"
                          [value]="col.id"
                          [checked]="answer()?.[row.id] === col.id"
                          (change)="setMatrixAnswer(row.id, col.id)"
                          class="w-4 h-4 accent-primary-600 cursor-pointer"
                        />
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      @case ('rating') {
        <p-rating [ngModel]="answer()" (ngModelChange)="answerChange.emit($event)"
                  [stars]="q.ratingConfig?.max ?? 5" />
      }

      @case ('scale') {
        <div class="flex items-center gap-3">
          <span class="text-xs text-surface-500 shrink-0">{{ q.scaleConfig?.minLabel }}</span>
          <div class="flex gap-1.5 flex-1 justify-center flex-wrap">
            @for (n of scaleRange(q.scaleConfig?.min ?? 1, q.scaleConfig?.max ?? 10); track n) {
              <button
                class="w-10 h-10 flex items-center justify-center border-[1.5px] rounded-[10px] text-sm font-medium cursor-pointer transition-all duration-150 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50"
                [ngClass]="answer() === n
                  ? 'bg-primary-600 text-white border-primary-600 scale-[1.08]'
                  : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-500'"
                (click)="answerChange.emit(n)"
              >{{ n }}</button>
            }
          </div>
          <span class="text-xs text-surface-500 shrink-0">{{ q.scaleConfig?.maxLabel }}</span>
        </div>
      }

      @case ('file_upload') {
        <div class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl cursor-pointer transition-all duration-200 hover:border-primary-300 hover:bg-surface-50 dark:hover:bg-surface-800"
          (click)="fileInput.click()"
          (dragover)="$event.preventDefault()"
          (drop)="onFileDrop($event)">
          <input #fileInput type="file" hidden [multiple]="true" (change)="onFileSelect($event)" />
          <i class="pi pi-cloud-upload text-2xl text-surface-300 mb-2"></i>
          <p class="text-sm text-surface-500">Arraste arquivos ou clique para enviar</p>
          @if (q.validations?.maxFiles) {
            <p class="text-xs text-surface-400 mt-1">Máx. {{ q.validations.maxFiles }} arquivos</p>
          }
        </div>
        @if (fileNames().length) {
          <div class="mt-2 space-y-1">
            @for (fname of fileNames(); track fname; let fi = $index) {
              <div class="flex items-center gap-2 text-[13px] text-surface-500 bg-surface-50 dark:bg-surface-800 rounded-lg px-3 py-2">
                <i class="pi pi-file text-xs text-surface-400"></i>
                <span class="flex-1 truncate">{{ fname }}</span>
                <button class="bg-transparent border-0 p-0 text-surface-400 cursor-pointer transition-colors duration-150 hover:text-red-500 leading-none"
                        (click)="fileRemove.emit(fi)">
                  <i class="pi pi-times text-xs"></i>
                </button>
              </div>
            }
          </div>
        }
      }

      @case ('statement') {
        <div class="flex gap-2.5 px-[18px] py-[14px] bg-primary-50 dark:bg-primary-950 rounded-[10px]">
          <i class="pi pi-info-circle text-primary-400 shrink-0 mt-0.5"></i>
          <span class="text-sm text-surface-600 dark:text-surface-300">{{ q.label }}</span>
        </div>
      }

    }

    <!-- Erro de validação -->
    @if (error()) {
      <p-message severity="error" [text]="error()!" styleClass="mt-2 w-full" />
    }
  `,
})
export class QuestionFieldComponent {
  readonly question    = input.required<RendererQuestion>();
  readonly answer      = input<any>(undefined);
  readonly error       = input<string | null>(null);
  readonly fileNames   = input<string[]>([]);
  readonly showNumber      = input(false);
  readonly questionNumber  = input<number | null>(null);

  readonly answerChange  = output<any>();
  readonly filesSelected = output<File[]>();
  readonly fileRemove    = output<number>();

  setMatrixAnswer(rowId: string, colId: string): void {
    this.answerChange.emit({ ...(this.answer() ?? {}), [rowId]: colId });
  }

  onFileSelect(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files?.length) this.filesSelected.emit(Array.from(files));
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      this.filesSelected.emit(Array.from(event.dataTransfer.files));
    }
  }

  scaleRange(min: number, max: number): number[] {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
}
