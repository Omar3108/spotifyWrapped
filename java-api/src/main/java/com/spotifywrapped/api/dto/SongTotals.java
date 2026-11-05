package com.spotifywrapped.api.dto;

import java.time.LocalDateTime;

public interface SongTotals {
    Long getReproducciones();
    Long getMsTotal();
    LocalDateTime getPrimera();
    LocalDateTime getUltima();
}
