package com.cronos.formflow_api.domain.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ResponseRepository extends JpaRepository<Response, UUID>, JpaSpecificationExecutor<Response> {

    Page<Response> findByFormId(UUID formId, Pageable pageable);

    Optional<Response> findByIdAndFormId(UUID id, UUID formId);

    @Query("SELECT r FROM Response r WHERE r.form.id = :formId ORDER BY r.submittedAt DESC")
    List<Response> findAllByFormIdForExport(@Param("formId") UUID formId);

    /**
     * Total de respostas de um formulário.
     */
    long countByFormId(UUID formId);

    /**
     * Total de respostas de todos os formulários de um usuário.
     */
    @Query("SELECT COUNT(r) FROM Response r JOIN r.form f WHERE f.user.id = :userId")
    long countByUserId(@Param("userId") UUID userId);

    /**
     * Total de respostas dos formulários de um usuário após uma data.
     */
    @Query("SELECT COUNT(r) FROM Response r JOIN r.form f WHERE f.user.id = :userId AND r.submittedAt > :after")
    long countByUserIdAndSubmittedAtAfter(@Param("userId") UUID userId, @Param("after") LocalDateTime after);

    /**
     * Total de respostas após uma data (para "últimos N dias").
     */
    @Query("SELECT COUNT(r) FROM Response r WHERE r.form.id = :formId AND r.submittedAt > :after")
    long countByFormIdAndSubmittedAtAfter(@Param("formId") UUID formId, @Param("after") LocalDateTime after);

    /**
     * Data da primeira resposta (mais antiga).
     */
    @Query("SELECT CAST(MIN(r.submittedAt) AS string) FROM Response r WHERE r.form.id = :formId")
    String findFirstSubmittedAt(@Param("formId") UUID formId);

    /**
     * Data da última resposta (mais recente).
     */
    @Query("SELECT CAST(MAX(r.submittedAt) AS string) FROM Response r WHERE r.form.id = :formId")
    String findLastSubmittedAt(@Param("formId") UUID formId);

    /**
     * Contagem de respostas agrupadas por dia (para timeline).
     *
     * Retorna array de [date_string, count] para cada dia com respostas
     * desde a data de início informada.
     */
    @Query(value = """
            SELECT CAST(r.submitted_at AS DATE) AS response_date, COUNT(*) AS response_count
            FROM responses r
            WHERE r.form_id = :formId AND r.submitted_at >= :since
            GROUP BY CAST(r.submitted_at AS DATE)
            ORDER BY response_date ASC
            """, nativeQuery = true)
    List<Object[]> countByFormIdGroupedByDate(
            @Param("formId") UUID formId,
            @Param("since") LocalDateTime since
    );
}