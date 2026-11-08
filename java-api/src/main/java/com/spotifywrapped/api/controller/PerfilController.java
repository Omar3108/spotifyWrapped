package com.spotifywrapped.api.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spotifywrapped.api.dto.PerfilResumen;
import com.spotifywrapped.api.service.PerfilService;

@RestController
@RequestMapping("/api/wrapped")
public class PerfilController {

    private final PerfilService perfiles;

    public PerfilController(PerfilService perfiles) {
        this.perfiles = perfiles;
    }

    @GetMapping("/perfiles")
    public List<PerfilResumen> listar() {
        return perfiles.listar();
    }
}
