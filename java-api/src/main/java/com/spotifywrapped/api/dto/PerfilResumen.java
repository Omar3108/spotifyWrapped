package com.spotifywrapped.api.dto;

import java.time.LocalDateTime;

/** Un perfil con lo justo para decidir qué mostrar: si tiene datos, de cuándo a cuándo y cuándo se cargaron. */
public record PerfilResumen(
        int id,
        String nombre,
        long reproducciones,
        LocalDateTime primeraReproduccion,
        LocalDateTime ultimaReproduccion,
        LocalDateTime datosActualizados) {
}
