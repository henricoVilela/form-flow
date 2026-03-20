package com.cronos.formflow_api.domain.form;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FormRespondentRepository extends JpaRepository<FormRespondent, UUID> {

    List<FormRespondent> findByFormIdOrderByCreatedAtAsc(UUID formId);

    Optional<FormRespondent> findByToken(String token);

    Optional<FormRespondent> findByIdAndFormId(UUID id, UUID formId);
}
