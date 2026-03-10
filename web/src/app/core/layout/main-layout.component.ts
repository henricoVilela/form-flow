import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
    selector: 'app-main-layout',
    imports: [RouterOutlet, SidebarComponent, TopbarComponent],
    template: `
    <div class="layout">
      <app-sidebar />

      <div class="layout-content">
        <app-topbar />

        <main class="layout-main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
    styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
    }

    .layout-content {
      flex: 1;
      margin-left: var(--ff-sidebar-width);
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .layout-main {
      flex: 1;
      padding: 28px 32px;
      animation: fadeIn 0.25s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Responsivo: esconde sidebar em mobile (futuro: toggle) */
    @media (max-width: 768px) {
      .layout-content {
        margin-left: 0;
      }
    }
  `]
})
export class MainLayoutComponent {}
