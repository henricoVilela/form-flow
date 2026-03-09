import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, AuthState, UserProfile } from './auth.models';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ff_access_token',
  REFRESH_TOKEN: 'ff_refresh_token',
  USER: 'ff_user',
} as const;

/**
 * Signal-based auth state store.
 *
 * Responsabilidades:
 * - Armazena tokens e user profile em signals reativos
 * - Persiste em localStorage para sobreviver a refreshs da página
 * - Expõe computed signals para derivar estado (isAuthenticated, userName, etc.)
 * - NÃO faz HTTP requests (isso é do AuthService)
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  // ── State signals ──
  private readonly _user = signal<UserProfile | null>(this.loadUser());
  private readonly _accessToken = signal<string | null>(this.loadToken(STORAGE_KEYS.ACCESS_TOKEN));
  private readonly _refreshToken = signal<string | null>(this.loadToken(STORAGE_KEYS.REFRESH_TOKEN));
  private readonly _loading = signal<boolean>(false);

  // ── Public computed signals (readonly) ──
  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly isAuthenticated = computed(() => !!this._accessToken() && !!this._user());
  readonly userName = computed(() => this._user()?.name ?? '');
  readonly userEmail = computed(() => this._user()?.email ?? '');
  readonly userInitials = computed(() => {
    const name = this._user()?.name ?? '';
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  // ── Actions ──

  /** Atualiza o state após login/register/refresh bem-sucedido */
  setAuth(response: AuthResponse): void {
    this._user.set(response.user);
    this._accessToken.set(response.accessToken);
    this._refreshToken.set(response.refreshToken);

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
  }

  /** Atualiza apenas os tokens (após refresh) */
  setTokens(accessToken: string, refreshToken: string): void {
    this._accessToken.set(accessToken);
    this._refreshToken.set(refreshToken);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  /** Atualiza o perfil do user (após updateProfile) */
  updateUser(user: UserProfile): void {
    this._user.set(user);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  /** Limpa tudo (logout) */
  clear(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);

    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  // ── Private: load from localStorage ──

  private loadToken(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private loadUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
