import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';

// ── Response interfaces ──

export interface FormResponse {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  layout: 'MULTI_STEP' | 'SINGLE_PAGE';
  currentVersion: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
  }
}

export interface FormVersionResponse {
  id: string;
  formId: string;
  version: number;
  schema: any;
  createdAt: string;
}

export interface PublishResponse {
  formId: string;
  version: number;
  publishedAt: string;
}

// ── Request interfaces ──

export interface CreateFormRequest {
  title: string;
  description?: string;
  layout?: 'MULTI_STEP' | 'SINGLE_PAGE';
}

export interface UpdateFormRequest {
  title: string;
  description?: string;
  layout?: 'MULTI_STEP' | 'SINGLE_PAGE';
  schema?: any;
}

/**
 * Service para comunicação com os endpoints de formulários.
 *
 * Endpoints cobertos:
 * - CRUD de formulários
 * - Publicação (com schema JSON)
 * - Versionamento
 * - Duplicação
 * - Formulário público (sem auth)
 */
@Injectable({ providedIn: 'root' })
export class FormApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/forms`;

  // ── CRUD ──

  create(request: CreateFormRequest): Observable<FormResponse> {
    return this.http.post<FormResponse>(this.baseUrl, request);
  }

  list(page = 0, size = 20): Observable<PageResponse<FormResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'updatedAt,desc');
    return this.http.get<PageResponse<FormResponse>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<FormResponse> {
    return this.http.get<FormResponse>(`${this.baseUrl}/${id}`);
  }

  update(id: string, request: UpdateFormRequest): Observable<FormResponse> {
    return this.http.put<FormResponse>(`${this.baseUrl}/${id}`, request);
  }

  archive(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ── Publish ──

  publish(id: string, schema: any): Observable<PublishResponse> {
    return this.http.post<PublishResponse>(`${this.baseUrl}/${id}/publish`, { schema });
  }

  // ── Versions ──

  listVersions(id: string): Observable<FormVersionResponse[]> {
    return this.http.get<FormVersionResponse[]>(`${this.baseUrl}/${id}/versions`);
  }

  getVersion(id: string, version: number): Observable<FormVersionResponse> {
    return this.http.get<FormVersionResponse>(`${this.baseUrl}/${id}/versions/${version}`);
  }

  // ── Duplicate ──

  duplicate(id: string): Observable<FormResponse> {
    return this.http.post<FormResponse>(`${this.baseUrl}/${id}/duplicate`, {});
  }

  // ── Public (sem auth) ──

  getPublicForm(formId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/public/forms/${formId}`);
  }
}
