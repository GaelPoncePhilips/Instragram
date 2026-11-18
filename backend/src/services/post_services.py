import re

from src.repositories.post_repository import PostRepository
from src.mappers.post_mapper import PostMapper
from src.dtos.post_dto import PostDTO


class PostService:

    def __init__(self, repository: PostRepository):
        self.repository = repository

    def publicar_post(self, dto: PostDTO):

        # Comprobar que exista el usuario
        usuario = self.repository.buscar_usuario(dto.usuario_id)

        if not usuario:
            raise ValueError("Usuario no encontrado")

        # Convertir el DTO en Model
        post = PostMapper.to_model(dto)

        # Detectar hashtags en la descripción
        hashtags = re.findall(
            r"(?<![a-zA-Z0-9_])#([a-zA-Z0-9_]+)",
            dto.descripcion or ""
        )

        # Evitar hashtags repetidos en el mismo post
        hashtags = list(dict.fromkeys(
            hashtag.lower() for hashtag in hashtags
        ))

        # Guardar el post y asociar los hashtags
        post_creado = self.repository.crear_con_hashtags(
            post,
            hashtags
        )

        return PostMapper.to_dto(post_creado)

    # Listar posts respetando la privacidad
    def listar_posts_usuario(
        self,
        visitante_id: int,
        propietario_id: int
    ):

        # Comprobar que exista el dueño de los posts
        propietario = self.repository.buscar_usuario(propietario_id)

        if not propietario:
            raise ValueError("Usuario no encontrado")

        # Comprobar si el visitante tiene permiso
        puede_ver = self.repository.puede_ver_posts(
            visitante_id,
            propietario_id
        )

        if not puede_ver:
            raise PermissionError(
                "No tenes permiso para ver los posts de esta cuenta"
            )

        # Obtener los posts
        posts = self.repository.listar_por_usuario(propietario_id)

        return [
            PostMapper.to_dto(post)
            for post in posts
        ]

