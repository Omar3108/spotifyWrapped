package com.spotifywrapped.api.config;

import java.time.Duration;
import java.util.List;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

/** El historial solo cambia al recargar el ETL: basta con reiniciar la API o esperar una hora. */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager gestor = new SimpleCacheManager();
        gestor.setCaches(List.of(cache("rangos", 200), cache("busquedas", 500), cache("comparaciones", 50)));
        return gestor;
    }

    private static CaffeineCache cache(String nombre, long maximo) {
        return new CaffeineCache(nombre, Caffeine.newBuilder()
                .maximumSize(maximo)
                .expireAfterWrite(Duration.ofHours(1))
                .build());
    }
}
