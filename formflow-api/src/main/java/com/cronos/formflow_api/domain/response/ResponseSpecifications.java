package com.cronos.formflow_api.domain.response;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.jpa.domain.Specification;

public class ResponseSpecifications {

    private ResponseSpecifications() {}

    public static Specification<Response> byFormId(UUID formId) {
        return (root, query, cb) -> cb.equal(root.get("form").get("id"), formId);
    }

    public static Specification<Response> fromDate(LocalDateTime from) {
        if (from == null) return null;
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("submittedAt"), from);
    }

    public static Specification<Response> toDate(LocalDateTime to) {
        if (to == null) return null;
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("submittedAt"), to);
    }

    public static Specification<Response> searchById(String search) {
        if (search == null || search.isBlank()) return null;
        return (root, query, cb) -> {
            var idAsText = cb.function("text", String.class, root.get("id"));
            return cb.like(idAsText, search.toLowerCase() + "%");
        };
    }
}
