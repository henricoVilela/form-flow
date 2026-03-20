package com.cronos.formflow_api.api.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStatsResponse {
    private long totalResponses;
    private long responsesThisWeek;
}
