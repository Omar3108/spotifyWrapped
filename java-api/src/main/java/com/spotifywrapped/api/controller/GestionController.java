package com.spotifywrapped.api.controller;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.spotifywrapped.api.dto.PerfilResumen;
import com.spotifywrapped.api.service.CargaEstado;
import com.spotifywrapped.api.service.CargaService;
import com.spotifywrapped.api.service.PerfilService;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Escrituras: crear, renombrar y borrar perfiles, y cargar o limpiar su historial.
 * nginx solo las deja pasar desde el propio equipo, y GestionConfig exige una cabecera propia (anti-CSRF).
 */
@RestController
@RequestMapping("/api/wrapped/gestion")
public class GestionController {

    public record NombrePerfil(String nombre) {
    }

    private final PerfilService perfiles;
    private final CargaService carga;

    public GestionController(PerfilService perfiles, CargaService carga) {
        this.perfiles = perfiles;
        this.carga = carga;
    }

    @PostMapping("/perfiles")
    @ResponseStatus(HttpStatus.CREATED)
    public PerfilResumen crear(@RequestBody NombrePerfil cuerpo) {
        return perfiles.crear(cuerpo.nombre());
    }

    @PatchMapping("/perfiles/{id}")
    public PerfilResumen renombrar(@PathVariable int id, @RequestBody NombrePerfil cuerpo) {
        return perfiles.renombrar(id, cuerpo.nombre());
    }

    @DeleteMapping("/perfiles/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrar(@PathVariable int id) {
        perfiles.borrar(id);
    }

    @DeleteMapping("/perfiles/{id}/datos")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void limpiar(@PathVariable int id) {
        perfiles.limpiarDatos(id);
    }

    /** El cuerpo es el .zip tal cual. Responde 202 cuando ya está leído y validado; el guardado sigue en segundo plano. */
    @PostMapping("/perfiles/{id}/carga")
    public ResponseEntity<CargaEstado.Estado> cargar(@PathVariable int id, HttpServletRequest peticion)
            throws IOException {
        return ResponseEntity.accepted().body(carga.iniciar(id, peticion.getInputStream()));
    }

    @GetMapping("/carga")
    public CargaEstado.Estado estado() {
        return carga.estado();
    }
}
