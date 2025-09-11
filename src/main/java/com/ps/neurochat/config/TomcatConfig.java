package com.ps.neurochat.config;

import org.apache.catalina.Context;
import org.apache.catalina.connector.Connector;
import org.apache.tomcat.util.descriptor.web.SecurityCollection;
import org.apache.tomcat.util.descriptor.web.SecurityConstraint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.servlet.server.ServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TomcatConfig {

    @Value("${server.ssl.enabled:false}")
    private boolean sslEnabled;

    @Value("${server.port:8443}")
    private int serverPort;

    @Value("${server.http.port:8080}")
    private int httpPort;

    @Bean
    public ServletWebServerFactory servletContainer() {
        TomcatServletWebServerFactory tomcat = new TomcatServletWebServerFactory() {
            @Override
            protected void postProcessContext(Context context) {
                if (sslEnabled) {
                    // Настраиваем автоматическое перенаправление HTTP на HTTPS
                    SecurityConstraint securityConstraint = new SecurityConstraint();
                    securityConstraint.setUserConstraint("CONFIDENTIAL");
                    SecurityCollection collection = new SecurityCollection();
                    collection.addPattern("/*");
                    securityConstraint.addCollection(collection);
                    context.addConstraint(securityConstraint);
                }
            }
        };

        if (sslEnabled) {
            // Настройка протоколов и шифров для TLS
            tomcat.addConnectorCustomizers(connector -> {
                if (connector.getSecure()) {
                    connector.setProperty("sslProtocol", "TLS");
                    connector.setProperty("SSLEnabled", "true");
                    connector.setProperty("sslEnabledProtocols", "TLSv1.2,TLSv1.3");
                    connector.setProperty("ciphers", "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384," +
                            "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256," +
                            "TLS_AES_256_GCM_SHA384," +
                            "TLS_AES_128_GCM_SHA256");
                }
            });
            tomcat.addAdditionalTomcatConnectors(redirectConnector());
        }

        return tomcat;
    }

    private Connector redirectConnector() {
        Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
        connector.setScheme("http");
        connector.setPort(httpPort);
        connector.setSecure(false);
        connector.setRedirectPort(serverPort);
        connector.setXpoweredBy(false);
        connector.setAllowTrace(false);
        return connector;
    }
}
