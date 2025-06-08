package com.ps.ollamaai.config;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
//@Profile("local")
public class DataLoaderTest {

    @Bean
    public CommandLineRunner createDemoUsers(UserRepository repo, PasswordEncoder encoder) {
        return args -> {
            if (repo.findByEmail("user@user.com").isEmpty()) {
                User user = new User();
                user.setEmail("user@user.com");
                user.setPassword(encoder.encode("password"));
                user.setEnabled(true);
                repo.save(user);
            }
        };
    }
}
