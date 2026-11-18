-- =====================================================================
-- Instagram — esquema de base de datos (PostgreSQL)
-- Los nombres de entidades y columnas siguen la consigna (instagram.md).
-- Lo marcado como EXTRA no está en la consigna y no contradice nada.
-- Documentación: docs/MODELO_DATOS.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENTIDADES DE LA CONSIGNA
-- ---------------------------------------------------------------------

-- HU1
CREATE TABLE Usuario (
    id             SERIAL PRIMARY KEY,
    username       VARCHAR(30)  NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._]+$'),
    email          VARCHAR(100) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,                 -- EXTRA: para login
    nombre         VARCHAR(100) NOT NULL,
    bio            VARCHAR(255),
    es_privada     BOOLEAN   NOT NULL DEFAULT FALSE,
    reels_desactivados BOOLEAN NOT NULL DEFAULT FALSE,      -- EXTRA: no ver reels
    eliminado_en   TIMESTAMP,                              -- EXTRA: borrado lógico (NULL = activa)
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HU2
CREATE TABLE Post (
    id                SERIAL PRIMARY KEY,
    usuario_id        INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    url_imagen        VARCHAR NOT NULL,                   -- en un reel es la portada
    descripcion       VARCHAR(2200),
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo              VARCHAR(5) NOT NULL DEFAULT 'foto' CHECK (tipo IN ('foto', 'reel')), -- EXTRA
    url_video         VARCHAR,                            -- EXTRA: solo reels
    duracion_seg      INT CHECK (duracion_seg > 0),       -- EXTRA: solo reels
    fecha_edicion     TIMESTAMP,                          -- EXTRA
    CHECK ((tipo = 'reel') = (url_video IS NOT NULL))
);
CREATE INDEX idx_post_usuario_fecha ON Post (usuario_id, fecha_publicacion DESC);
CREATE INDEX idx_post_tipo_fecha ON Post (tipo, fecha_publicacion DESC);

-- HU5
CREATE TABLE Comentario (
    id         SERIAL PRIMARY KEY,
    post_id    INT NOT NULL REFERENCES Post(id)    ON DELETE CASCADE,
    usuario_id INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    texto      VARCHAR(300) NOT NULL CHECK (length(trim(texto)) > 0),
    fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_edicion TIMESTAMP                                -- EXTRA
);
CREATE INDEX idx_comentario_post ON Comentario (post_id, fecha);

-- HU7
CREATE TABLE Story (
    id                  SERIAL PRIMARY KEY,
    usuario_id          INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    url_imagen          VARCHAR NOT NULL,
    solo_mejores_amigos BOOLEAN   NOT NULL DEFAULT FALSE,
    fecha_publicacion   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento   TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    CHECK (fecha_vencimiento > fecha_publicacion),
    UNIQUE (id, usuario_id)                               -- para FK compuesta de destacada_story
);
CREATE INDEX idx_story_usuario_venc ON Story (usuario_id, fecha_vencimiento);

-- HU2 / HU11
CREATE TABLE Hashtag (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE CHECK (nombre = lower(nombre))
);

-- HU10
CREATE TABLE Bloqueo (
    id            SERIAL PRIMARY KEY,
    bloqueador_id INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    bloqueado_id  INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    fecha         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bloqueador_id, bloqueado_id),
    CHECK (bloqueador_id <> bloqueado_id)
);

-- ---------------------------------------------------------------------
-- RELACIONES N A M DE LA CONSIGNA
-- ---------------------------------------------------------------------

-- HU3 / HU4
CREATE TABLE seguidores (
    seguidor_id INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    seguido_id  INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    estado      VARCHAR(10) NOT NULL CHECK (estado IN ('pendiente', 'aceptado')),
    fecha       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seguidor_id, seguido_id),
    CHECK (seguidor_id <> seguido_id)
);
CREATE INDEX idx_seguidores_seguido ON seguidores (seguido_id, estado);

-- HU5
CREATE TABLE likes (
    usuario_id INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    post_id    INT NOT NULL REFERENCES Post(id)    ON DELETE CASCADE,
    fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, post_id)
);
CREATE INDEX idx_likes_post ON likes (post_id);

