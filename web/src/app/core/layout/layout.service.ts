import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarOpen = signal(false);

  toggle(): void { this.sidebarOpen.update(v => !v); }
  close(): void  { this.sidebarOpen.set(false); }
}
