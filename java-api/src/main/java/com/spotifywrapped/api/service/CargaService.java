package com.spotifywrapped.api.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.spotifywrapped.api.repository.CargaRepository;
import com.spotifywrapped.api.support.HistorialInvalidoException;
import com.spotifywrapped.api.support.HistorialParser;
import com.spotifywrapped.api.support.Reproduccion;
import com.spotifywrapped.api.support.Sesionizador;

import jakarta.annotation.PreDestroy;

/**
 * Lee y valida el .zip en la propia petición (así un archivo malo se rechaza con 400 sin tocar la base)
 * y entrega el guardado a un único hilo. El front consulta el avance en /gestion/carga.
 */
@Service
public class CargaService {

    private static final Logger log = LoggerFactory.getLogger(CargaService.class);

    private final CargaEstado estado;
    private final CargaRepository repo;
    private final PerfilService perfiles;
    private final ExecutorService hilo = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "carga-historial");
        t.setDaemon(true);
        return t;
    });

    public CargaService(CargaEstado estado, CargaRepository repo, PerfilService perfiles) {
        this.estado = estado;
        this.repo = repo;
        this.perfiles = perfiles;
    }

    public CargaEstado.Estado estado() {
        return estado.actual();
    }

    public CargaEstado.Estado iniciar(int perfil, InputStream zip) {
        perfiles.exigir(perfil);
        if (!estado.intentarIniciar(perfil)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya hay una carga en curso. Espera a que termine.");
        }

        HistorialParser.Resultado leido;
        try {
            leido = HistorialParser.leer(zip);
        } catch (HistorialInvalidoException e) {
            estado.liberar();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IOException e) {
            estado.liberar();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer el archivo subido.");
        } catch (OutOfMemoryError e) {
            estado.liberar();
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "El historial es demasiado grande para este servidor.");
        } catch (RuntimeException e) {
            estado.liberar();
            throw e;
        }

        List<Reproduccion> filas = leido.filas();
        int[] sesionPorFila = Sesionizador.asignar(filas);
        List<Sesionizador.Sesion> sesiones = Sesionizador.resumir(filas, sesionPorFila);
        estado.guardando(filas.size(), leido.archivos());
        hilo.submit(() -> guardar(perfil, filas, sesionPorFila, sesiones));
        return estado.actual();
    }

    private void guardar(int perfil, List<Reproduccion> filas, int[] sesionPorFila,
                         List<Sesionizador.Sesion> sesiones) {
        try {
            CargaRepository.Resultado r = repo.reemplazar(perfil, filas, sesionPorFila, sesiones);
            perfiles.vaciarCaches();
            estado.lista("%d reproducciones y %d sesiones (%d artistas y %d canciones nuevos en el catálogo)"
                    .formatted(r.reproducciones(), r.sesiones(), r.artistasNuevos(), r.cancionesNuevas()));
        } catch (Exception e) {
            log.error("La carga del perfil {} falló y se deshizo", perfil, e);
            estado.error("No se pudo guardar el historial. Los datos anteriores siguen intactos.");
        }
    }

    @PreDestroy
    void cerrar() {
        hilo.shutdownNow();
    }
}
