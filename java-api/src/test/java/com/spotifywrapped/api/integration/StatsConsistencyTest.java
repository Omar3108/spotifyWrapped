package com.spotifywrapped.api.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.spotifywrapped.api.dto.ArtistRanking;
import com.spotifywrapped.api.dto.HourlyPattern;
import com.spotifywrapped.api.dto.Punto;
import com.spotifywrapped.api.dto.RangeRanked;
import com.spotifywrapped.api.dto.RangeStats;
import com.spotifywrapped.api.dto.SongDetail;
import com.spotifywrapped.api.dto.SongSearchResult;
import com.spotifywrapped.api.dto.SongVersion;
import com.spotifywrapped.api.dto.TopAlbum;
import com.spotifywrapped.api.dto.TopTrack;
import com.spotifywrapped.api.dto.WrappedSummary;
import com.spotifywrapped.api.repository.PlayRepository;
import com.spotifywrapped.api.service.ExploreService;
import com.spotifywrapped.api.service.RangeService;
import com.spotifywrapped.api.support.DateRange;
import com.spotifywrapped.api.support.SearchPattern;

/**
 * Compara las secciones nuevas con las existentes usando la base real, solo lectura.
 * Se ejecuta aparte: ./mvnw test -Dtest.excluded=none -Dgroups=integration
 */
@Tag("integration")
@SpringBootTest
class StatsConsistencyTest {

    @Autowired private RangeService rangos;
    @Autowired private ExploreService explore;
    @Autowired private PlayRepository plays;

    private WrappedSummary resumen() {
        return plays.obtenerResumenGeneral();
    }

    private LocalDate primerDia() {
        return resumen().getPrimeraReproduccion().toLocalDate();
    }

    private LocalDate ultimoDia() {
        return resumen().getUltimaReproduccion().toLocalDate();
    }

    private RangeStats rango(LocalDate a, LocalDate b) {
        return rangos.estadisticas(new DateRange(a, b), 10);
    }

    private RangeStats anio(int a) {
        return rango(LocalDate.of(a, 1, 1), LocalDate.of(a, 12, 31));
    }

    private static long suma(List<Punto> serie) {
        return serie.stream().mapToLong(Punto::reproducciones).sum();
    }

    @Test
    void todoElHistorialCoincideConLaPortada() {
        WrappedSummary s = resumen();
        RangeStats r = rango(primerDia(), ultimoDia());
        assertThat(r.reproducciones()).isEqualTo(s.getTotalReproducciones());
        assertThat(r.minutos()).isCloseTo(s.getTotalMinutos(), within(0.01));
        assertThat(r.cancionesDistintas()).isEqualTo(s.getCancionesDistintas());
    }

    @Test
    void lasSeriesSumanElTotalDelRango() {
        RangeStats r = rango(primerDia(), ultimoDia());
        assertThat(suma(r.porMes())).isEqualTo(r.reproducciones());
        assertThat(suma(r.porHora())).isEqualTo(r.reproducciones());
    }

    @Test
    void elPatronPorHoraCoincideConHabitos() {
        RangeStats r = rango(primerDia(), ultimoDia());
        for (HourlyPattern h : plays.obtenerPatronPorHora()) {
            assertThat(r.porHora().get(h.getHoraDelDia()).reproducciones())
                    .as("hora %s", h.getHoraDelDia())
                    .isEqualTo(h.getReproducciones().longValue());
        }
    }

    @Test
    void losAniosCompletosCoincidenConViajeEnElTiempo() {
        for (int a = primerDia().getYear(); a <= ultimoDia().getYear(); a++) {
            RangeStats r = anio(a);
            assertThat(r.topArtistas()).extracting(x -> x.getReproducciones().longValue())
                    .as("artistas %s", a)
                    .containsExactlyElementsOf(plays.obtenerTopArtistasPorAnio(a, 10).stream()
                            .map(x -> x.getReproducciones().longValue()).toList());
            assertThat(r.topCanciones()).extracting(x -> x.getReproducciones().longValue())
                    .as("canciones %s", a)
                    .containsExactlyElementsOf(plays.obtenerTopCancionesPorAnio(a, 10).stream()
                            .map(x -> x.getReproducciones().longValue()).toList());
            assertThat(r.topAlbumes()).extracting(x -> x.getReproducciones().longValue())
                    .as("albumes %s", a)
                    .containsExactlyElementsOf(plays.obtenerTopAlbumesPorAnio(a, 10).stream()
                            .map(x -> x.getReproducciones().longValue()).toList());
        }
    }

    @Test
    void elMejorArtistaDelAnioCoincideConEvolucion() {
        plays.obtenerTopArtistaPorAnio().forEach(fila -> {
            RangeRanked primero = anio(fila.getAnio()).topArtistas().get(0);
            assertThat(primero.getReproducciones().longValue())
                    .as("año %s", fila.getAnio())
                    .isEqualTo(fila.getReproducciones().longValue());
        });
    }

