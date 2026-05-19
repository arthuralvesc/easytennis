package com.easytennis.service;

public interface EmailService {

    void sendPasswordResetCode(String toEmail, String code);
}
