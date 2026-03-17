import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';

export type FormVisibility = 'PUBLIC' | 'PRIVATE' | 'PASSWORD_PROTECTED';

export interface FormResponse {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  layout: 'MULTI_STEP' | 'SINGLE_PAGE';
  currentVersion: number | null;
  draftSchema: any;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  welcomeMessage: string | null;
  thankYouMessage: string | null;
  visibility: FormVisibility | null;
  slug: string | null;
  maxResponses: number | null;
  expiresAt: string | null;
}

export interface FormSettingsRequest {
  visibility: FormVisibility;
  slug?: string;
  password?: string;
  maxResponses?: number;
  expiresAt?: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
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

export interface ResponseSummaryResponse {
  id: string;
  formVersionId: string;
  submittedAt: string;
  metadata: Record<string, any> | null;
}

export interface ResponseDetailResponse {
  id: string;
  formId: string;
  formVersionId: string;
  payload: Record<string, any>;
  metadata: Record<string, any> | null;
  submittedAt: string;
}

export interface AnalyticsSummary {
  totalResponses: number;
  responsesLast7Days: number;
  responsesLast30Days: number;
  firstResponseAt: string | null;
  lastResponseAt: string | null;
  averageCompletionTimeSeconds: number | null;
}

export interface ChoiceDistribution {
  distribution: Record<string, number>;
  totalSelections: number;
}

export interface NumericStats {
  average: number;
  min: number;
  max: number;
  median: number;
  sum: number;
  standardDeviation: number;
  count: number;
}

export interface TextStats {
  averageLength: number;
  minLength: number;
  maxLength: number;
  totalAnswered: number;
  topWords: { word: string; count: number }[];
}

export interface DateStats {
  earliest: string;
  latest: string;
  count: number;
}

export interface FileStats {
  totalFiles: number;
  averageFilesPerResponse: number;
}

export interface QuestionAnalytics {
  questionId: string;
  label: string;
  type: string;
  /** Presente apenas para type=number com documentType cpf ou cnpj */
  documentType?: 'cpf' | 'cnpj' | null;
  sectionId: string;
  orderIndex: number;
  totalAnswered: number;
  totalSkipped: number;
  answerRate: number;
  choiceDistribution?: ChoiceDistribution;
  numericStats?: NumericStats;
  textStats?: TextStats;
  dateStats?: DateStats;
  fileStats?: FileStats;
}

export interface AnalyticsResponse {
  formId: string;
  formTitle: string;
  summary: AnalyticsSummary;
  timeline: { date: string; count: number }[];
  questions: QuestionAnalytics[];
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

  getPublicFormBySlug(slug: string): Observable<PublicFormResponse> {
    return this.http.get<PublicFormResponse>(`${environment.apiUrl}/public/forms/slug/${slug}`);
  }

  submitResponse(formId: string, request: SubmitResponseRequest): Observable<SubmitResponseResponse> {
    return this.http.post<SubmitResponseResponse>(`${this.baseUrl}/${formId}/responses`, request);
  }

  listResponses(formId: string, page = 0, size = 20): Observable<PageResponse<ResponseSummaryResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'submittedAt,desc');
    return this.http.get<PageResponse<ResponseSummaryResponse>>(`${this.baseUrl}/${formId}/responses`, { params });
  }

  getResponse(formId: string, responseId: string): Observable<ResponseDetailResponse> {
    return this.http.get<ResponseDetailResponse>(`${this.baseUrl}/${formId}/responses/${responseId}`);
  }

  exportResponsesCsv(formId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${formId}/responses/export/csv`, { responseType: 'blob' });
  }

  updateSettings(formId: string, request: FormSettingsRequest): Observable<FormResponse> {
    return this.http.put<FormResponse>(`${this.baseUrl}/${formId}/settings`, request);
  }

  getAnalytics(formId: string, days = 30): Observable<AnalyticsResponse> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<AnalyticsResponse>(`${this.baseUrl}/${formId}/analytics`, { params });
  }
}
