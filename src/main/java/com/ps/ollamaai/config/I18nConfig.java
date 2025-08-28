package com.ps.ollamaai.config;

import com.ps.ollamaai.domain.UserPreferencies;
import com.ps.ollamaai.service.UserPreferencesService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.lang.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;

import java.util.List;
import java.util.Locale;

@Configuration
@RequiredArgsConstructor
public class I18nConfig implements WebMvcConfigurer {

    private final UserPreferencesService userPreferencesService;

    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
        messageSource.setBasenames("messages");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setFallbackToSystemLocale(false);
        messageSource.setUseCodeAsDefaultMessage(true);
        return messageSource;
    }

    @Bean
    public LocaleResolver localeResolver() {
        return new UserPreferenceLocaleResolver(userPreferencesService);
    }

    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");
        return interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor());
    }

    static class UserPreferenceLocaleResolver extends AcceptHeaderLocaleResolver {
        private final UserPreferencesService userPreferencesService;

        UserPreferenceLocaleResolver(UserPreferencesService userPreferencesService) {
            this.userPreferencesService = userPreferencesService;
            setDefaultLocale(Locale.ENGLISH);
            setSupportedLocales(List.of(Locale.ENGLISH, new Locale("ru")));
        }

        @Override
        public Locale resolveLocale(HttpServletRequest request) {
            // 1) Explicit query param has highest priority
            String qp = request.getParameter("lang");
            if (StringUtils.hasText(qp)) {
                return toLocaleSafe(qp);
            }
            // 2) User preference from DB
            String username = getCurrentUsername();
            if (StringUtils.hasText(username)) {
                String lang = userPreferencesService.findByUserId(username)
                        .map(UserPreferencies::getLanguage)
                        .filter(StringUtils::hasText)
                        .orElse(null);
                if (StringUtils.hasText(lang)) {
                    return toLocaleSafe(lang);
                }
            }
            // 3) Accept-Language header
            Locale headerLocale = super.resolveLocale(request);
            if (headerLocale != null) {
                return headerLocale;
            }
            // 4) Default
            return getDefaultLocale() != null ? getDefaultLocale() : Locale.ENGLISH;
        }

        private Locale toLocaleSafe(String tag) {
            try {
                return Locale.forLanguageTag(tag);
            } catch (Exception ignored) {
                return Locale.ENGLISH;
            }
        }

        @Nullable
        private String getCurrentUsername() {
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth == null) return null;
                Object principal = auth.getPrincipal();
                if (principal instanceof UserDetails ud) {
                    return ud.getUsername();
                }
                if (principal instanceof String s) {
                    return s;
                }
            } catch (Exception ignored) {}
            return null;
        }
    }
}
