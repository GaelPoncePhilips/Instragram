-- 001: lleva una base creada con la versión vieja de tables.sql a la actual.
-- Agrega índices, Reels (Post.tipo/url_video/duracion_seg), Usuario.reels_desactivados y DMs.
BEGIN;

ALTER TABLE Usuario ADD COLUMN reels_desactivados BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE Post
    ADD COLUMN tipo         VARCHAR(5) NOT NULL DEFAULT 'foto' CHECK (tipo IN ('foto', 'reel')),
    ADD COLUMN url_video    VARCHAR,
    ADD COLUMN duracion_seg INT CHECK (duracion_seg > 0),
    ADD CONSTRAINT post_check CHECK ((tipo = 'reel') = (url_video IS NOT NULL));
-- -- EXTRA: DMs
-- ---------------------------------------------------------------------

CREATE TABLE Conversacion (
    id             SERIAL PRIMARY KEY,
    es_grupal      BOOLEAN   NOT NULL DEFAULT FALSE,
    nombre         VARCHAR(60),                           -- solo grupales
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversacion_participante (
    conversacion_id INT NOT NULL REFERENCES Conversacion(id) ON DELETE CASCADE,
    usuario_id      INT NOT NULL REFERENCES Usuario(id)      ON DELETE CASCADE,
    estado          VARCHAR(10) NOT NULL DEFAULT 'aceptada' CHECK (estado IN ('solicitud', 'aceptada')),
    ultima_lectura  TIMESTAMP,
    fecha_ingreso   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversacion_id, usuario_id)
);

CREATE TABLE Mensaje (
    id              SERIAL PRIMARY KEY,
    conversacion_id INT NOT NULL REFERENCES Conversacion(id) ON DELETE CASCADE,
    emisor_id       INT NOT NULL REFERENCES Usuario(id)      ON DELETE CASCADE,
    texto           VARCHAR(1000),
    post_id         INT REFERENCES Post(id) ON DELETE SET NULL,   -- post compartido
    fecha           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (texto IS NOT NULL OR post_id IS NOT NULL)
);

-- Índices
CREATE INDEX idx_post_usuario_fecha ON Post (usuario_id, fecha_publicacion DESC);
CREATE INDEX idx_post_tipo_fecha ON Post (tipo, fecha_publicacion DESC);
CREATE INDEX idx_comentario_post ON Comentario (post_id, fecha);
CREATE INDEX idx_story_usuario_venc ON Story (usuario_id, fecha_vencimiento);
CREATE INDEX idx_seguidores_seguido ON seguidores (seguido_id, estado);
CREATE INDEX idx_likes_post ON likes (post_id);
CREATE INDEX idx_hashtags_post_hashtag ON hashtags_post (hashtag_id);
CREATE INDEX idx_album_miembro_usuario ON album_miembro (usuario_id, estado);
CREATE INDEX idx_album_item_album_fecha ON album_item (album_id, fecha DESC);
CREATE INDEX idx_conv_participante_usuario ON conversacion_participante (usuario_id, estado);
CREATE INDEX idx_mensaje_conv_fecha ON Mensaje (conversacion_id, id DESC);
COMMIT;
