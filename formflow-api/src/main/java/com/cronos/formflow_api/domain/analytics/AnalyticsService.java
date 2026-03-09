package com.cronos.formflow_api.domain.analytics;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.api.dto.response.AnalyticsResponse;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.ChoiceDistribution;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.DateStats;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.FileStats;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.NumericStats;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.QuestionAnalytics;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.Summary;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.TextStats;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.TimelineEntry;
import com.cronos.formflow_api.api.dto.response.AnalyticsResponse.WordFrequency;
import com.cronos.formflow_api.domain.form.Form;
import com.cronos.formflow_api.domain.form.FormRepository;
import com.cronos.formflow_api.domain.form.FormVersion;
import com.cronos.formflow_api.domain.form.FormVersionRepository;
import com.cronos.formflow_api.domain.form.Question;
import com.cronos.formflow_api.domain.form.QuestionRepository;
import com.cronos.formflow_api.domain.response.ResponseAnswer;
import com.cronos.formflow_api.domain.response.ResponseAnswerRepository;
import com.cronos.formflow_api.domain.response.ResponseRepository;
import com.cronos.formflow_api.domain.user.User;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final FormRepository formRepository;
    private final FormVersionRepository formVersionRepository;
    private final QuestionRepository questionRepository;
    private final ResponseRepository responseRepository;
    private final ResponseAnswerRepository responseAnswerRepository;

    // Stopwords para filtro de top words (pt-BR)
    private static final Set<String> STOPWORDS = Set.of(
        "a", "o", "e", "de", "do", "da", "dos", "das", "em", "no", "na", "nas",
        "um", "uma", "uns", "umas", "por", "para", "com", "sem", "que", "se", "ou",
        "mas", "não", "sim", "é", "são", "foi", "ser", "ter", "como", "mais", "muito",
        "já", "ao", "aos", "à", "às", "seu", "sua", "seus", "suas", "ele", "ela",
        "eles", "elas", "eu", "nós", "me", "te", "lhe", "nos", "vos", "isso", "isto",
        "the", "an", "is", "are", "was", "were", "be", "been", "being", "and",
        "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "it"
    );

    /**
     * Gera analytics completo para um formulário.
     *
     * @param user   usuário autenticado (deve ser dono do form)
     * @param formId UUID do formulário
     * @param days   número de dias para timeline (padrão 30)
     * @return AnalyticsResponse com todas as métricas
     */
    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics(User user, UUID formId, int days) {
    	
        // Valida ownership
        Form form = formRepository.findByIdAndUserId(formId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));

        // Busca última versão e suas questões
        FormVersion latestVersion = formVersionRepository.findLatestByFormId(formId).orElse(null);
        List<Question> questions = latestVersion != null
                ? questionRepository.findByFormVersionIdOrderByOrderIndex(latestVersion.getId())
                : List.of();

        // Total de respostas
        long totalResponses = responseRepository.countByFormId(formId);

        if (totalResponses == 0) {
            return buildEmptyAnalytics(form, questions);
        }

        // Summary
        Summary summary = buildSummary(formId, totalResponses);

        // Timeline
        List<TimelineEntry> timeline = buildTimeline(formId, days);

        // Per-question analytics
        List<QuestionAnalytics> questionAnalytics = buildQuestionAnalytics(formId, questions, totalResponses);

        return AnalyticsResponse.builder()
                .formId(formId)
                .formTitle(form.getTitle())
                .summary(summary)
                .timeline(timeline)
                .questions(questionAnalytics)
                .build();
    }

    private Summary buildSummary(UUID formId, long totalResponses) {
        LocalDateTime now = LocalDateTime.now();

        long last7Days = responseRepository.countByFormIdAndSubmittedAtAfter(formId, now.minusDays(7));
        long last30Days = responseRepository.countByFormIdAndSubmittedAtAfter(formId, now.minusDays(30));

        String firstResponse = responseRepository.findFirstSubmittedAt(formId);
        String lastResponse = responseRepository.findLastSubmittedAt(formId);

        return Summary.builder()
                .totalResponses(totalResponses)
                .responsesLast7Days(last7Days)
                .responsesLast30Days(last30Days)
                .firstResponseAt(firstResponse)
                .lastResponseAt(lastResponse)
                .averageCompletionTimeSeconds(null) // TODO: calcular via metadata.startedAt
                .build();
    }

    private List<TimelineEntry> buildTimeline(UUID formId, int days) {
        LocalDate startDate = LocalDate.now().minusDays(days - 1);
        List<Object[]> rawCounts = responseRepository.countByFormIdGroupedByDate(formId, startDate.atStartOfDay());

        // Converte para mapa para preenchimento fácil
        Map<String, Long> countMap = new HashMap<>();
        for (Object[] row : rawCounts) {
            String date = row[0].toString();
            long count = ((Number) row[1]).longValue();
            countMap.put(date, count);
        }

        // Preenche todos os dias (inclusive dias sem resposta = 0)
        List<TimelineEntry> timeline = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            String date = startDate.plusDays(i).toString();
            timeline.add(TimelineEntry.builder()
                    .date(date)
                    .count(countMap.getOrDefault(date, 0L))
                    .build());
        }

        return timeline;
    }

    private List<QuestionAnalytics> buildQuestionAnalytics(UUID formId, List<Question> questions, long totalResponses) {
        List<QuestionAnalytics> result = new ArrayList<>();

        for (Question question : questions) {
            // Carrega todas as answers para esta questão
            List<ResponseAnswer> answers = responseAnswerRepository.findByFormIdAndQuestionId(
                    formId, question.getId()
            );

            long totalAnswered = answers.size();
            long totalSkipped = totalResponses - totalAnswered;
            double answerRate = totalResponses > 0 ? (double) totalAnswered / totalResponses : 0.0;

            QuestionAnalytics.QuestionAnalyticsBuilder builder = QuestionAnalytics.builder()
                    .questionId(question.getId())
                    .label(question.getLabel())
                    .type(question.getType())
                    .sectionId(question.getSectionId())
                    .orderIndex(question.getOrderIndex())
                    .totalAnswered(totalAnswered)
                    .totalSkipped(totalSkipped)
                    .answerRate(Math.round(answerRate * 1000.0) / 1000.0);

            // Stats específicas por tipo
            String type = question.getType();
            switch (type) {
                case "single_choice", "dropdown" -> builder.choiceDistribution(buildChoiceStats(answers, false));
                case "multi_choice" -> builder.choiceDistribution(buildChoiceStats(answers, true));
                case "number", "rating", "scale" -> builder.numericStats(buildNumericStats(answers));
                case "short_text", "long_text", "email", "phone", "url" -> builder.textStats(buildTextStats(answers));
                case "date" -> builder.dateStats(buildDateStats(answers));
                case "file_upload" -> builder.fileStats(buildFileStats(answers));
            }

            result.add(builder.build());
        }

        return result;
    }

    private ChoiceDistribution buildChoiceStats(List<ResponseAnswer> answers, boolean isMulti) {
        Map<String, Long> distribution = new LinkedHashMap<>();
        long totalSelections = 0;

        for (ResponseAnswer answer : answers) {
            String[] options = answer.getValueOptions();
            if (options == null) continue;

            for (String option : options) {
                if (option != null && !option.isBlank()) {
                    distribution.merge(option, 1L, Long::sum);
                    totalSelections++;
                }
            }
        }

        // Ordena por contagem decrescente
        Map<String, Long> sorted = distribution.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey, Map.Entry::getValue,
                        (a, b) -> a, LinkedHashMap::new
                ));

        return ChoiceDistribution.builder()
                .distribution(sorted)
                .totalSelections(totalSelections)
                .build();
    }

    private NumericStats buildNumericStats(List<ResponseAnswer> answers) {
        List<BigDecimal> values = answers.stream()
                .map(ResponseAnswer::getValueNumber)
                .filter(v -> v != null)
                .sorted()
                .collect(Collectors.toList());

        if (values.isEmpty()) {
            return NumericStats.builder().count(0).build();
        }

        long count = values.size();
        BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avg = sum.divide(BigDecimal.valueOf(count), 4, RoundingMode.HALF_UP);
        BigDecimal min = values.get(0);
        BigDecimal max = values.get(values.size() - 1);
        BigDecimal median = calculateMedian(values);
        BigDecimal stdDev = calculateStdDev(values, avg);

        return NumericStats.builder()
                .average(avg.setScale(2, RoundingMode.HALF_UP))
                .min(min)
                .max(max)
                .median(median.setScale(2, RoundingMode.HALF_UP))
                .sum(sum)
                .standardDeviation(stdDev.setScale(2, RoundingMode.HALF_UP))
                .count(count)
                .build();
    }

    private BigDecimal calculateMedian(List<BigDecimal> sorted) {
        int size = sorted.size();
        if (size == 0) return BigDecimal.ZERO;
        if (size % 2 == 1) {
            return sorted.get(size / 2);
        }
        return sorted.get(size / 2 - 1)
                .add(sorted.get(size / 2))
                .divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateStdDev(List<BigDecimal> values, BigDecimal mean) {
        if (values.size() <= 1) return BigDecimal.ZERO;

        BigDecimal sumSquaredDiffs = values.stream()
                .map(v -> v.subtract(mean).pow(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal variance = sumSquaredDiffs.divide(
                BigDecimal.valueOf(values.size()), 8, RoundingMode.HALF_UP
        );

        return BigDecimal.valueOf(Math.sqrt(variance.doubleValue()));
    }

    private TextStats buildTextStats(List<ResponseAnswer> answers) {
        List<String> texts = answers.stream()
                .map(ResponseAnswer::getValueText)
                .filter(t -> t != null && !t.isBlank())
                .collect(Collectors.toList());

        if (texts.isEmpty()) {
            return TextStats.builder()
                    .totalAnswered(0)
                    .averageLength(0)
                    .minLength(0)
                    .maxLength(0)
                    .topWords(List.of())
                    .build();
        }

        int minLen = texts.stream().mapToInt(String::length).min().orElse(0);
        int maxLen = texts.stream().mapToInt(String::length).max().orElse(0);
        double avgLen = texts.stream().mapToInt(String::length).average().orElse(0);

        // Top words (excluindo stopwords, mínimo 3 caracteres)
        Map<String, Long> wordCounts = new HashMap<>();
        for (String text : texts) {
            String[] words = text.toLowerCase()
                    .replaceAll("[^a-záàâãéèêíïóôõöúçñ\\s]", " ")
                    .split("\\s+");

            for (String word : words) {
                String trimmed = word.trim();
                if (trimmed.length() >= 3 && !STOPWORDS.contains(trimmed)) {
                    wordCounts.merge(trimmed, 1L, Long::sum);
                }
            }
        }

        List<WordFrequency> topWords = wordCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> WordFrequency.builder().word(e.getKey()).count(e.getValue()).build())
                .collect(Collectors.toList());

        return TextStats.builder()
                .totalAnswered(texts.size())
                .averageLength(Math.round(avgLen * 10.0) / 10.0)
                .minLength(minLen)
                .maxLength(maxLen)
                .topWords(topWords)
                .build();
    }

    private DateStats buildDateStats(List<ResponseAnswer> answers) {
        List<LocalDate> dates = answers.stream()
                .map(ResponseAnswer::getValueDate)
                .filter(d -> d != null)
                .sorted()
                .collect(Collectors.toList());

        if (dates.isEmpty()) {
            return DateStats.builder().count(0).build();
        }

        return DateStats.builder()
                .earliest(dates.get(0).toString())
                .latest(dates.get(dates.size() - 1).toString())
                .count(dates.size())
                .build();
    }

    private FileStats buildFileStats(List<ResponseAnswer> answers) {
        long totalFiles = 0;
        long answersWithFiles = 0;

        for (ResponseAnswer answer : answers) {
            String[] files = answer.getValueFiles();
            if (files != null && files.length > 0) {
                totalFiles += files.length;
                answersWithFiles++;
            }
        }

        double avgFiles = answersWithFiles > 0 ? (double) totalFiles / answersWithFiles : 0;

        return FileStats.builder()
                .totalFiles(totalFiles)
                .averageFilesPerResponse(Math.round(avgFiles * 10.0) / 10.0)
                .build();
    }

    // =================================================================
    // Empty analytics (para formulários sem respostas)
    private AnalyticsResponse buildEmptyAnalytics(Form form, List<Question> questions) {
        List<QuestionAnalytics> emptyQuestions = questions.stream()
                .map(q -> QuestionAnalytics.builder()
                        .questionId(q.getId())
                        .label(q.getLabel())
                        .type(q.getType())
                        .sectionId(q.getSectionId())
                        .orderIndex(q.getOrderIndex())
                        .totalAnswered(0)
                        .totalSkipped(0)
                        .answerRate(0.0)
                        .build())
                .collect(Collectors.toList());

        return AnalyticsResponse.builder()
                .formId(form.getId())
                .formTitle(form.getTitle())
                .summary(Summary.builder()
                        .totalResponses(0)
                        .responsesLast7Days(0)
                        .responsesLast30Days(0)
                        .build())
                .timeline(List.of())
                .questions(emptyQuestions)
                .build();
    }
}