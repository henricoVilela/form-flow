package com.cronos.formflow_api.infrastructure.mail;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.domain.notfication.EmailNotification;
import com.cronos.formflow_api.domain.notfication.EmailNotificationRepository;
import com.cronos.formflow_api.domain.notfication.NotificationStatus;
import com.cronos.formflow_api.domain.user.User;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final EmailNotificationRepository notificationRepository;

    @Value("${spring.sendgrid.api-key}")
    private String sendgridApiKey;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.mail.from-name}")
    private String fromName;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Scheduled(fixedDelay = 30000)
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

    private void send(EmailNotification notification) throws IOException {
        sendEmail(
            notification.getRecipient(),
            "Nova resposta recebida no FormFlow",
            buildBody(notification)
        );
    }

    public void sendVerificationEmail(User user, String token) throws IOException {
        String verificationUrl = frontendUrl + "/verify-email?token=" + token;

        String body = String.format("""
                Olá, %s!

                Obrigado por criar sua conta no FormFlow.
                Clique no link abaixo para confirmar seu e-mail:

                %s

                O link expira em 24 horas.

                Se você não criou esta conta, ignore este e-mail.

                — FormFlow
                """, user.getName(), verificationUrl);

        sendEmail(user.getEmail(), "Confirme seu e-mail - FormFlow", body);
        log.info("E-mail de verificação enviado para {}", user.getEmail());
    }

    private void sendEmail(String to, String subject, String body) throws IOException {
        Email fromEmail = new Email(from, fromName);
        Email toEmail = new Email(to);
        Content content = new Content("text/plain", body);
        Mail mail = new Mail(fromEmail, subject, toEmail, content);

        SendGrid sg = new SendGrid(sendgridApiKey);
        Request request = new Request();
        request.setMethod(Method.POST);
        request.setEndpoint("mail/send");
        request.setBody(mail.build());

        Response response = sg.api(request);
        if (response.getStatusCode() >= 400) {
            throw new RuntimeException("SendGrid error: " + response.getStatusCode() + " - " + response.getBody());
        }
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
