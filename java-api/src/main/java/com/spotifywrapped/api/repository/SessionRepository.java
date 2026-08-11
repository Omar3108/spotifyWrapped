package com.spotifywrapped.api.repository;

import com.spotifywrapped.api.dto.LongestSession;
import com.spotifywrapped.api.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {

    @Query(value = """
        SELECT TOP (:limite)
            session_id AS sessionId,
            start_time AS startTime,
            end_time AS endTime,
            track_count AS trackCount,
            total_ms / 1000.0 / 60 AS minutosTotales
        FROM sessions
        ORDER BY total_ms DESC
        """, nativeQuery = true)
    List<LongestSession> obtenerSesionesMasLargas(@Param("limite") int limite);
}