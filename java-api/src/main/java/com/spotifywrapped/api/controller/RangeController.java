package com.spotifywrapped.api.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.spotifywrapped.api.dto.RangeStats;
import com.spotifywrapped.api.service.RangeService;
import com.spotifywrapped.api.support.DateRange;

@RestController
@RequestMapping("/api/wrapped")
public class RangeController {

    private final RangeService rangos;

    public RangeController(RangeService rangos) {
        this.rangos = rangos;
    }

    @GetMapping("/range")
    public RangeStats estadisticas(
            @RequestParam int perfil,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") int limit) {
        return rangos.estadisticas(perfil, new DateRange(from, to), Math.clamp(limit, 1, 50));
    }
}
