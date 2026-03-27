import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, switchMap } from 'rxjs';
import { environment } from '@env';

export interface PresignRequest {
  formId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignResponse {
  fileId: string;
  presignedUrl: string;
  expiresIn: number;
}

/**
 * Service para upload de arquivos via MinIO presigned URLs.
 *
 * Fluxo completo:
 * 1. presign() → backend gera URL → retorna fileId + presignedUrl
 * 2. uploadDirect() → PUT do arquivo direto no MinIO via presigned URL
 * 3. confirm() → backend marca como CONFIRMED
 *
 * O método uploadFile() encapsula o fluxo completo.
 */
@Injectable({ providedIn: 'root' })
export class UploadApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/upload`;

  /** Solicita presigned URL para upload */
  presign(request: PresignRequest): Observable<PresignResponse> {
    return this.http.post<PresignResponse>(`${this.baseUrl}/presign`, request);
  }

  /** Upload direto ao MinIO via presigned URL (não passa pelo backend) */
  uploadDirect(presignedUrl: string, file: File): Observable<any> {
    return this.http.put(presignedUrl, file, {
      headers: { 'Content-Type': file.type },
      reportProgress: true,
      observe: 'events',
    });
  }

  /** Confirma upload concluído */
  confirm(fileId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${fileId}/confirm`, {});
  }

  /** Gera URL temporária de download */
  getDownloadUrl(fileId: string): Observable<{ fileId: string; downloadUrl: string; expiresIn: number }> {
    return this.http.get<any>(`${this.baseUrl}/${fileId}/download`);
  }

  /** Deleta um arquivo do MinIO (requer autenticação) */
  deleteFile(fileId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${fileId}`);
  }

  /**
   * Fluxo completo: presign → upload → confirm.
   * Retorna o fileId do arquivo confirmado.
   */
  uploadFile(formId: string, file: File): Observable<string> {
    return this.presign({
      formId,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }).pipe(
      switchMap(presign =>
        this.uploadDirect(presign.presignedUrl, file).pipe(
          // Aguarda somente o evento de resposta final (não os eventos de progresso)
          filter(event => event.type === HttpEventType.Response),
          // Após upload concluído, confirma
          switchMap(() => this.confirm(presign.fileId)),
          // Retorna o fileId
          switchMap(() => [presign.fileId]),
        ),
      ),
    );
  }
}
