import { Component, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '@core/auth/auth.store';
import { LayoutService } from '../layout.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
    selector: 'app-sidebar',
    imports: [CommonModule, RouterLink, RouterLinkActive],
    template: `
    <!-- Logo -->
    <div class="px-6 h-[4.55rem] flex items-center border-b border-surface-100 dark:border-surface-700">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <i class="pi pi-bolt text-white text-sm"></i>
        </div>
        <span class="font-display font-bold text-lg tracking-tight text-surface-900 dark:text-surface-50">
          FormFlow
        </span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <span class="block px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
        Principal
      </span>

      @for (item of mainNav; track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold"
          [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-surface-400
                 hover:bg-surface-50 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-surface-100
                 transition-all duration-200 group"
          (click)="layout.close()"
        >
          <i [class]="item.icon + ' text-base opacity-70 group-hover:opacity-100 transition-opacity'"></i>
          <span>{{ item.label }}</span>
        </a>
      }

      <div class="pt-4 pb-2">
        <span class="block px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          Conta
        </span>
      </div>

      @for (item of accountNav; track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-surface-400
                 hover:bg-surface-50 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-surface-100
                 transition-all duration-200 group"
          (click)="layout.close()"
        >
          <i [class]="item.icon + ' text-base opacity-70 group-hover:opacity-100 transition-opacity'"></i>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>

    <!-- User footer -->
    <div class="px-3 py-4 border-t border-surface-100 dark:border-surface-700">
      <div class="flex items-center gap-3 px-3 py-2 rounded-lg">
        <div class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300
                    flex items-center justify-center text-sm font-semibold shrink-0">
          {{ store.userInitials() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">{{ store.userName() }}</p>
          <p class="text-xs text-surface-400 truncate">{{ store.userEmail() }}</p>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: var(--ff-sidebar-width);
      height: 100vh;
      background: var(--ff-surface);
      border-right: 1px solid var(--ff-border);
      position: fixed;
      left: 0;
      top: 0;
      z-index: 40;
      transition: transform 0.3s ease;
    }

    @media (max-width: 768px) {
      :host { transform: translateX(-100%); }
      :host.open { transform: translateX(0); }
    }
  `]
})
export class SidebarComponent {
  readonly store = inject(AuthStore);
  readonly layout = inject(LayoutService);

  @HostBinding('class.open')
  get isOpen(): boolean { return this.layout.sidebarOpen(); }

  readonly mainNav: NavItem[] = [
    { label: 'Dashboard',    icon: 'pi pi-home',       route: '/dashboard' },
    { label: 'Formulários',  icon: 'pi pi-file-edit',  route: '/forms' },
    { label: 'Respostas',    icon: 'pi pi-inbox',      route: '/responses' },
    { label: 'Analytics',    icon: 'pi pi-chart-bar',  route: '/analytics' },
  ];

  readonly accountNav: NavItem[] = [
    { label: 'Meu Perfil', icon: 'pi pi-user', route: '/settings/profile' },
  ];
}
