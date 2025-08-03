package com.ps.ollamaai.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String from;

    @Value("${app.url}")
    private String appUrl;

    @Async
    public void sendEmailWithTemplate(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());

            // Создаем изменяемую копию Map если она неизменяемая
            Map<String, Object> mutableVariables = new HashMap<>(variables);
            // Добавляем базовый URL приложения в контекст
            mutableVariables.put("appUrl", appUrl);

            Context context = new Context();
            mutableVariables.forEach(context::setVariable);
            String html = templateEngine.process(templateName, context);

            helper.setTo(to);
            helper.setFrom(from);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Email успешно отправлен на адрес: {}", to);
        } catch (MessagingException e) {
            log.error("Ошибка при отправке email на адрес: {}", to, e);
        }
    }

    @Async
    public void sendPasswordResetEmail(String to, String token, String name) {
        String resetUrl = appUrl + "/reset-password?token=" + token;
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("resetUrl", resetUrl);
        variables.put("expiryHours", 24);

        sendEmailWithTemplate(
                to,
                "Восстановление пароля",
                "password-reset-email",
                variables
        );
    }
}