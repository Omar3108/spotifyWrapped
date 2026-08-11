package com.spotifywrapped.api.dto;

import java.time.LocalDateTime;

public interface LongestSession {
    Integer getSessionId();
    LocalDateTime getStartTime();
    LocalDateTime getEndTime();
    Integer getTrackCount();
    Double getMinutosTotales();
}