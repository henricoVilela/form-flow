import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';

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

export interface PublicFormResponse {
  formId: string;
  formVersionId: string;
  title: string;
  description: string | null;
  layout: 'MULTI_STEP' | 'SINGLE_PAGE';
  version: number;
  schema: any;
  welcomeMessage: string | null;
  thankYouMessage: string | null;
}

export interface SubmitResponseRequest {
  formVersionId: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SubmitResponseResponse {
  id: string;
  formId: string;
  formVersionId: string;
  payload: any;
  metadata: any;
  submittedAt: string;
}

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

@Injectable({ providedIn: 'root' })
export class FormApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/forms`;

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

  publish(id: string, schema: any): Observable<PublishResponse> {
    return this.http.post<PublishResponse>(`${this.baseUrl}/${id}/publish`, { schema });
  }

  listVersions(id: string): Observable<FormVersionResponse[]> {
    return this.http.get<FormVersionResponse[]>(`${this.baseUrl}/${id}/versions`);
  }

  getVersion(id: string, version: number): Observable<FormVersionResponse> {
    return this.http.get<FormVersionResponse>(`${this.baseUrl}/${id}/versions/${version}`);
  }

  duplicate(id: string): Observable<FormResponse> {
    return this.http.post<FormResponse>(`${this.baseUrl}/${id}/duplicate`, {});
  }

  getPublicForm(formId: string): Observable<PublicFormResponse> {
    return this.http.get<PublicFormResponse>(`${environment.apiUrl}/public/forms/${formId}`);
  }

  submitResponse(formId: string, request: SubmitResponseRequest): Observable<SubmitResponseResponse> {
    return this.http.post<SubmitResponseResponse>(`${this.baseUrl}/${formId}/responses`, request);
  }
}
