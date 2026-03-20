import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { Router } from '@angular/router';
import { AuthStore } from '@core/auth/auth.store';
import { FormApiService, FormResponse } from '@core/api/form-api.service';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, RouterLink, ButtonModule, SkeletonModule],
    template: `
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="ff-page-title">
          Olá, {{ store.userName().split(' ')[0] }} 👋
        </h1>
        <p class="ff-page-subtitle">Aqui está um resumo dos seus formulários</p>
      </div>

      <button
        pButton
        label="Novo formulário"
        icon="pi pi-plus"
        (click)="newForm()"
        class="p-button-sm"
      ></button>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      @for (stat of stats(); track stat.label) {
        <div class="ff-card flex items-center gap-4">
          <div [class]="'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ' + stat.bgClass">
            <i [class]="stat.icon + ' text-lg ' + stat.iconClass"></i>
          </div>
          <div>
            <p class="text-2xl font-display font-bold text-surface-900 dark:text-surface-50">{{ stat.value }}</p>
            <p class="text-xs text-surface-500 mt-0.5">{{ stat.label }}</p>
          </div>
        </div>
      }
    </div>

    <!-- Recent forms -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-display font-semibold text-surface-900 dark:text-surface-50">Formulários recentes</h2>
        <a routerLink="/forms" class="ff-link text-sm">Ver todos →</a>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (i of [1,2,3]; track i) {
            <div class="ff-card">
              <p-skeleton height="20px" width="60%" styleClass="mb-3" />
              <p-skeleton height="14px" width="90%" styleClass="mb-2" />
              <p-skeleton height="14px" width="40%" />
            </div>
          }
        </div>
      } @else if (recentForms().length === 0) {
        <div class="ff-card text-center py-12">
          <div class="w-16 h-16 mx-auto mb-4 bg-surface-50 dark:bg-surface-700 rounded-2xl
                      flex items-center justify-center">
            <i class="pi pi-file-edit text-2xl text-surface-300"></i>
          </div>
          <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-1">Nenhum formulário ainda</h3>
          <p class="text-sm text-surface-500 mb-4">Crie seu primeiro formulário para começar</p>
          <button
            pButton label="Criar formulário" icon="pi pi-plus"
            (click)="newForm()" class="p-button-sm p-button-outlined"
          ></button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (form of recentForms(); track form.id) {
            <div class="ff-card group cursor-pointer" [routerLink]="['/forms', form.id, 'edit']">
              <div class="flex items-start justify-between mb-3">
                <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-50 group-hover:text-primary-600
                           transition-colors line-clamp-1">
                  {{ form.title }}
                </h3>
                <span [class]="getStatusBadgeClass(form.status)">
                  {{ getStatusLabel(form.status) }}
                </span>
              </div>

              @if (form.description) {
                <p class="text-xs text-surface-500 line-clamp-2 mb-3">{{ form.description }}</p>
              }

              <div class="flex items-center gap-4 text-xs text-surface-400 mt-auto pt-3 border-t border-surface-100 dark:border-surface-700">
                @if (form.currentVersion) {
                  <span class="flex items-center gap-1">
                    <i class="pi pi-tag text-[10px]"></i>
                    v{{ form.currentVersion }}
                  </span>
                }
                <span class="flex items-center gap-1">
                  <i class="pi pi-calendar text-[10px]"></i>
                  {{ formatDate(form.updatedAt) }}
                </span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  readonly store = inject(AuthStore);
  private readonly formApi = inject(FormApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly recentForms = signal<FormResponse[]>([]);

  readonly stats = signal([
    { label: 'Formulários',     value: '—', icon: 'pi pi-file-edit',    bgClass: 'bg-blue-50 dark:bg-blue-900/30',    iconClass: 'text-blue-600 dark:text-blue-400' },
    { label: 'Publicados',      value: '—', icon: 'pi pi-check-circle', bgClass: 'bg-emerald-50 dark:bg-emerald-900/30', iconClass: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Respostas total', value: '—', icon: 'pi pi-inbox',        bgClass: 'bg-violet-50 dark:bg-violet-900/30',  iconClass: 'text-violet-600 dark:text-violet-400' },
    { label: 'Esta semana',     value: '—', icon: 'pi pi-chart-line',   bgClass: 'bg-amber-50 dark:bg-amber-900/30',   iconClass: 'text-amber-600 dark:text-amber-400' },
  ]);

  ngOnInit(): void {
    this.loadForms();
    this.loadStats();
  }

  private loadForms(): void {
    this.formApi.list(0, 6).subscribe({
      next: (data) => {
        this.recentForms.set(data.content);
        const total = data.page.totalElements;
        const published = data.content.filter(f => f.status === 'PUBLISHED').length;
        this.stats.update(s => [
          { ...s[0], value: String(total) },
          { ...s[1], value: String(published) },
          s[2],
          s[3],
        ]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadStats(): void {
    this.formApi.getDashboardStats().subscribe({
      next: ({ totalResponses, responsesThisWeek }) => {
        this.stats.update(s => [
          s[0],
          s[1],
          { ...s[2], value: String(totalResponses) },
          { ...s[3], value: String(responsesThisWeek) },
        ]);
      },
      error: (err) => console.error('[Dashboard] Falha ao carregar stats:', err),
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'ff-badge-published';
      case 'ARCHIVED':  return 'ff-badge-archived';
      default:          return 'ff-badge-draft';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'Publicado';
      case 'ARCHIVED':  return 'Arquivado';
      default:          return 'Rascunho';
    }
  }

  newForm(): void {
    this.router.navigate(['/forms'], { queryParams: { new: '1' } });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
