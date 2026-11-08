package com.spotifywrapped.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import com.spotifywrapped.api.dto.Comparacion;
import com.spotifywrapped.api.repository.CompareRepository;
import com.spotifywrapped.api.repository.CompareRepository.FilaArtista;
import com.spotifywrapped.api.repository.CompareRepository.FilaCancion;
import com.spotifywrapped.api.repository.CompareRepository.Perfil;
import com.spotifywrapped.api.repository.CompareRepository.Totales;

class CompareServiceTest {

    // A registra desde 2017; B, desde 2021: el período común empieza el 2021-03-26.
    private static final Perfil A = new Perfil(1, "Ana", LocalDateTime.of(2017, 4, 26, 1, 0));
    private static final Perfil B = new Perfil(2, "Beto", LocalDateTime.of(2021, 3, 26, 17, 42));
    private static final LocalDateTime DESDE = B.primera();
    private static final LocalDate D = DESDE.toLocalDate();

    private static FilaArtista artista(int id, String nombre, long nA, LocalDate pA, long nB, LocalDate pB) {
        return new FilaArtista(id, nombre, "spotify:track:" + id, nA, pA, nB, pB);
    }

    @Test
    void soloComparaDescubrimientosCuandoExistenLosDosHistoriales() {
        List<FilaArtista> filas = List.of(
                // A lo escuchó en 2018: B quizá ya lo conocía antes de 2021, no se puede saber.
                artista(1, "Antiguo", 50, LocalDate.of(2018, 1, 1), 10, D.plusDays(3)),
                artista(2, "DeA", 5, D.plusDays(10), 40, D.plusDays(90)),
                artista(3, "DeB", 30, D.plusDays(200), 8, D.plusDays(20)),
                artista(4, "Juntos", 3, D.plusDays(5), 3, D.plusDays(5)));

        Comparacion c = CompareService.componer(A, B, DESDE, new Totales(100, 4, 9), new Totales(100, 4, 9), filas, List.of());

        assertThat(c.desde()).isEqualTo(D);
        assertThat(c.descubrimientos()).isEqualTo(new Comparacion.Descubrimientos(1, 1, 1, 1));
        assertThat(c.descubiertosPorA()).extracting(Comparacion.Descubierto::nombre).containsExactly("DeA");
        assertThat(c.descubiertosPorA().get(0).reproduccionesDelOtro()).isEqualTo(40);
        assertThat(c.descubiertosPorB()).extracting(Comparacion.Descubierto::nombre).containsExactly("DeB");
        assertThat(c.descubiertosPorB().get(0).reproduccionesDelOtro()).isEqualTo(30);
    }

    @Test
    void ordenaPorLaMenorDeLasDosCuotasYNoPorLaSuma() {
        List<FilaArtista> filas = List.of(
                artista(1, "SoloDeA", 90, D, 1, D),   // cuotas 0,90 y 0,01
                artista(2, "DeLosDos", 10, D, 20, D), // cuotas 0,10 y 0,20
                artista(3, "SinB", 5, D, 0, D.minusDays(1))); // B solo lo escuchó antes del período común

        Comparacion c = CompareService.componer(A, B, DESDE, new Totales(100, 3, 3), new Totales(100, 3, 3), filas, List.of());

        assertThat(c.artistas()).extracting(Comparacion.Compartido::nombre).containsExactly("DeLosDos", "SoloDeA");
        assertThat(c.artistasEnComun()).isEqualTo(2);
        assertThat(c.coberturaA()).isEqualTo(1.0);   // 90 + 10 de 100
        assertThat(c.coberturaB()).isEqualTo(0.21);  // 1 + 20 de 100
    }

    @Test
    void lasCancionesLlevanSuTrackIdYCuentanSoloLasDeLosDos() {
        List<FilaCancion> canciones = List.of(
                new FilaCancion(7, "Tema", "Artista", "spotify:track:x", 4, 6),
                new FilaCancion(8, "Otro", "Artista", "spotify:track:y", 2, 0));

        Comparacion c = CompareService.componer(A, B, DESDE, new Totales(10, 1, 2), new Totales(10, 1, 1), List.of(), canciones);

        assertThat(c.cancionesEnComun()).isEqualTo(1);
        assertThat(c.canciones()).singleElement().satisfies(x -> {
            assertThat(x.trackId()).isEqualTo(7);
            assertThat(x.artistId()).isNull();
            assertThat(x.artistName()).isEqualTo("Artista");
        });
    }

    @Test
    void sinHistorialDevuelveCerosYListasVacias() {
        Perfil vacio = new Perfil(3, "Nuevo", null);
        Totales cero = new Totales(0, 0, 0);

        Comparacion c = CompareService.componer(A, vacio, null, cero, cero, List.of(), List.of());

        assertThat(c.desde()).isNull();
        assertThat(c.coberturaA()).isZero();
        assertThat(c.artistas()).isEmpty();
        assertThat(c.descubrimientos()).isEqualTo(new Comparacion.Descubrimientos(0, 0, 0, 0));
    }

    @Test
    void elMismoPerfilDosVecesEsUnError() {
        CompareService servicio = new CompareService(mock(CompareRepository.class));
        assertThatThrownBy(() -> servicio.comparar(1, 1))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("dos perfiles distintos");
    }
}
