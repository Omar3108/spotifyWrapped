package com.spotifywrapped.api.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;
import java.util.function.ToLongFunction;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.spotifywrapped.api.dto.Comparacion;
import com.spotifywrapped.api.dto.Comparacion.Compartido;
import com.spotifywrapped.api.dto.Comparacion.Descubierto;
import com.spotifywrapped.api.dto.Comparacion.Descubrimientos;
import com.spotifywrapped.api.dto.Comparacion.PerfilComparado;
import com.spotifywrapped.api.repository.CompareRepository;
import com.spotifywrapped.api.repository.CompareRepository.FilaArtista;
import com.spotifywrapped.api.repository.CompareRepository.FilaCancion;
import com.spotifywrapped.api.repository.CompareRepository.Perfil;
import com.spotifywrapped.api.repository.CompareRepository.Totales;

@Service
public class CompareService {

    public static final int LIMITE_LISTAS = 10;
    public static final int LIMITE_DESCUBIERTOS = 6;

    private final CompareRepository repo;

    public CompareService(CompareRepository repo) {
        this.repo = repo;
    }

    @Cacheable(cacheNames = "comparaciones", key = "#a + '|' + #b")
    public Comparacion comparar(int a, int b) {
        if (a == b) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Elige dos perfiles distintos");
        }
        Perfil pa = repo.perfil(a).orElseThrow(CompareService::noExiste);
        Perfil pb = repo.perfil(b).orElseThrow(CompareService::noExiste);

        if (pa.primera() == null || pb.primera() == null) {
            Totales cero = new Totales(0, 0, 0);
            return componer(pa, pb, null, cero, cero, List.of(), List.of());
        }

        LocalDateTime desde = pa.primera().isAfter(pb.primera()) ? pa.primera() : pb.primera();
        return componer(pa, pb, desde,
                repo.totales(a, desde), repo.totales(b, desde),
                repo.artistas(a, b, desde), repo.canciones(a, b, desde));
    }

    /** Todo el cálculo, sin base de datos. {@code desde} null significa que alguno no tiene historial. */
    static Comparacion componer(Perfil pa, Perfil pb, LocalDateTime desde, Totales ta, Totales tb,
            List<FilaArtista> artistas, List<FilaCancion> canciones) {

        // En común = los dos lo escucharon dentro del período común.
        List<FilaArtista> artistasComunes = artistas.stream().filter(f -> f.nA() > 0 && f.nB() > 0).toList();
        List<FilaCancion> cancionesComunes = canciones.stream().filter(f -> f.nA() > 0 && f.nB() > 0).toList();

        double coberturaA = proporcion(artistasComunes.stream().mapToLong(FilaArtista::nA).sum(), ta.reproducciones());
        double coberturaB = proporcion(artistasComunes.stream().mapToLong(FilaArtista::nB).sum(), tb.reproducciones());

        List<Compartido> topArtistas = artistasComunes.stream()
                .sorted(porCuotaMinima(FilaArtista::nA, FilaArtista::nB, ta, tb, FilaArtista::nombre))
                .limit(LIMITE_LISTAS)
                .map(f -> new Compartido(null, f.artistId(), f.nombre(), f.nombre(), f.coverUri(), f.nA(), f.nB()))
                .toList();

        List<Compartido> topCanciones = cancionesComunes.stream()
                .sorted(porCuotaMinima(FilaCancion::nA, FilaCancion::nB, ta, tb, FilaCancion::nombre))
                .limit(LIMITE_LISTAS)
                .map(f -> new Compartido(f.trackId(), null, f.nombre(), f.artistName(), f.coverUri(), f.nA(), f.nB()))
                .toList();

        LocalDate inicio = desde == null ? null : desde.toLocalDate();
        int primeroA = 0;
        int primeroB = 0;
        int mismoDia = 0;
        int sinComparar = 0;
        for (FilaArtista f : artistas) {
            if (!comparable(f, inicio)) {
                sinComparar++;
            } else if (f.primeraA().isBefore(f.primeraB())) {
                primeroA++;
            } else if (f.primeraB().isBefore(f.primeraA())) {
                primeroB++;
            } else {
                mismoDia++;
            }
        }

        List<Descubierto> porA = artistas.stream()
                .filter(f -> comparable(f, inicio) && f.primeraA().isBefore(f.primeraB()))
                .sorted(Comparator.comparingLong(FilaArtista::nB).reversed().thenComparing(FilaArtista::nombre))
                .limit(LIMITE_DESCUBIERTOS)
                .map(f -> new Descubierto(f.artistId(), f.nombre(), f.coverUri(), f.primeraA(), f.primeraB(), f.nB()))
                .toList();
        List<Descubierto> porB = artistas.stream()
                .filter(f -> comparable(f, inicio) && f.primeraB().isBefore(f.primeraA()))
                .sorted(Comparator.comparingLong(FilaArtista::nA).reversed().thenComparing(FilaArtista::nombre))
                .limit(LIMITE_DESCUBIERTOS)
                .map(f -> new Descubierto(f.artistId(), f.nombre(), f.coverUri(), f.primeraA(), f.primeraB(), f.nA()))
                .toList();

        return new Comparacion(
                new PerfilComparado(pa.id(), pa.nombre(), dia(pa), ta.reproducciones(), ta.artistas(), ta.canciones()),
                new PerfilComparado(pb.id(), pb.nombre(), dia(pb), tb.reproducciones(), tb.artistas(), tb.canciones()),
                inicio, coberturaA, coberturaB,
                artistasComunes.size(), cancionesComunes.size(),
                new Descubrimientos(primeroA, primeroB, mismoDia, sinComparar),
                topArtistas, topCanciones, porA, porB);
    }

    /**
     * Solo se puede decir quién llegó antes si las dos primeras escuchas caen cuando ya existían ambos historiales.
     * Si no, quien empezó a registrar más tarde quizá ya lo conocía.
     */
    static boolean comparable(FilaArtista f, LocalDate inicio) {
        return inicio != null && f.primeraA() != null && f.primeraB() != null
                && !f.primeraA().isBefore(inicio) && !f.primeraB().isBefore(inicio);
    }

    /**
     * Primero lo que pesa para los dos: la menor de sus dos cuotas. Así un artista que uno escucha a diario y el
     * otro una vez no aparece arriba. Empates: más reproducciones juntas, luego por nombre.
     */
    private static <T> Comparator<T> porCuotaMinima(ToLongFunction<T> nA, ToLongFunction<T> nB, Totales ta, Totales tb,
            Function<T, String> nombre) {
        Comparator<T> cuota = Comparator.comparingDouble(
                f -> Math.min(proporcion(nA.applyAsLong(f), ta.reproducciones()), proporcion(nB.applyAsLong(f), tb.reproducciones())));
        Comparator<T> juntas = Comparator.comparingLong(f -> nA.applyAsLong(f) + nB.applyAsLong(f));
        return cuota.reversed().thenComparing(juntas.reversed()).thenComparing(nombre);
    }

    private static LocalDate dia(Perfil p) {
        return p.primera() == null ? null : p.primera().toLocalDate();
    }

    private static double proporcion(long parte, long total) {
        return total == 0 ? 0 : (double) parte / total;
    }

    private static ResponseStatusException noExiste() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "El perfil no existe");
    }
}
