import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize } from 'rxjs';
import { MessageService } from 'primeng/api';

import { environment } from '@env';
import { AuthStore } from './auth.store';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /**
   * Registra um novo usuário.
   * Após sucesso: salva tokens + redireciona ao dashboard.
   */
  register(request: RegisterRequest): Observable<AuthResponse> {
    this.store.setLoading(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, request).pipe(
      tap(response => {
        this.store.setAuth(response);
        this.toast.add({ severity: 'success', summary: 'Conta criada!', detail: `Bem-vindo, ${response.user.name}` });
        this.router.navigate(['/dashboard']);
      }),
      catchError(err => {
        const msg = err.error?.message ?? 'Erro ao criar conta';
        this.toast.add({ severity: 'error', summary: 'Erro', detail: msg });
        return throwError(() => err);
      }),
      finalize(() => this.store.setLoading(false)),
    );
  }

  /**
   * Faz login com email/senha.
   * Após sucesso: salva tokens + redireciona ao dashboard.
   */
  login(request: LoginRequest): Observable<AuthResponse> {
    this.store.setLoading(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, request).pipe(
      tap(response => {
        this.store.setAuth(response);
        this.router.navigate(['/dashboard']);
      }),
      catchError(err => {
        const msg = err.error?.message ?? 'E-mail ou senha inválidos';
        this.toast.add({ severity: 'error', summary: 'Erro', detail: msg });
        return throwError(() => err);
      }),
      finalize(() => this.store.setLoading(false)),
    );
  }

  /**
   * Renova os tokens usando o refresh token.
   * Chamado automaticamente pelo interceptor quando o access token expira.
   */
  refresh(): Observable<AuthResponse> {
    const refreshToken = this.store.refreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, null, {
      headers: { 'X-Refresh-Token': refreshToken },
    }).pipe(
      tap(response => this.store.setAuth(response)),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      }),
    );
  }

  /**
   * Busca dados atualizados do perfil.
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/me`).pipe(
      tap(user => this.store.updateUser(user)),
    );
  }

  /**
   * Atualiza o nome do perfil.
   */
  updateProfile(name: string): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/me`, { name }).pipe(
      tap(user => {
        this.store.updateUser(user);
        this.toast.add({ severity: 'success', summary: 'Perfil atualizado' });
      }),
    );
  }

  /**
   * Altera a senha.
   */
  updatePassword(newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/me/password`, { newPassword }).pipe(
      tap(() => this.toast.add({ severity: 'success', summary: 'Senha alterada com sucesso' })),
    );
  }

  /**
   * Logout: limpa state e redireciona ao login.
   */
  logout(): void {
    this.store.clear();
    this.router.navigate(['/login']);
  }
}
