import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthStore } from './auth.store';
import { AuthService } from './auth.service';
import { environment } from '@env';

/** Flag para evitar múltiplos refreshs simultâneos */
let isRefreshing = false;

/**
 * Interceptor funcional (Angular 17+).
 *
 * Responsabilidades:
 * 1. Injeta header Authorization: Bearer {token} em requests para a API
 * 2. Intercepta 401 → tenta refresh token → replay da request original
 * 3. Se refresh falhar → logout automático
 *
 * Não intercepta:
 * - Requests para URLs externas (ex: presigned URLs do MinIO)
 * - Requests de login/register/refresh (evita loop)
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const store = inject(AuthStore);
  const authService = inject(AuthService);

  // Não intercepta requests para fora da API
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // Não intercepta requests de auth (evita loop)
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  // Injeta token
  const token = store.accessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 = token expirado → tenta refresh
      if (error.status === 401 && !isRefreshing) {
        isRefreshing = true;

        return authService.refresh().pipe(
          switchMap(response => {
            isRefreshing = false;
            // Replay da request original com o novo token
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.accessToken}` },
            });
            return next(retryReq);
          }),
          catchError(refreshError => {
            isRefreshing = false;
            authService.logout();
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
