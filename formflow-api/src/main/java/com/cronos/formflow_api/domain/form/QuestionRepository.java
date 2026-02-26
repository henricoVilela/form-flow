package com.cronos.formflow_api.domain.form;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByFormVersionIdOrderByOrderIndex(UUID formVersionId);
    List<Question> findByFormIdOrderByOrderIndex(UUID formId);
}