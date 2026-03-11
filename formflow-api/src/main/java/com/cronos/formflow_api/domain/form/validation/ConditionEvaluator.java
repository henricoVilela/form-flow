package com.cronos.formflow_api.domain.form.validation;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;


@Component
public class ConditionEvaluator {

    /**
     * Calcula quais questionIds estão visíveis dado o payload.
     *
     * @param schema  schema completo do formulário (com sections/questions/conditions)
     * @param payload payload da resposta (chave = questionId, valor = { type, value })
     * @return Set com os IDs das questões visíveis
     */
    public Set<String> evaluateVisibleQuestions(JsonNode schema, JsonNode payload) {
        // Coleta todas as questões e suas condições
        Map<String, JsonNode> questionConditions = new HashMap<>();
        List<String> allQuestionIds = new ArrayList<>();

        JsonNode sections = schema.path("sections");
        if (!sections.isArray()) return Set.of();

        for (JsonNode section : sections) {
            JsonNode questions = section.path("questions");
            if (!questions.isArray()) continue;

            for (JsonNode q : questions) {
                String qId = q.path("id").asString("");
                if (qId.isBlank()) continue;

                allQuestionIds.add(qId);

                JsonNode conditions = q.path("conditions");
                if (!conditions.isMissingNode() && !conditions.isNull()) {
                    questionConditions.put(qId, conditions);
                }
            }
        }

        // Avalia visibilidade com cache (para resolver cascata)
        Map<String, Boolean> visibilityCache = new HashMap<>();
        Set<String> visibleQuestions = new HashSet<>();

        for (String qId : allQuestionIds) {
            if (isVisible(qId, questionConditions, payload, visibilityCache)) {
                visibleQuestions.add(qId);
            }
        }

        return visibleQuestions;
    }

    /**
     * Verifica se uma questão específica está visível.
     * Resolve cascata: se depende de uma questão oculta, também fica oculta.
     */
    private boolean isVisible(
            String questionId,
            Map<String, JsonNode> questionConditions,
            JsonNode payload,
            Map<String, Boolean> cache
    ) {
        // Cache para evitar recalcular e resolver referências circulares
        if (cache.containsKey(questionId)) return cache.get(questionId);

        // Marca temporariamente como visível para evitar loop infinito em ciclos
        cache.put(questionId, true);

        JsonNode conditions = questionConditions.get(questionId);

        // Sem condições = sempre visível
        if (conditions == null) {
            return true;
        }

        boolean result = evaluateConditionGroup(conditions, questionConditions, payload, cache);
        cache.put(questionId, result);
        return result;
    }

    /**
     * Avalia um grupo de condições (AND/OR com rules).
     */
    private boolean evaluateConditionGroup(
            JsonNode conditionGroup,
            Map<String, JsonNode> questionConditions,
            JsonNode payload,
            Map<String, Boolean> visibilityCache
    ) {
        String operator = conditionGroup.path("operator").asString("AND");
        JsonNode rules = conditionGroup.path("rules");

        if (!rules.isArray() || rules.isEmpty()) return true;

        if ("AND".equals(operator)) {
            for (JsonNode rule : rules) {
                if (!evaluateRule(rule, questionConditions, payload, visibilityCache)) {
                    return false;
                }
            }
            return true;
        } else { // OR
            for (JsonNode rule : rules) {
                if (evaluateRule(rule, questionConditions, payload, visibilityCache)) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Avalia uma regra individual.
     *
     * CASCATA: Se a questão referenciada está oculta, a regra retorna false
     * (uma questão oculta não pode satisfazer nenhuma condição).
     */
    private boolean evaluateRule(
            JsonNode rule,
            Map<String, JsonNode> questionConditions,
            JsonNode payload,
            Map<String, Boolean> visibilityCache
    ) {
        String refQuestionId = rule.path("questionId").asString("");
        String operator = rule.path("operator").asString("");
        JsonNode expectedValue = rule.path("value");

        if (refQuestionId.isBlank() || operator.isBlank()) return false;

        // CASCATA: se a questão referenciada está oculta, condição = false
        if (!isVisible(refQuestionId, questionConditions, payload, visibilityCache)) {
            return false;
        }

        // Extrai o valor da resposta do payload
        JsonNode answerNode = payload.path(refQuestionId);
        JsonNode actualValue = answerNode.path("value");

        return evaluateOperator(operator, actualValue, expectedValue);
    }

    /**
     * Avalia o operador de comparação entre o valor real e o esperado.
     */
    private boolean evaluateOperator(String operator, JsonNode actual, JsonNode expected) {
        return switch (operator) {
            case "equals" -> equalsCheck(actual, expected);
            case "not_equals" -> !equalsCheck(actual, expected);
            case "contains" -> containsCheck(actual, expected);
            case "not_contains" -> !containsCheck(actual, expected);
            case "greater_than" -> compareNumbers(actual, expected) > 0;
            case "less_than" -> compareNumbers(actual, expected) < 0;
            case "gte" -> compareNumbers(actual, expected) >= 0;
            case "lte" -> compareNumbers(actual, expected) <= 0;
            case "is_empty" -> isEmptyCheck(actual);
            case "is_not_empty" -> !isEmptyCheck(actual);
            case "in" -> inCheck(actual, expected);
            case "not_in" -> !inCheck(actual, expected);
            default -> false;
        };
    }

    // =============================================
    // Implementações dos operadores
    // =============================================

    private boolean equalsCheck(JsonNode actual, JsonNode expected) {
        if (actual.isMissingNode() || actual.isNull()) return expected.isNull();

        // Para arrays (multi_choice), verifica igualdade de conteúdo
        if (actual.isArray() && expected.isArray()) {
            Set<String> actualSet = new HashSet<>();
            actual.forEach(v -> actualSet.add(v.asString()));
            Set<String> expectedSet = new HashSet<>();
            expected.forEach(v -> expectedSet.add(v.asString()));
            return actualSet.equals(expectedSet);
        }

        return actual.asString("").equals(expected.asString(""));
    }

    private boolean containsCheck(JsonNode actual, JsonNode expected) {
        if (actual.isMissingNode() || actual.isNull()) return false;

        String actualText = actual.asString("").toLowerCase();
        String expectedText = expected.asString("").toLowerCase();
        return actualText.contains(expectedText);
    }

    private int compareNumbers(JsonNode actual, JsonNode expected) {
        try {
            BigDecimal actualNum = new BigDecimal(actual.asString("0"));
            BigDecimal expectedNum = new BigDecimal(expected.asString("0"));
            return actualNum.compareTo(expectedNum);
        } catch (NumberFormatException e) {
            return 0; // se não é número, considera igual
        }
    }

    private boolean isEmptyCheck(JsonNode actual) {
        if (actual.isMissingNode() || actual.isNull()) return true;
        if (actual.isString()) return actual.asString("").isBlank();
        if (actual.isArray()) return actual.isEmpty();
        return false;
    }

    private boolean inCheck(JsonNode actual, JsonNode expectedArray) {
        if (actual.isMissingNode() || actual.isNull() || !expectedArray.isArray()) return false;

        String actualText = actual.asString("");

        // Se actual é array (multi_choice), verifica interseção
        if (actual.isArray()) {
            Set<String> expectedSet = new HashSet<>();
            expectedArray.forEach(v -> expectedSet.add(v.asString()));
            for (JsonNode v : actual) {
                if (expectedSet.contains(v.asString())) return true;
            }
            return false;
        }

        // Se actual é valor único, verifica se está na lista
        for (JsonNode v : expectedArray) {
            if (v.asString("").equals(actualText)) return true;
        }
        return false;
    }
}