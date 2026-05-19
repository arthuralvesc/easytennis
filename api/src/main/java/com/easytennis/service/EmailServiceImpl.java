package com.easytennis.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Override
    public void sendPasswordResetCode(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("EasyTennis — Password Reset Code");
        message.setText(
                "Your password reset code is: " + code + "\n\n" +
                "This code expires in 15 minutes.\n\n" +
                "If you did not request a password reset, please ignore this email."
        );
        mailSender.send(message);
    }
}
