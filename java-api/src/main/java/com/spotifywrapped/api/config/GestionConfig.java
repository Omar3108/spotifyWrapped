package com.spotifywrapped.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Las escrituras de /gestion exigen la cabecera X-Wrapped-Gestion. Un formulario o una imagen de otra
 * web no puede añadirla, y si lo intenta con fetch el navegador pide permiso antes (CORS).
 */
@Configuration
public class GestionConfig implements WebMvcConfigurer {

    public static final String CABECERA = "X-Wrapped-Gestion";

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
                String metodo = req.getMethod();
                boolean lectura = HttpMethod.GET.matches(metodo) || HttpMethod.HEAD.matches(metodo)
                        || HttpMethod.OPTIONS.matches(metodo);
                if (!lectura && !"1".equals(req.getHeader(CABECERA))) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Falta la cabecera " + CABECERA);
                }
                return true;
            }
        }).addPathPatterns("/api/wrapped/gestion/**");
    }
}
