from pydantic import BaseModel, Field


class ComponentesRiesgoIn(BaseModel):
    componentes: dict[str, float] = Field(description="0-100 por componente, verificado manualmente")


class RiesgoOut(BaseModel):
    componentes_riesgo: dict | None
    score_riesgo: int | None
    nivel_riesgo: str | None
