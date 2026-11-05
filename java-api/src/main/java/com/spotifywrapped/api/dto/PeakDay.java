package com.spotifywrapped.api.dto;

import java.time.LocalDate;

public interface PeakDay {
    LocalDate getDia();
    Long getReproducciones();
    Double getMinutos();
}
