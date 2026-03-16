import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { LayoutService } from './layout.service';

@Component({
    selector: 'app-main-layout',
    imports: [RouterOutlet, SidebarComponent, TopbarComponent],
    template: `
    <div class="layout">
      <app-sidebar />

      <!-- Mobile backdrop -->
      @if (layout.sidebarOpen()) {
        <div class="mobile-backdrop" (click)="layout.close()"></div>
      }

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

    .mobile-backdrop {
      display: none;
    }

    @media (max-width: 768px) {
      .layout-content {
        margin-left: 0;
      }

      .layout-main {
        padding: 20px 16px;
      }

      .mobile-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 35;
      }
    }
  `]
})
export class MainLayoutComponent {
  readonly layout = inject(LayoutService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.layout.close();
  }
}
