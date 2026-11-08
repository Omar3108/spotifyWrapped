package com.spotifywrapped.api.service;

import java.time.Instant;

import org.springframework.stereotype.Component;

/**
 * Estado de la carga de historial en curso. Solo puede haber una a la vez: el reemplazo es una
 * transacción larga y dos cargas seguidas del mismo perfil se pisarían.
 * Vive en memoria; si la API se reinicia a medias, la transacción se deshace y no queda nada a medias.
 */
@Component
public class CargaEstado {

    public static final String INACTIVA = "inactiva";
    public static final String LEYENDO = "leyendo";
    public static final String GUARDANDO = "guardando";
    public static final String LISTA = "lista";
    public static final String ERROR = "error";

    public record Estado(String fase, Integer perfil, long reproducciones, int archivos, String mensaje,
                         Instant inicio, Instant fin) {
    }

    private Estado actual = new Estado(INACTIVA, null, 0, 0, null, null, null);

    /** Reserva la carga. Falso si ya hay una leyendo o guardando. */
    public synchronized boolean intentarIniciar(int perfil) {
        if (ocupado()) {
            return false;
        }
        actual = new Estado(LEYENDO, perfil, 0, 0, null, Instant.now(), null);
        return true;
    }

    public synchronized boolean ocupado() {
        return LEYENDO.equals(actual.fase()) || GUARDANDO.equals(actual.fase());
    }

    public synchronized void guardando(long reproducciones, int archivos) {
        actual = new Estado(GUARDANDO, actual.perfil(), reproducciones, archivos, null, actual.inicio(), null);
    }

    public synchronized void lista(String mensaje) {
        actual = new Estado(LISTA, actual.perfil(), actual.reproducciones(), actual.archivos(), mensaje,
                actual.inicio(), Instant.now());
    }

    public synchronized void error(String mensaje) {
        actual = new Estado(ERROR, actual.perfil(), actual.reproducciones(), actual.archivos(), mensaje,
                actual.inicio(), Instant.now());
    }

    /** Una subida rechazada antes de tocar la base no deja rastro: vuelve a estar libre. */
    public synchronized void liberar() {
        actual = new Estado(INACTIVA, null, 0, 0, null, null, null);
    }

    public synchronized Estado actual() {
        return actual;
    }
}
