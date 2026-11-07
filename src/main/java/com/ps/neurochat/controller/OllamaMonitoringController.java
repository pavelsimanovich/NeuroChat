package com.ps.neurochat.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/monitoring/ollama")
public class OllamaMonitoringController {
    private final RestClient client;

    public OllamaMonitoringController(RestClient.Builder builder,
            @Value("${spring.ai.ollama.base-url:http://localhost:11434}") String baseUrl) {
        var httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
        var factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(4));
        this.client = builder.baseUrl(baseUrl).requestFactory(factory).build();
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> processes() {
        try {
            Map<String, Object> response = client.get().uri("/api/ps").retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (response == null || !(response.get("models") instanceof List<?> models)) {
                return unavailable();
            }
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(Map.of("available", true, "models", models));
        } catch (RuntimeException exception) {
            return unavailable();
        }
    }

    private ResponseEntity<Map<String, Object>> unavailable() {
        return ResponseEntity.status(503).cacheControl(CacheControl.noStore())
                .body(Map.of("available", false, "models", List.of()));
    }
}
