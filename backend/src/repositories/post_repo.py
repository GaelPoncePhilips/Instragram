from sqlalchemy.orm import Session

from src.db.models.post import Post
from src.db.models.usuario import Usuario
from src.db.models.hashtag import Hashtag
from src.db.models.hashtag_post import HashtagPost
from src.db.models.seguidor import Seguidor


class PostRepository:

    def __init__(self, db: Session):
        self.db = db

    def buscar_usuario(self, usuario_id: int):
        return self.db.query(Usuario).filter(
            Usuario.id == usuario_id
        ).first()

    def crear_con_hashtags(self, post: Post, nombres: list[str]):

        try:
            self.db.add(post)
            self.db.flush()

            for nombre in nombres:

                hashtag = self.db.query(Hashtag).filter(
                    Hashtag.nombre == nombre
                ).first()

                if not hashtag:
                    hashtag = Hashtag(nombre=nombre)
                    self.db.add(hashtag)
                    self.db.flush()

                relacion = HashtagPost(
                    post_id=post.id,
                    hashtag_id=hashtag.id
                )

                self.db.add(relacion)

            self.db.commit()
            self.db.refresh(post)

            return post

        except Exception:
            self.db.rollback()
            raise

    def buscar_por_id(self, post_id: int):
        return self.db.query(Post).filter(
            Post.id == post_id
        ).first()

    def listar_por_usuario(self, usuario_id: int):
        return self.db.query(Post).filter(
            Post.usuario_id == usuario_id
        ).order_by(Post.fecha_publicacion.desc()).all()

    # Comprobar si un usuario puede ver los posts de otro
    def puede_ver_posts(self, visitante_id: int, propietario_id: int):

        propietario = self.buscar_usuario(propietario_id)

        if not propietario:
            return False

        # El dueño siempre puede ver sus propios posts
        if visitante_id == propietario_id:
            return True

        # Si la cuenta es pública, cualquiera puede verla
        if not propietario.es_privada:
            return True

        # Si es privada, comprobar que el visitante
        # sea un seguidor aceptado
        seguimiento = self.db.query(Seguidor).filter(
            Seguidor.seguidor_id == visitante_id,
            Seguidor.seguido_id == propietario_id,
            Seguidor.estado == "aceptado"
        ).first()

        return seguimiento is not None
