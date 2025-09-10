package com.ps.neurochat.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaOptions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OllamaServiceTest {

    @Mock private OllamaChatModel model;
    @InjectMocks private OllamaService service;

    @Test
    @DisplayName("callSimpleOllamaChat delegates to model.call(String)")
    void callSimple() {
        when(model.call("hi")).thenReturn("hello");
        String out = service.callSimpleOllamaChat("hi");
        assertThat(out).isEqualTo("hello");
    }

    @Test
    @DisplayName("getCurrentModelName returns from default options")
    void currentModelName() {
        OllamaOptions opts = mock(OllamaOptions.class);
        when(opts.getModel()).thenReturn("llama3");
        when(model.getDefaultOptions()).thenReturn(opts);
        assertThat(service.getCurrentModelName()).isEqualTo("llama3");
    }
}
