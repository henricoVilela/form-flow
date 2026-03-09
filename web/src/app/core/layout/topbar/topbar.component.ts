import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { AuthStore } from '@core/auth/auth.store';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, MenuModule, ButtonModule],
  template: `
    <header class="topbar">
      <!-- Left: breadcrumb area (pode ser expandido) -->
      <div class="flex items-center gap-3">
        <!-- Mobile menu toggle (futuro) -->
      </div>

      <!-- Right: actions -->
      <div class="flex items-center gap-2">
        <!-- Notifications (futuro) -->
        <!--
        <button pButton
          icon="pi pi-bell"
          class="p-button-text p-button-rounded p-button-plain"
          [badge]="'3'"
          badgeClass="p-badge-danger">
        </button>
        -->

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
  `],
})
export class TopbarComponent {
  readonly store = inject(AuthStore);
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
