package com.cronos.formflow_api.infrastructure.mail;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.domain.notfication.EmailNotification;
import com.cronos.formflow_api.domain.notfication.EmailNotificationRepository;
import com.cronos.formflow_api.domain.notfication.NotificationStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailNotificationRepository notificationRepository;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.mail.from-name}")
    private String fromName;

    @Scheduled(fixedDelay = 30000) // a cada 30 segundos
    @Transactional
    public void processpending() {
        List<EmailNotification> pending = notificationRepository
                .findByStatusAndAttemptsLessThan(NotificationStatus.PENDING, 3);

        for (EmailNotification notification : pending) {
            try {
                send(notification);
                notification.setStatus(NotificationStatus.SENT);
                notification.setSentAt(LocalDateTime.now());
                log.info("Email enviado para {}", notification.getRecipient());
            } catch (Exception e) {
                notification.setAttempts(notification.getAttempts() + 1);
                notification.setError(e.getMessage());
                if (notification.getAttempts() >= 3) {
                    notification.setStatus(NotificationStatus.FAILED);
                    log.error("Email falhou após 3 tentativas para {}", notification.getRecipient());
                }
            }
            notificationRepository.save(notification);
        }
    }

    private void send(EmailNotification notification) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(String.format("%s <%s>", fromName, from));
        message.setTo(notification.getRecipient());
        message.setSubject("Nova resposta recebida no FormFlow");
        message.setText(buildBody(notification));
        mailSender.send(message);
    }

    private String buildBody(EmailNotification notification) {
        return String.format("""
                Olá,
                
                Você recebeu uma nova resposta no seu formulário.
                
                ID da resposta: %s
                Recebida em: %s
                
                Acesse sua conta para visualizar os detalhes.
                
                — FormFlow
                """,
                notification.getResponse().getId(),
                notification.getResponse().getSubmittedAt()
        );
    }
}
