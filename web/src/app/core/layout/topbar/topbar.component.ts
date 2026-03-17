import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { AuthStore } from '@core/auth/auth.store';
import { AuthService } from '@core/auth/auth.service';
import { LayoutService } from '../layout.service';
import { ThemeService } from '../theme.service';

@Component({
    selector: 'app-topbar',
    imports: [CommonModule, MenuModule, ButtonModule, TooltipModule],
    template: `
    <header class="topbar">
      <!-- Left: hamburger (mobile) -->
      <div class="flex items-center gap-3">
        <button
          class="md:hidden w-9 h-9 flex items-center justify-center rounded-lg
                 hover:bg-surface-100 transition-colors text-surface-600"
          (click)="layout.toggle()"
          aria-label="Menu"
        >
          <i class="pi pi-bars text-base"></i>
        </button>
      </div>

      <!-- Right: actions -->
      <div class="flex items-center gap-2">
        <!-- Dark mode toggle -->
        <button
          (click)="theme.toggle()"
          [pTooltip]="theme.isDark() ? 'Modo claro' : 'Modo escuro'"
          tooltipPosition="bottom"
          class="w-9 h-9 flex items-center justify-center rounded-lg
                 hover:bg-surface-100 dark:hover:bg-surface-700
                 transition-colors text-surface-600 dark:text-surface-300"
          aria-label="Alternar tema"
        >
          <i [class]="theme.isDark() ? 'pi pi-sun text-base' : 'pi pi-moon text-base'"></i>
        </button>

        <!-- User menu -->
        <button
          (click)="userMenu.toggle($event)"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg
                 hover:bg-surface-50 transition-colors duration-200 cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700
                      flex items-center justify-center text-xs font-semibold">
            {{ store.userInitials() }}
          </div>
          <span class="text-sm font-medium text-surface-700 hidden sm:inline">
            {{ store.userName() }}
          </span>
          <i class="pi pi-chevron-down text-[10px] text-surface-400"></i>
        </button>

        <p-menu #userMenu [model]="menuItems" [popup]="true" appendTo="body" />
      </div>
    </header>
  `,
    styles: [`
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--ff-topbar-height);
      padding: 0 24px;
      background: var(--ff-surface);
      border-bottom: 1px solid var(--ff-border);
      position: sticky;
      top: 0;
      z-index: 30;
    }
  `]
})
export class TopbarComponent {
  readonly store = inject(AuthStore);
  readonly layout = inject(LayoutService);
  readonly theme = inject(ThemeService);
  private readonly authService = inject(AuthService);

  readonly menuItems: MenuItem[] = [
    {
      label: 'Meu Perfil',
      icon: 'pi pi-user',
      // command: () => this.router.navigate(['/settings/profile']),
    },
    { separator: true },
    {
      label: 'Sair',
      icon: 'pi pi-sign-out',
      command: () => this.authService.logout(),
    },
  ];
}
