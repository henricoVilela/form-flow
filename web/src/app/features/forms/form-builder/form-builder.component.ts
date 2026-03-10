import { Component, inject, OnInit, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { FormApiService, FormResponse } from '@core/api/form-api.service';

/**
 * Placeholder para o Form Builder.
 * Será substituído pela implementação completa com drag & drop.
 */
@Component({
  selector: 'app-form-builder',
  imports: [CommonModule, RouterLink, ButtonModule, SkeletonModule],
  template: `
    @if (loading()) {
      <div class="space-y-4">
        <p-skeleton height="32px" width="300px" />
        <p-skeleton height="20px" width="200px" />
        <p-skeleton height="400px" styleClass="mt-6" />
      </div>
    } @else if (form()) {
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <a routerLink="/forms"
             class="w-9 h-9 flex items-center justify-center rounded-lg
                    hover:bg-surface-100 transition-colors text-surface-500">
            <i class="pi pi-arrow-left"></i>
          </a>
          <div>
            <h1 class="ff-page-title">{{ form()!.title }}</h1>
            <p class="ff-page-subtitle">
              {{ form()!.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
              @if (form()!.currentVersion) {
                · v{{ form()!.currentVersion }}
              }
            </p>
          </div>
        </div>

        <div class="flex gap-2">
          <button pButton label="Preview" icon="pi pi-eye" severity="secondary" [outlined]="true"></button>
          <button pButton label="Publicar" icon="pi pi-send"></button>
        </div>
      </div>

      <!-- Placeholder content -->
      <div class="ff-card text-center py-20">
        <div class="w-24 h-24 mx-auto mb-6 bg-primary-50 rounded-2xl
                    flex items-center justify-center">
          <i class="pi pi-wrench text-4xl text-primary-400"></i>
        </div>
        <h2 class="text-xl font-display font-bold text-surface-800 mb-2">
          Form Builder
        </h2>
        <p class="text-surface-500 max-w-md mx-auto mb-6">
          O editor visual com drag & drop será implementado na próxima etapa.
          Aqui você poderá adicionar seções, perguntas de vários tipos,
          lógica condicional e preview em tempo real.
        </p>
        <div class="flex justify-center gap-2">
          <a routerLink="/forms">
            <button pButton label="Voltar à listagem" icon="pi pi-arrow-left" severity="secondary" [text]="true"></button>
          </a>
        </div>
      </div>
    }
  `,
})
export class FormBuilderComponent implements OnInit {
  private readonly formApi = inject(FormApiService);

  /** ID do formulário vindo da rota (:id) */
  readonly id = input.required<string>();

  readonly loading = signal(true);
  readonly form = signal<FormResponse | null>(null);

  ngOnInit(): void {
    this.formApi.getById(this.id()).subscribe({
      next: (form) => {
        this.form.set(form);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
