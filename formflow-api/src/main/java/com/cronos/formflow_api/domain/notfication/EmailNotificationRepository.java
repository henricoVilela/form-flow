package com.cronos.formflow_api.domain.notfication;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailNotificationRepository extends JpaRepository<EmailNotification, UUID> {
    List<EmailNotification> findByStatusAndAttemptsLessThan(NotificationStatus status, int maxAttempts);
}