    @Test
    void losAniosSumanElHistorialSinHuecosNiSolapes() {
        long total = 0;
        for (int a = primerDia().getYear(); a <= ultimoDia().getYear(); a++) {
            total += anio(a).reproducciones();
        }
        assertThat(total).isEqualTo(resumen().getTotalReproducciones());
    }

    @Test
    void partirUnPeriodoEnDosNoPierdeNiDuplicaReproducciones() {
        LocalDate a = LocalDate.of(2023, 6, 14);
        LocalDate b = a.plusDays(1);
        assertThat(rango(a, a).reproducciones() + rango(b, b).reproducciones())
                .isEqualTo(rango(a, b).reproducciones());
    }

    @Test
    void elUltimoDiaSeIncluyeCompleto() {
        LocalDate dia = ultimoDia();
        assertThat(rango(dia, dia).reproducciones()).isPositive();
        assertThat(rango(dia.plusDays(1), dia.plusDays(30)).reproducciones()).isZero();
    }

    @Test
    void unRangoSinDatosDevuelveCerosYListasVacias() {
        RangeStats r = rango(LocalDate.of(2010, 1, 1), LocalDate.of(2010, 1, 31));
        assertThat(r.reproducciones()).isZero();
        assertThat(r.minutos()).isZero();
        assertThat(r.diaPico()).isNull();
        assertThat(r.topArtistas()).isEmpty();
        assertThat(suma(r.porDia())).isZero();
    }

    @Test
    void elDetalleDeCadaTopCancionCoincideConElRanking() {
        for (TopTrack top : plays.obtenerTopCancionesGeneral(25)) {
            SongSearchResult hit = buscarExacta(top.getTrackName(), top.getArtistName());
            assertThat(hit.getReproducciones()).as(top.getTrackName()).isEqualTo(top.getReproducciones());

            SongDetail d = explore.detalle(hit.getTrackId(), "song");
            assertThat(d.reproducciones()).as(top.getTrackName()).isEqualTo(top.getReproducciones());
            assertThat(d.msTotal() / 60000.0).isCloseTo(top.getMinutos(), within(0.01));
        }
    }

    @Test
    void lasVersionesSumanLaCancionYSeConsultanPorSeparado() {
        for (TopTrack top : plays.obtenerTopCancionesGeneral(25)) {
            int id = buscarExacta(top.getTrackName(), top.getArtistName()).getTrackId();
            SongDetail cancion = explore.detalle(id, "song");
            long suma = cancion.versiones().stream().mapToLong(SongVersion::getReproducciones).sum();
            assertThat(suma).isEqualTo(cancion.reproducciones());

            for (SongVersion v : cancion.versiones()) {
                SongDetail version = explore.detalle(v.getTrackId(), "version");
                assertThat(version.reproducciones()).isEqualTo(v.getReproducciones());
                assertThat(version.spotifyUri()).isEqualTo(v.getSpotifyUri());
            }
        }
    }

    @Test
    void laLineaTemporalSumaElDetalle() {
        for (TopTrack top : plays.obtenerTopCancionesGeneral(10)) {
            int id = buscarExacta(top.getTrackName(), top.getArtistName()).getTrackId();
            long esperado = explore.detalle(id, "song").reproducciones();
            assertThat(suma(explore.linea(id, "song", "month"))).isEqualTo(esperado);
            assertThat(suma(explore.linea(id, "song", "year"))).isEqualTo(esperado);
        }
    }

    @Test
    void laBusquedaIgnoraMayusculasYAcentos() {
        List<SongSearchResult> r = explore.buscar("BEYONCE", 30);
        assertThat(r).anyMatch(x -> x.getTrackName().contains("Beyoncé") || x.getArtistName().contains("Beyoncé"));
    }

    @Test
    void laBusquedaEncuentraPorArtista() {
        ArtistRanking artista = plays.obtenerTopArtistas(1).get(0);
        assertThat(explore.buscar(SearchPattern.normalizar(artista.getArtistName()), 30))
                .isNotEmpty()
                .anyMatch(x -> x.getArtistName().equals(artista.getArtistName()));
    }

    @Test
    void losComodinesSeBuscanComoTexto() {
        assertThat(explore.buscar("%%", 30)).allMatch(x ->
                x.getTrackName().contains("%%") || x.getArtistName().contains("%%"));
    }

    @Test
    void losAlbumesDelTopGeneralSonConsistentes() {
        TopAlbum top = plays.obtenerTopAlbumesGeneral(1).get(0);
        RangeRanked primero = rango(primerDia(), ultimoDia()).topAlbumes().get(0);
        assertThat(primero.getReproducciones()).isEqualTo(top.getReproducciones());
    }

    private SongSearchResult buscarExacta(String titulo, String artista) {
        return explore.buscar(SearchPattern.normalizar(titulo), 30).stream()
                .filter(x -> x.getTrackName().equals(titulo) && x.getArtistName().equals(artista))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No aparece en la búsqueda: " + titulo + " / " + artista));
    }
}
