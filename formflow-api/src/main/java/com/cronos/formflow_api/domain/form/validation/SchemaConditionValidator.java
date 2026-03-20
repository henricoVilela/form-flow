package com.cronos.formflow_api.domain.form.validation;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.cronos.formflow_api.shared.exception.BusinessException;

import tools.jackson.databind.JsonNode;

@Component
public class SchemaConditionValidator {

    /** Operadores válidos por categoria de tipo de questão */
    private static final Set<String> TEXT_OPERATORS = Set.of(
        "equals", "not_equals", "contains", "not_contains",
        "is_empty", "is_not_empty"
    );

    private static final Set<String> NUMBER_OPERATORS = Set.of(
        "equals", "not_equals",
        "greater_than", "less_than", "gte", "lte",
        "is_empty", "is_not_empty"
    );

    private static final Set<String> CHOICE_OPERATORS = Set.of(
        "equals", "not_equals",
        "in", "not_in",
        "is_empty", "is_not_empty"
    );

    private static final Set<String> DATE_OPERATORS = Set.of(
        "equals", "not_equals",
        "greater_than", "less_than", "gte", "lte",
        "is_empty", "is_not_empty"
    );

    private static final Set<String> UNIVERSAL_OPERATORS = Set.of(
        "equals", "not_equals", "is_empty", "is_not_empty"
    );

    /** Tipos que aceitam texto */
    private static final Set<String> TEXT_TYPES = Set.of(
        "short_text", "long_text", "email", "phone", "url"
    );

    /** Tipos que aceitam opções (choice) */
    private static final Set<String> CHOICE_TYPES = Set.of(
        "single_choice", "multi_choice", "dropdown"
    );

    /**
     * Valida todas as condições presentes no schema.
     *
     * @param schema schema completo do formulário
     * @throws BusinessException se alguma condição for inválida
     */
    public void validate(JsonNode schema) {
        // 1. Coleta todos os questionIds e seus tipos
        Set<String> allQuestionIds = new HashSet<>();
        java.util.Map<String, String> questionTypeMap = new java.util.HashMap<>();

        JsonNode sections = schema.path("sections");
        if (!sections.isArray()) return;

        for (JsonNode section : sections) {
            JsonNode questions = section.path("questions");
            if (!questions.isArray()) continue;

            for (JsonNode q : questions) {
                String qId = q.path("id").asString("");
                String qType = q.path("type").asString("");
                if (!qId.isBlank()) {
                    allQuestionIds.add(qId);
                    questionTypeMap.put(qId, qType);
                }
            }
        }

        // 2. Valida cada questão que tem conditions
        List<String> errors = new ArrayList<>();

        for (JsonNode section : sections) {
            JsonNode questions = section.path("questions");
            if (!questions.isArray()) continue;

            for (JsonNode q : questions) {
                String qId = q.path("id").asString("?");
                JsonNode conditions = q.path("conditions");

                if (conditions.isMissingNode() || conditions.isNull()) continue;

                validateConditionGroup(conditions, qId, allQuestionIds, questionTypeMap, errors);
            }
        }

        if (!errors.isEmpty()) {
            String message = "Condições inválidas no schema:\n• " + String.join("\n• ", errors);
            throw new BusinessException("INVALID_CONDITIONS", message);
        }

        // 3. Detecta ciclos
        detectCircularDependencies(schema, errors);
        if (!errors.isEmpty()) {
            String message = "Dependências circulares detectadas:\n• " + String.join("\n• ", errors);
            throw new BusinessException("CIRCULAR_CONDITIONS", message);
        }
    }

    /**
     * Valida um grupo de condições (pode ser AND ou OR com rules).
     */
    private void validateConditionGroup(
            JsonNode conditionGroup,
            String ownerQuestionId,
            Set<String> allQuestionIds,
            java.util.Map<String, String> questionTypeMap,
            List<String> errors
    ) {
        // Valida operator do grupo
        String groupOperator = conditionGroup.path("operator").asString("");
        if (!groupOperator.equals("AND") && !groupOperator.equals("OR")) {
            errors.add(String.format(
                    "Questão '%s': operator do grupo deve ser 'AND' ou 'OR', encontrado: '%s'",
                    ownerQuestionId, groupOperator
            ));
        }

        // Valida rules
        JsonNode rules = conditionGroup.path("rules");
        if (!rules.isArray() || rules.isEmpty()) {
            errors.add(String.format(
                    "Questão '%s': 'rules' deve ser um array com pelo menos 1 regra",
                    ownerQuestionId
            ));
            return;
        }

        for (JsonNode rule : rules) {
            validateRule(rule, ownerQuestionId, allQuestionIds, questionTypeMap, errors);
        }
    }

