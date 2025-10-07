package com.ps.neurochat.config.local;

import com.ps.neurochat.domain.User;
import com.ps.neurochat.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("dev")
public class DataUserLoaderForDev {

    @Bean
    public CommandLineRunner createDemoUsers(UserRepository repo, PasswordEncoder encoder) {
        return args -> {
            if (repo.findByEmail("user@user.com").isEmpty()) {
                User user = new User();
                user.setEmail("user@user.com");
                user.setPassword(encoder.encode("password"));
                user.setFirstName("User");
                user.setLastName("User");
                user.setRole("ADMIN");
                user.setEnabled(true);
                repo.save(user);
            }
        };
    }
}
