package com.spotifywrapped.api.config;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Mantiene el formato de error de Spring (timestamp, status, error, path) sin
 * exponer trazas ni mensajes internos. El detalle queda solo en el log.
 * message aparece únicamente cuando lo escribimos nosotros para validar la entrada.
 */
@RestControllerAdvice
public class GlobalErrorHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalErrorHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> inesperado(Exception e, WebRequest request) {
        log.error("Error no controlado en {}", ruta(request), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(cuerpo(HttpStatus.INTERNAL_SERVER_ERROR, null, request));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception e, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        String mensaje = e instanceof ResponseStatusException r ? r.getReason() : null;
        return ResponseEntity.status(status).headers(headers).body(cuerpo(status, mensaje, request));
    }

    private Map<String, Object> cuerpo(HttpStatusCode status, String mensaje, WebRequest request) {
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("timestamp", Instant.now().toString());
        cuerpo.put("status", status.value());
        HttpStatus conocido = HttpStatus.resolve(status.value());
        cuerpo.put("error", conocido != null ? conocido.getReasonPhrase() : "Error");
        if (mensaje != null) {
            cuerpo.put("message", mensaje);
        }
        cuerpo.put("path", ruta(request));
        return cuerpo;
    }

    private static String ruta(WebRequest request) {
        return request instanceof ServletWebRequest s ? s.getRequest().getRequestURI() : "";
    }
}
