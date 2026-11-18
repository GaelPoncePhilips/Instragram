from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from src.db.models.bloqueo_model import Bloqueo
from src.db.models.post_model import Post
from src.db.models.seguidor_model import Seguidor
from src.db.models.usuario_model import Usuario


class UsuarioRepository:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, **campos) -> Usuario:
        usuario = Usuario(**campos)
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def buscar_por_id(self, usuario_id: int) -> Usuario | None:
        return self.db.get(Usuario, usuario_id)

    def buscar_por_username(self, username: str) -> Usuario | None:
        return self.db.query(Usuario).filter(Usuario.username == username).first()

    def buscar_por_email(self, email: str) -> Usuario | None:
        return self.db.query(Usuario).filter(func.lower(Usuario.email) == email.lower()).first()

    def actualizar(self, usuario: Usuario, campos: dict) -> Usuario:
        """Si la cuenta pasa a pública, acepta las solicitudes pendientes en la misma transacción (HU4)."""
        pasa_a_publica = usuario.es_privada and campos.get("es_privada") is False
        for campo, valor in campos.items():
            setattr(usuario, campo, valor)
        if pasa_a_publica:
            self.db.query(Seguidor).filter(
                Seguidor.seguido_id == usuario.id, Seguidor.estado == "pendiente"
            ).update({"estado": "aceptado"}, synchronize_session=False)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def contadores(self, usuario_id: int) -> dict:
        posts = self.db.query(func.count(Post.id)).filter(Post.usuario_id == usuario_id).scalar()
        seguidores = self.db.query(func.count()).select_from(Seguidor).filter(
            Seguidor.seguido_id == usuario_id, Seguidor.estado == "aceptado"
        ).scalar()
        seguidos = self.db.query(func.count()).select_from(Seguidor).filter(
            Seguidor.seguidor_id == usuario_id, Seguidor.estado == "aceptado"
        ).scalar()
        return {"cantidad_posts": posts, "cantidad_seguidores": seguidores, "cantidad_seguidos": seguidos}

    def hay_bloqueo(self, a_id: int, b_id: int) -> bool:
        """True si alguno de los dos bloqueó al otro (HU10)."""
        return self.db.query(Bloqueo.id).filter(or_(
            (Bloqueo.bloqueador_id == a_id) & (Bloqueo.bloqueado_id == b_id),
            (Bloqueo.bloqueador_id == b_id) & (Bloqueo.bloqueado_id == a_id),
        )).first() is not None
