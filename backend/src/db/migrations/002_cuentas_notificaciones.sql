-- 002: borrado lógico de cuentas, edición de posts/comentarios, búsqueda, notificaciones y refresh tokens.
BEGIN;

ALTER TABLE Usuario    ADD COLUMN eliminado_en  TIMESTAMP;   -- NULL = activa (borrado lógico)
ALTER TABLE Post       ADD COLUMN fecha_edicion TIMESTAMP;
ALTER TABLE Comentario ADD COLUMN fecha_edicion TIMESTAMP;

-- Búsqueda por prefijo de username / nombre
CREATE INDEX idx_usuario_username_prefijo ON Usuario (username text_pattern_ops);
CREATE INDEX idx_usuario_nombre_prefijo   ON Usuario (lower(nombre) text_pattern_ops);

CREATE TABLE Notificacion (
    id            SERIAL PRIMARY KEY,
    usuario_id    INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,   -- destinatario
    actor_id      INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,   -- quién la generó
    tipo          VARCHAR(20) NOT NULL CHECK (tipo IN (
                      'seguidor_nuevo', 'solicitud', 'solicitud_aceptada',
                      'like', 'comentario', 'invitacion_album')),
    post_id       INT REFERENCES Post(id)       ON DELETE CASCADE,
    comentario_id INT REFERENCES Comentario(id) ON DELETE CASCADE,
    album_id      INT REFERENCES Album(id)      ON DELETE CASCADE,
    leida         BOOLEAN   NOT NULL DEFAULT FALSE,
    fecha         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (usuario_id <> actor_id)
);
CREATE INDEX idx_notificacion_usuario ON Notificacion (usuario_id, leida, fecha DESC);

CREATE TABLE refresh_token (
    id          SERIAL PRIMARY KEY,
    usuario_id  INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    token_hash  CHAR(64)  NOT NULL UNIQUE,                 -- sha256 del token, nunca el token
    familia     UUID      NOT NULL,                        -- cadena de rotación (detecta reuso)
    expira_en   TIMESTAMP NOT NULL,
    revocado_en TIMESTAMP,
    creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_token_usuario ON refresh_token (usuario_id);

COMMIT;
