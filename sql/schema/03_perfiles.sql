-- Perfiles: users, user_id en plays/sessions, índices por perfil y fotos de artista.
-- Se puede ejecutar más de una vez. La API usa ddl-auto=none, así que no se aplica sola.
-- Haz antes un BACKUP DATABASE spotify_wrapped ... WITH COPY_ONLY.
-- artists, tracks y track_art siguen compartidas entre perfiles.
USE spotify_wrapped;
GO

IF OBJECT_ID('users') IS NULL
    CREATE TABLE users (
        user_id             INT IDENTITY PRIMARY KEY,
        nombre              NVARCHAR(60) COLLATE Latin1_General_100_CI_AI NOT NULL UNIQUE,
        creado_en           DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        datos_actualizados  DATETIME2 NULL
    );
GO

-- El historial que ya existe pertenece al primer perfil.
IF NOT EXISTS (SELECT 1 FROM users)
    INSERT INTO users (nombre, datos_actualizados) VALUES (N'Omar', SYSDATETIME());
GO

IF COL_LENGTH('plays', 'user_id') IS NULL ALTER TABLE plays ADD user_id INT NULL;
IF COL_LENGTH('sessions', 'user_id') IS NULL ALTER TABLE sessions ADD user_id INT NULL;
GO

UPDATE plays SET user_id = (SELECT MIN(user_id) FROM users) WHERE user_id IS NULL;
UPDATE sessions SET user_id = (SELECT MIN(user_id) FROM users) WHERE user_id IS NULL;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('plays') AND name = 'user_id' AND is_nullable = 1)
    ALTER TABLE plays ALTER COLUMN user_id INT NOT NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('sessions') AND name = 'user_id' AND is_nullable = 1)
    ALTER TABLE sessions ALTER COLUMN user_id INT NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_plays_users')
    ALTER TABLE plays ADD CONSTRAINT FK_plays_users FOREIGN KEY (user_id) REFERENCES users(user_id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_sessions_users')
    ALTER TABLE sessions ADD CONSTRAINT FK_sessions_users FOREIGN KEY (user_id) REFERENCES users(user_id);
GO

-- Índices con el perfil delante: toda consulta filtra por user_id.
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_plays_played_at' AND object_id = OBJECT_ID('plays'))
    DROP INDEX IX_plays_played_at ON plays;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_plays_track_id' AND object_id = OBJECT_ID('plays'))
    DROP INDEX IX_plays_track_id ON plays;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_plays_user_played_at' AND object_id = OBJECT_ID('plays'))
    CREATE INDEX IX_plays_user_played_at ON plays (user_id, played_at) INCLUDE (track_id, ms_played);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_plays_user_track_id' AND object_id = OBJECT_ID('plays'))
    CREATE INDEX IX_plays_user_track_id ON plays (user_id, track_id) INCLUDE (played_at, ms_played);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sessions_user_total_ms' AND object_id = OBJECT_ID('sessions'))
    CREATE INDEX IX_sessions_user_total_ms ON sessions (user_id, total_ms DESC);
GO

-- Foto del artista. image_url NULL = no se encontró; se reintenta pasados unos días.
IF OBJECT_ID('artist_art') IS NULL
    CREATE TABLE artist_art (
        artist_id          INT NOT NULL PRIMARY KEY REFERENCES artists(artist_id),
        spotify_artist_id  NVARCHAR(40) NULL,
        image_url          NVARCHAR(500) NULL,
        fetched_at         DATETIME2 NOT NULL
    );
GO

-- Que una carga larga no bloquee las lecturas de los demás perfiles.
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'spotify_wrapped' AND is_read_committed_snapshot_on = 0)
    ALTER DATABASE spotify_wrapped SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO
