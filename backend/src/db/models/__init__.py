# Importa todos los modelos para que SQLAlchemy resuelva las ForeignKey por nombre de tabla.
# El esquema real lo define db/tables.sql (no se usa Base.metadata.create_all).
from src.db.models.usuario_model import Usuario
from src.db.models.post_model import Post
from src.db.models.comentario_model import Comentario
from src.db.models.like_model import Like
from src.db.models.hashtag_model import Hashtag
from src.db.models.hashtag_post_model import HashtagPost
from src.db.models.seguidor_model import Seguidor
from src.db.models.story_model import Story, VistaStory
from src.db.models.bloqueo_model import Bloqueo, MejorAmigo
from src.db.models.destacada_model import Destacada, DestacadaStory
from src.db.models.album_model import Album, AlbumMiembro, AlbumItem
from src.db.models.conversacion_model import Conversacion, ConversacionParticipante, Mensaje
