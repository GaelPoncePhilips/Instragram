from sqlalchemy.orm import Session

from src.db.models.hashtag_model import Hashtag
from src.db.models.hashtag_post_model import HashtagPost
from src.db.models.post_model import Post


class PostRepository:
    def __init__(self, db: Session):
        self.db = db

    def crear_con_hashtags(self, campos: dict, hashtags: list[str]) -> Post:
        """Crea el post y sus hashtags (creando los que no existan) en una sola transacción."""
        try:
            post = Post(**campos)
            self.db.add(post)
            self.db.flush()
            for nombre in hashtags:
                hashtag = self.db.query(Hashtag).filter(Hashtag.nombre == nombre).first()
                if hashtag is None:
                    hashtag = Hashtag(nombre=nombre)
                    self.db.add(hashtag)
                    self.db.flush()
                self.db.add(HashtagPost(post_id=post.id, hashtag_id=hashtag.id))
            self.db.commit()
            self.db.refresh(post)
            return post
        except Exception:
            self.db.rollback()
            raise

    def buscar_por_id(self, post_id: int) -> Post | None:
        return self.db.get(Post, post_id)

    def listar_por_usuario(self, usuario_id: int, tipo: str | None, limit: int, offset: int) -> list[Post]:
        q = self.db.query(Post).filter(Post.usuario_id == usuario_id)
        if tipo:
            q = q.filter(Post.tipo == tipo)
        return q.order_by(Post.fecha_publicacion.desc(), Post.id.desc()).limit(limit).offset(offset).all()

    def eliminar(self, post: Post) -> None:
        self.db.delete(post)
        self.db.commit()
