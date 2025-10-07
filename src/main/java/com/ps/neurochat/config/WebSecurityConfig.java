package com.ps.neurochat.config;

import com.ps.neurochat.userdetails.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.rememberme.JdbcTokenRepositoryImpl;
import org.springframework.security.web.authentication.rememberme.PersistentTokenRepository;

import javax.sql.DataSource;

@Configuration
@EnableWebSecurity
public class WebSecurityConfig {

    private final DataSource dataSource;
    private final CustomUserDetailsService userDetailsService;

    @Value("${server.ssl.enabled:false}")
    private boolean sslEnabled;

    @Value("${app.security.remember-me-key:ollama-ai-secret-key}")
    private String rememberMeKey;

    public WebSecurityConfig(DataSource dataSource, CustomUserDetailsService userDetailsService) {
        this.dataSource = dataSource;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers("/", "/index",
                                "/registration",
                                "/saveUser",
                                "/forgot-password",
                                "/reset-password",
                                "/actuator/health")
                        .permitAll()
                        .requestMatchers("/admin/**", "/api/admin/**").hasRole("ADMIN")
                        .anyRequest()
                        .authenticated()
                )
                .formLogin(form -> form
                        .loginPage("/index")
                        .loginProcessingUrl("/perform_login")
                        .failureUrl("/index?error=true")
                        .defaultSuccessUrl("/home", true)
                        .permitAll()
                )
                .rememberMe(rememberMe -> rememberMe
                        .tokenRepository(persistentTokenRepository())
                        .tokenValiditySeconds(604800) // 7 дней
                        .userDetailsService(userDetailsService)
                        .rememberMeParameter("remember-me")
                        .key(rememberMeKey)
                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/index?logout=true")
                        .deleteCookies("JSESSIONID", "remember-me")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .permitAll()
                )
                .sessionManagement(session -> session
                        .invalidSessionUrl("/index")
                        .maximumSessions(3) // Максимум 3 сессии на пользователя
                        .maxSessionsPreventsLogin(false)
                        .expiredUrl("/index?expired=true")
                );

        if (sslEnabled) {
            http.sessionManagement(session ->
                session.sessionFixation().migrateSession()
                      .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            );
        }

        http.csrf(AbstractHttpConfigurer::disable);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public PersistentTokenRepository persistentTokenRepository() {
        JdbcTokenRepositoryImpl tokenRepository = new JdbcTokenRepositoryImpl();
        tokenRepository.setDataSource(dataSource);
        return tokenRepository;
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return web -> web.ignoring()
                .requestMatchers("/resources/**", "/static/**",
                        "/css/**", "/js/**", "/img/**", "/webjars/**",
                        "/favicon.ico", "/robots.txt");
    }
}
