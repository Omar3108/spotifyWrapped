USE spotify_wrapped;
GO

CREATE TABLE artists (
    artist_id       INT IDENTITY PRIMARY KEY,
    artist_name     NVARCHAR(255) COLLATE Latin1_General_100_CS_AS_SC UNIQUE NOT NULL
);
GO

CREATE TABLE tracks (
    track_id        INT IDENTITY PRIMARY KEY,
    track_name      NVARCHAR(255) COLLATE Latin1_General_100_CS_AS_SC NOT NULL,
    album_name      NVARCHAR(255) COLLATE Latin1_General_100_CS_AS_SC,
    artist_id       INT FOREIGN KEY REFERENCES artists(artist_id),
    spotify_uri     NVARCHAR(100) UNIQUE
);
GO

CREATE TABLE users (
    user_id             INT IDENTITY PRIMARY KEY,
    nombre              NVARCHAR(60) COLLATE Latin1_General_100_CI_AI NOT NULL UNIQUE,
    creado_en           DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    datos_actualizados  DATETIME2 NULL
);
GO

CREATE TABLE sessions (
    session_id      INT IDENTITY PRIMARY KEY,
    user_id         INT NOT NULL FOREIGN KEY REFERENCES users(user_id),
    start_time      DATETIME2,
    end_time        DATETIME2,
    total_ms        INT,
    track_count     INT
);
GO

CREATE TABLE plays (
    play_id         BIGINT IDENTITY PRIMARY KEY,
    user_id         INT NOT NULL FOREIGN KEY REFERENCES users(user_id),
    track_id        INT FOREIGN KEY REFERENCES tracks(track_id),
    played_at       DATETIME2 NOT NULL,
    ms_played       INT NOT NULL,
    shuffle         BIT,
    skipped         BIT,
    reason_start    NVARCHAR(50),
    reason_end      NVARCHAR(50),
    session_id      INT NULL FOREIGN KEY REFERENCES sessions(session_id)
);
GO
-- Los índices, track_art y artist_art se crean con 02_explore_range.sql y 03_perfiles.sql.
