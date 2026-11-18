
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.db.models.usuario import Usuario
from src.db.models.post import Post
from src.db.models.seguidor import Seguidor


class UsuarioRepository:

    def __init__(self, db: Session):
        self.db = db

    def crear(self, usuario: Usuario):
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def buscar_por_id(self, usuario_id: int):
        return self.db.query(Usuario).filter(
            Usuario.id == usuario_id
        ).first()

    def buscar_por_username(self, username: str):
        return self.db.query(Usuario).filter(
            Usuario.username == username
        ).first()

    def buscar_por_email(self, email: str):
        return self.db.query(Usuario).filter(
            Usuario.email == email
        ).first()

    def actualizar_privacidad(self, usuario: Usuario, es_privada: bool):

        usuario.es_privada = es_privada

        # Si la cuenta pasa a ser pública,
        # aceptar todas las solicitudes pendientes
        if not es_privada:
            self.db.query(Seguidor).filter(
                Seguidor.seguido_id == usuario.id,
                Seguidor.estado == "pendiente"
            ).update(
                {"estado": "aceptado"},
                synchronize_session=False
            )

        self.db.commit()
        self.db.refresh(usuario)

        return usuario

    def obtener_estadisticas(self, usuario_id: int):

        cantidad_posts = self.db.query(func.count(Post.id)).filter(
            Post.usuario_id == usuario_id
        ).scalar()

        cantidad_seguidores = self.db.query(func.count(Seguidor.seguidor_id)).filter(
            Seguidor.seguido_id == usuario_id,
            Seguidor.estado == "aceptado"
        ).scalar()

        cantidad_seguidos = self.db.query(func.count(Seguidor.seguido_id)).filter(
            Seguidor.seguidor_id == usuario_id,
            Seguidor.estado == "aceptado"
        ).scalar()

        return {
            "cantidad_posts": cantidad_posts,
            "cantidad_seguidores": cantidad_seguidores,
            "cantidad_seguidos": cantidad_seguidos
        }
