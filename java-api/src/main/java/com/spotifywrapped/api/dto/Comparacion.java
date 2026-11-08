package com.spotifywrapped.api.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Dos perfiles frente a frente.
 *
 * Las cantidades (reproducciones, coberturas, listas en común) cuentan solo desde {@code desde}, el día en que
 * empiezan a existir los dos historiales: antes de esa fecha uno de los dos no tiene datos y la comparación no
 * sería justa. Los descubrimientos usan el historial completo con la misma regla (ver {@link Descubrimientos}).
 * Si alguno de los dos no tiene reproducciones, {@code desde} es null y las listas vienen vacías.
 */
public record Comparacion(
        PerfilComparado a,
        PerfilComparado b,
        LocalDate desde,
        double coberturaA,
        double coberturaB,
        int artistasEnComun,
        int cancionesEnComun,
        Descubrimientos descubrimientos,
        List<Compartido> artistas,
        List<Compartido> canciones,
        List<Descubierto> descubiertosPorA,
        List<Descubierto> descubiertosPorB) {

    /** Cifras de un perfil en el período común; {@code primera} es el día en que empieza su historial. */
    public record PerfilComparado(int id, String nombre, LocalDate primera, long reproducciones, long artistas, long canciones) {
    }

    /** Un artista o una canción que escuchan los dos. trackId solo viene en las canciones. */
    public record Compartido(
            Integer trackId,
            Integer artistId,
            String nombre,
            String artistName,
            String coverUri,
            long reproduccionesA,
            long reproduccionesB) {
    }

    /**
     * Quién escuchó antes a cada artista en común. Solo cuenta un artista si la primera escucha de los dos ocurrió
     * cuando ya existían ambos historiales; los demás van a {@code sinComparar}. Se compara por día.
     */
    public record Descubrimientos(int primeroA, int primeroB, int mismoDia, int sinComparar) {
    }

    /** Un artista que uno escuchó primero; {@code reproduccionesDelOtro} mide cuánto lo adoptó el otro. */
    public record Descubierto(
            Integer artistId,
            String nombre,
            String coverUri,
            LocalDate primeraA,
            LocalDate primeraB,
            long reproduccionesDelOtro) {
    }
}
