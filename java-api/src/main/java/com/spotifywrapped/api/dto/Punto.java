package com.spotifywrapped.api.dto;

/** Un tramo de una serie temporal. artistaLider solo se rellena en la serie mensual de un rango. */
public record Punto(String periodo, Long reproducciones, Double minutos, String artistaLider) {
}
