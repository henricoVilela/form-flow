package com.cronos.formflow_api.api.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cronos.formflow_api.api.dto.response.DownloadResponse;
import com.cronos.formflow_api.infrastructure.storage.PresignRequest;
import com.cronos.formflow_api.infrastructure.storage.PresignResponse;
import com.cronos.formflow_api.infrastructure.storage.StorageService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Controller para gerenciamento de upload de arquivos via MinIO.
 *
 * Fluxo de upload:
 * 1. Frontend chama POST /upload/presign com metadados do arquivo
 * 2. Backend valida (tipo, tamanho), registra na tabela uploaded_files (status=PENDING)
 *    e retorna uma presigned URL do MinIO
 * 3. Frontend faz PUT direto na presigned URL do MinIO (upload direto, sem passar pelo backend)
 * 4. Frontend chama POST /upload/{id}/confirm para confirmar que o upload foi concluído
 * 5. Ao submeter o formulário, os arquivos referenciados são vinculados à response
 *
 * Todos os endpoints são públicos (permitAll no SecurityConfig)
 * pois o respondente do formulário pode não estar autenticado.
 */
@RestController
@RequestMapping("/upload")
@RequiredArgsConstructor
public class FileController {

    private final StorageService storageService;

    /**
     * Gera uma presigned URL para upload direto ao MinIO.
     *
     * Validações realizadas:
     * - Formulário deve existir
     * - Tipo MIME deve ser permitido (configurável por questão no schema)
     * - Tamanho não pode exceder o limite (configurável por questão no schema)
     *
     * @param request dados do arquivo (formId, fileName, mimeType, sizeBytes)
     * @return fileId + presignedUrl + expiresIn (segundos)
     */
    @PostMapping("/presign")
    public ResponseEntity<PresignResponse> presign(@Valid @RequestBody PresignRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(storageService.presign(request));
    }

    /**
     * Confirma que o upload foi concluído com sucesso.
     * Muda o status do arquivo de PENDING para CONFIRMED.
     *
     * @param id UUID do arquivo retornado no presign
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<Void> confirm(@PathVariable UUID id) {
        storageService.confirm(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Gera uma presigned URL temporária para download do arquivo.
     * Útil para visualizar anexos nas respostas.
     *
     * @param id UUID do arquivo
     * @return URL temporária para download (válida por presignedUrlExpiry segundos)
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<DownloadResponse> download(@PathVariable UUID id) {
        String url = storageService.getDownloadUrl(id);
        return ResponseEntity.ok(DownloadResponse.builder()
                .downloadUrl(url)
                .expiresIn(storageService.getPresignedUrlExpiry())
                .build());
    }

}