    /**
     * Valida uma regra individual dentro de um grupo.
     */
    private void validateRule(
            JsonNode rule,
            String ownerQuestionId,
            Set<String> allQuestionIds,
            java.util.Map<String, String> questionTypeMap,
            List<String> errors
    ) {
        String refQuestionId = rule.path("questionId").asString("");
        String operator = rule.path("operator").asString("");
        JsonNode value = rule.path("value");

        // questionId obrigatório e deve existir no schema
        if (refQuestionId.isBlank()) {
            errors.add(String.format(
                    "Questão '%s': regra sem 'questionId'", ownerQuestionId
            ));
            return;
        }

        if (!allQuestionIds.contains(refQuestionId)) {
            errors.add(String.format(
                    "Questão '%s': condição referencia questionId '%s' que não existe no schema",
                    ownerQuestionId, refQuestionId
            ));
            return;
        }

        // Uma questão não pode depender de si mesma
        if (refQuestionId.equals(ownerQuestionId)) {
            errors.add(String.format(
                    "Questão '%s': não pode ter condição sobre si mesma",
                    ownerQuestionId
            ));
            return;
        }

        // Operador obrigatório
        if (operator.isBlank()) {
            errors.add(String.format(
                    "Questão '%s': regra sem 'operator'", ownerQuestionId
            ));
            return;
        }

        // Valida operador compatível com o tipo da questão referenciada
        String refType = questionTypeMap.getOrDefault(refQuestionId, "");
        Set<String> allowedOperators = getAllowedOperators(refType);

        if (!allowedOperators.contains(operator)) {
            errors.add(String.format(
                    "Questão '%s': operador '%s' não é válido para questão '%s' (tipo '%s'). Operadores válidos: %s",
                    ownerQuestionId, operator, refQuestionId, refType, allowedOperators
            ));
            return;
        }

        // Valida presença de value (exceto para is_empty / is_not_empty)
        if (!operator.equals("is_empty") && !operator.equals("is_not_empty")) {
            if (value.isMissingNode() || value.isNull()) {
                errors.add(String.format(
                        "Questão '%s': operador '%s' exige campo 'value'",
                        ownerQuestionId, operator
                ));
                return;
            }

            // Para in/not_in, value deve ser array
            if ((operator.equals("in") || operator.equals("not_in")) && !value.isArray()) {
                errors.add(String.format(
                        "Questão '%s': operador '%s' exige 'value' como array",
                        ownerQuestionId, operator
                ));
            }
        }
    }

    /**
     * Retorna os operadores permitidos para um tipo de questão.
     */
    private Set<String> getAllowedOperators(String questionType) {
        if (TEXT_TYPES.contains(questionType)) return TEXT_OPERATORS;
        if ("number".equals(questionType) || "rating".equals(questionType)) return NUMBER_OPERATORS;
        if (CHOICE_TYPES.contains(questionType)) return CHOICE_OPERATORS;
        if ("date".equals(questionType)) return DATE_OPERATORS;
        return UNIVERSAL_OPERATORS; // file_upload, statement, etc.
    }

    /**
     * Detecta dependências circulares entre questões.
     *
     * Exemplo de ciclo proibido:
     * - Questão A visível se Questão B = "Sim"
     * - Questão B visível se Questão A = "Não"
     */
    private void detectCircularDependencies(JsonNode schema, List<String> errors) {
        // Monta grafo de dependências: questionId → Set<questionId que ele depende>
        java.util.Map<String, Set<String>> dependencyGraph = new java.util.HashMap<>();

        JsonNode sections = schema.path("sections");
        if (!sections.isArray()) return;

        for (JsonNode section : sections) {
            JsonNode questions = section.path("questions");
            if (!questions.isArray()) continue;

            for (JsonNode q : questions) {
                String qId = q.path("id").asString("");
                JsonNode conditions = q.path("conditions");
                if (conditions.isMissingNode() || conditions.isNull()) continue;

                Set<String> deps = new HashSet<>();
                JsonNode rules = conditions.path("rules");
                if (rules.isArray()) {
                    for (JsonNode rule : rules) {
                        String refId = rule.path("questionId").asString("");
                        if (!refId.isBlank()) deps.add(refId);
                    }
                }
                dependencyGraph.put(qId, deps);
            }
        }

        // DFS para detectar ciclos
        Set<String> visited = new HashSet<>();
        Set<String> inStack = new HashSet<>();

        for (String node : dependencyGraph.keySet()) {
            if (!visited.contains(node)) {
                if (hasCycle(node, dependencyGraph, visited, inStack)) {
                    errors.add(String.format(
                            "Ciclo detectado envolvendo a questão '%s'", node
                    ));
                }
            }
        }
    }

    private boolean hasCycle(
        String node,
        java.util.Map<String, Set<String>> graph,
        Set<String> visited,
        Set<String> inStack
    ) {
        visited.add(node);
        inStack.add(node);

        Set<String> neighbors = graph.getOrDefault(node, Set.of());
        for (String neighbor : neighbors) {
            if (inStack.contains(neighbor)) return true;
            if (!visited.contains(neighbor) && hasCycle(neighbor, graph, visited, inStack)) {
                return true;
            }
        }

        inStack.remove(node);
        return false;
    }
}
