-- Índices y tabla de portadas para Explorar y Mi época.
-- Los índices de plays con user_id los reemplaza 03_perfiles.sql (ejecútalo después de este).
-- Se puede ejecutar más de una vez. La API usa ddl-auto=none, así que no se aplica sola.
USE spotify_wrapped;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_plays_played_at' AND object_id = OBJECT_ID('plays'))
    CREATE INDEX IX_plays_played_at ON plays (played_at) INCLUDE (track_id, ms_played);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_plays_track_id' AND object_id = OBJECT_ID('plays'))
    CREATE INDEX IX_plays_track_id ON plays (track_id) INCLUDE (played_at, ms_played);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tracks_artist_name' AND object_id = OBJECT_ID('tracks'))
    CREATE INDEX IX_tracks_artist_name ON tracks (artist_id, track_name);
GO

-- Clave por URI para sobrevivir a una recarga del ETL, que puede cambiar los track_id.
-- image_url NULL significa "Spotify no tiene portada": evita repetir la consulta.
IF OBJECT_ID('track_art') IS NULL
    CREATE TABLE track_art (
        spotify_uri NVARCHAR(100) NOT NULL PRIMARY KEY,
        image_url   NVARCHAR(500) NULL,
        fetched_at  DATETIME2 NOT NULL
    );
GO
