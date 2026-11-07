package com.ps.neurochat.controller;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OllamaMonitoringControllerTest {
    private HttpServer server;
    private OllamaMonitoringController controller;
    private int upstreamStatus = 200;
    private String upstreamBody = "{\"models\":[]}";

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/ps", exchange -> {
            byte[] bytes = upstreamBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(upstreamStatus, bytes.length);
            try (var output = exchange.getResponseBody()) {
                output.write(bytes);
            }
        });
        server.start();
        controller = new OllamaMonitoringController(RestClient.builder(),
                "http://127.0.0.1:" + server.getAddress().getPort());
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void returnsRunningModelsAndDisablesCaching() {
        upstreamBody = """
                {"models":[{"name":"gemma:12b","size":1234,"size_vram":1000,
                "context_length":4096,"details":{"quantization_level":"Q4_K_M"}}]}
                """;
        var response = controller.processes();
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
        assertThat(response.getBody()).containsEntry("available", true);
        assertThat((List<?>) response.getBody().get("models")).hasSize(1);
    }

    @Test
    void emptyModelsMeansAvailableButIdle() {
        var response = controller.processes();
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).containsEntry("available", true)
                .containsEntry("models", List.of());
    }

    @Test
    void upstreamFailureIsNotReportedAsIdle() {
        upstreamStatus = 500;
        var response = controller.processes();
        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody()).containsEntry("available", false);
    }

    @Test
    void invalidResponseIsUnavailable() {
        upstreamBody = "{}";
        var response = controller.processes();
        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody()).containsEntry("available", false);
    }
}