-- HU2 / HU11
CREATE TABLE hashtags_post (
    post_id    INT NOT NULL REFERENCES Post(id)    ON DELETE CASCADE,
    hashtag_id INT NOT NULL REFERENCES Hashtag(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);
CREATE INDEX idx_hashtags_post_hashtag ON hashtags_post (hashtag_id);

-- HU9
CREATE TABLE vistas_story (
    usuario_id INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    story_id   INT NOT NULL REFERENCES Story(id)   ON DELETE CASCADE,
    fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, story_id)
);

-- HU8
CREATE TABLE mejores_amigos (
    usuario_id INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    amigo_id   INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, amigo_id),
    CHECK (usuario_id <> amigo_id)
);

-- ---------------------------------------------------------------------
-- EXTRA: DESTACADAS ORDENABLES
-- ---------------------------------------------------------------------

CREATE TABLE Destacada (
    id             SERIAL PRIMARY KEY,
    usuario_id     INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    titulo         VARCHAR(50) NOT NULL,
    portada_url    VARCHAR,                               -- NULL = primera story visible
    orden          INT NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id, usuario_id),
    UNIQUE (usuario_id, orden) DEFERRABLE INITIALLY DEFERRED
);

-- usuario_id repetido a propósito: las FK compuestas garantizan que la
-- destacada y la story pertenecen al mismo usuario.
CREATE TABLE destacada_story (
    destacada_id INT NOT NULL,
    story_id     INT NOT NULL,
    usuario_id   INT NOT NULL,
    orden        INT NOT NULL DEFAULT 0,
    PRIMARY KEY (destacada_id, story_id),
    FOREIGN KEY (destacada_id, usuario_id) REFERENCES Destacada(id, usuario_id) ON DELETE CASCADE,
    FOREIGN KEY (story_id, usuario_id)     REFERENCES Story(id, usuario_id)     ON DELETE CASCADE,
    UNIQUE (destacada_id, orden) DEFERRABLE INITIALLY DEFERRED
);

-- ---------------------------------------------------------------------
-- EXTRA: ÁLBUMES COMPARTIDOS
-- ---------------------------------------------------------------------

CREATE TABLE Album (
    id             SERIAL PRIMARY KEY,
    creador_id     INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    titulo         VARCHAR(60) NOT NULL,
    descripcion    VARCHAR(255),
    portada_url    VARCHAR,                               -- NULL = primer item del álbum
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE album_miembro (
    album_id   INT NOT NULL REFERENCES Album(id)   ON DELETE CASCADE,
    usuario_id INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    rol        VARCHAR(10) NOT NULL DEFAULT 'miembro'   CHECK (rol IN ('admin', 'miembro')),
    estado     VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado')),
    fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, usuario_id)
);
CREATE INDEX idx_album_miembro_usuario ON album_miembro (usuario_id, estado);

CREATE TABLE album_item (
    id          SERIAL PRIMARY KEY,
    album_id    INT NOT NULL REFERENCES Album(id)   ON DELETE CASCADE,
    usuario_id  INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    url_imagen  VARCHAR NOT NULL,
    descripcion VARCHAR(500),
    fecha       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_album_item_album_fecha ON album_item (album_id, fecha DESC);
-- ---------------------------------------------------------------------
-- EXTRA: DMs
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
CREATE INDEX idx_conv_participante_usuario ON conversacion_participante (usuario_id, estado);

CREATE TABLE Mensaje (
    id              SERIAL PRIMARY KEY,
    conversacion_id INT NOT NULL REFERENCES Conversacion(id) ON DELETE CASCADE,
    emisor_id       INT NOT NULL REFERENCES Usuario(id)      ON DELETE CASCADE,
    texto           VARCHAR(1000),
    post_id         INT REFERENCES Post(id) ON DELETE SET NULL,   -- post compartido
    fecha           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (texto IS NOT NULL OR post_id IS NOT NULL)
);
CREATE INDEX idx_mensaje_conv_fecha ON Mensaje (conversacion_id, id DESC);

-- ---------------------------------------------------------------------
-- EXTRA: búsqueda, notificaciones y refresh tokens
-- ---------------------------------------------------------------------

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

