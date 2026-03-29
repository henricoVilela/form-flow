import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { FormApiService, FormResponse } from '@core/api/form-api.service';

@Component({
  selector: 'app-responses',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, IconFieldModule, InputIconModule,
    TagModule, SkeletonModule, TooltipModule,
  ],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="ff-page-title">Respostas</h1>
        <p class="ff-page-subtitle">Selecione um formulário para visualizar as respostas</p>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <p-iconfield class="w-full sm:w-80">
        <p-inputicon styleClass="pi pi-search" />
        <input pInputText type="text" placeholder="Buscar formulários..."
               class="w-full" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
      </p-iconfield>
    </div>

    <!-- Skeleton -->
    @if (loading()) {
      <div class="space-y-3">
        @for (i of [1,2,3,4,5]; track i) {
          <div class="ff-card p-4 flex items-center gap-4">
            <p-skeleton width="2rem" height="2rem" styleClass="rounded-lg shrink-0" />
            <div class="flex-1">
              <p-skeleton width="40%" height="1rem" styleClass="mb-2" />
              <p-skeleton width="20%" height="0.75rem" />
            </div>
            <p-skeleton width="5rem" height="2rem" styleClass="rounded-lg" />
          </div>
        }
      </div>
    }

    <!-- Empty state -->
    @if (!loading() && filtered().length === 0) {
      <div class="text-center py-16 text-surface-400 dark:text-surface-500">
        <i class="pi pi-inbox text-4xl mb-3 block"></i>
        <p class="text-sm">
          @if (searchQuery()) {
            Nenhum formulário encontrado para "{{ searchQuery() }}"
          } @else {
            Nenhum formulário publicado ainda
          }
        </p>
      </div>
    }

    <!-- List -->
    @if (!loading() && filtered().length > 0) {
      <div class="space-y-3">
        @for (form of filtered(); track form.id) {
          <div class="ff-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow duration-200">
            <div class="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
              <i class="pi pi-file-edit text-primary-600 dark:text-primary-300"></i>
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-surface-900 dark:text-surface-0 truncate">{{ form.title }}</p>
              <p class="text-xs text-surface-400 mt-0.5">
                Atualizado em {{ form.updatedAt | date:'dd/MM/yyyy' }}
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <p-tag
                [value]="statusLabel(form.status)"
                [severity]="statusSeverity(form.status)"
              />
              @if (form.responseCount > 0) {
                <span
                  class="text-xs text-primary-600 dark:text-primary-300 min-w-[60px] text-right cursor-pointer hover:underline"
                  (click)="goToResponses(form.id)"
                >
                  <i class="pi pi-inbox mr-1 text-[10px]"></i>
                  {{ form.responseCount }} {{ form.responseCount === 1 ? 'resposta' : 'respostas' }}
                </span>
              } @else {
                <span class="text-xs text-surface-400 dark:text-surface-500 min-w-[60px] text-right">
                  <i class="pi pi-inbox mr-1 text-[10px]"></i>
                  Sem respostas
                </span>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ResponsesComponent implements OnInit {
  private readonly api = inject(FormApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly forms = signal<FormResponse[]>([]);
  readonly searchQuery = signal('');

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.forms().filter(f =>
      !q || f.title.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.api.list(0, 200).subscribe({
      next: page => {
        this.forms.set(page.content.filter(f => f.status !== 'ARCHIVED'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToResponses(formId: string): void {
    this.router.navigate(['/forms', formId, 'responses']);
  }

  statusLabel(status: string): string {
    return status === 'PUBLISHED' ? 'Publicado' : 'Rascunho';
  }

  statusSeverity(status: string): 'success' | 'secondary' {
    return status === 'PUBLISHED' ? 'success' : 'secondary';
  }
}
