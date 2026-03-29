import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeyCreatedResponse {
  id: string;
  name: string;
  keyPrefix: string;
  key: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApiKeyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api-keys`;

  list(): Observable<ApiKeyResponse[]> {
    return this.http.get<ApiKeyResponse[]>(this.base);
  }

  create(name: string): Observable<ApiKeyCreatedResponse> {
    return this.http.post<ApiKeyCreatedResponse>(this.base, { name });
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
