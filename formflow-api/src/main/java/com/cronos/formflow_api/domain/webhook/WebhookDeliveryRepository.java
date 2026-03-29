package com.cronos.formflow_api.domain.webhook;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, UUID> {

    @Query("SELECT d FROM WebhookDelivery d WHERE d.status = 'PENDING' AND d.nextAttemptAt <= :now ORDER BY d.nextAttemptAt ASC")
    List<WebhookDelivery> findPendingDue(LocalDateTime now);
}
