package com.ps.ollamaai.util;

import com.ps.ollamaai.service.EncryptionService;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class KeyGeneratorUtil {

    public static void main(String[] args) {
        // Генерируем ключ для шифрования
        String encryptionKey = EncryptionService.generateSecretKey();
        log.info("Ключ для шифрования: {}", encryptionKey);

        // Генерируем ключ для Remember Me
        String rememberMeKey = generateRandomString(64);
        log.info("Ключ для Remember Me: {}", rememberMeKey);
    }

    private static String generateRandomString(int length) {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder result = new StringBuilder();
        java.security.SecureRandom random = new java.security.SecureRandom();

        for (int i = 0; i < length; i++) {
            result.append(characters.charAt(random.nextInt(characters.length())));
        }

        return result.toString();
    }
}
