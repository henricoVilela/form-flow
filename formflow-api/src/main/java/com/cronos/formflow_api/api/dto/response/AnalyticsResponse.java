package com.cronos.formflow_api.api.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnalyticsResponse {

    private UUID formId;
    private String formTitle;
    private Summary summary;
    private List<TimelineEntry> timeline;
    private List<QuestionAnalytics> questions;

    @Data
    @Builder
    public static class Summary {
        /** Total de respostas submetidas */
        private long totalResponses;

        /** Respostas nos últimos 7 dias */
        private long responsesLast7Days;

        /** Respostas nos últimos 30 dias */
        private long responsesLast30Days;

        /** Data da primeira resposta */
        private String firstResponseAt;

        /** Data da última resposta */
        private String lastResponseAt;

        /** Tempo médio de preenchimento em segundos (calculado via metadata.startedAt) */
        private Long averageCompletionTimeSeconds;
    }

    @Data
    @Builder
    public static class TimelineEntry {
        private String date;    // formato yyyy-MM-dd
        private long count;
    }

    @Data
    @Builder
    public static class QuestionAnalytics {
        private UUID questionId;
        private String label;
        private String type;
        private String sectionId;
        private int orderIndex;

        /** Quantas respostas incluíram esta questão */
        private long totalAnswered;

        /** Quantas respostas pularam esta questão (não responderam) */
        private long totalSkipped;

        /** Taxa de resposta (0.0 a 1.0) */
        private double answerRate;

        // Presente apenas para: single_choice, multi_choice, dropdown
        private ChoiceDistribution choiceDistribution;

        // Presente apenas para: number, rating, scale
        private NumericStats numericStats;

        // Presente apenas para: short_text, long_text, email, phone, url
        private TextStats textStats;

        // Presente apenas para: date
        private DateStats dateStats;

        // Presente apenas para: file_upload
        private FileStats fileStats;
    }

    @Data
    @Builder
    public static class ChoiceDistribution {
        /** Mapa: valor da opção → contagem */
        private Map<String, Long> distribution;

        /** Total de seleções (para multi_choice pode ser > totalAnswered) */
        private long totalSelections;
    }

    @Data
    @Builder
    public static class NumericStats {
        private BigDecimal average;
        private BigDecimal min;
        private BigDecimal max;
        private BigDecimal median;
        private BigDecimal sum;
        private BigDecimal standardDeviation;
        private long count;
    }

    @Data
    @Builder
    public static class TextStats {
        private double averageLength;
        private int minLength;
        private int maxLength;
        private long totalAnswered;

        /** Top 10 palavras mais frequentes (excluindo stopwords) */
        private List<WordFrequency> topWords;
    }

    @Data
    @Builder
    public static class WordFrequency {
        private String word;
        private long count;
    }

    @Data
    @Builder
    public static class DateStats {
        private String earliest;   // yyyy-MM-dd
        private String latest;     // yyyy-MM-dd
        private long count;
    }

    @Data
    @Builder
    public static class FileStats {
        private long totalFiles;
        private double averageFilesPerResponse;
    }
}
