import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (
    admin,
    auditoria,
    auth,
    catalogos,
    documentos,
    inmobiliarias,
    motor,
    parametrizacion,
    propiedades,
    propietarios,
    proyectos,
    requisitos,
    simulador,
    solicitudes,
    validacion,
)
from app.core.config import settings

app = FastAPI(title="Plataforma Finca Raíz + Motor de Crédito", version="0.1.0")

_origins = ["http://localhost:3000"]
_extra = os.getenv("CORS_ORIGINS", "")
if _extra:
    _origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fotos de propiedades: publicas por diseño (a diferencia de los documentos de solicitud,
# que solo se sirven autenticados via app/api/documentos.py).
Path(settings.storage_public_path).mkdir(parents=True, exist_ok=True)
app.mount("/media/propiedades", StaticFiles(directory=settings.storage_public_path), name="propiedades_media")

app.include_router(auth.router)
app.include_router(propiedades.router)
app.include_router(simulador.router)
app.include_router(solicitudes.router)
app.include_router(documentos.router)
app.include_router(admin.router)
app.include_router(propietarios.router)
app.include_router(inmobiliarias.router)
app.include_router(inmobiliarias.router_publico)
app.include_router(motor.router)
app.include_router(auditoria.router)
app.include_router(proyectos.router)
app.include_router(proyectos.router_admin)
app.include_router(catalogos.router)
app.include_router(catalogos.router_admin)
app.include_router(parametrizacion.router)
app.include_router(requisitos.router)
app.include_router(validacion.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
