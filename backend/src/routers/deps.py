from fastapi import Query


class Pagina:
    """Paginación estándar: ?limit=20&offset=0 (limit máx. 50)."""

    def __init__(self, limit: int = Query(20, ge=1, le=50), offset: int = Query(0, ge=0)):
        self.limit = limit
        self.offset = offset
