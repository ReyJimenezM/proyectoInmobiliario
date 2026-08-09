from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://fincaraiz:fincaraiz@db:5432/fincaraiz"
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    storage_backend: str = "local"  # local | s3
    storage_local_path: str = "/app/storage/documentos"
    # Fotos de propiedades: a diferencia de los documentos de solicitud (privados), estas
    # se sirven publicamente via StaticFiles en /media/propiedades (ver main.py).
    storage_public_path: str = "/app/storage/propiedades"
    public_base_url: str = "http://localhost:8000"
    tasa_referencial_ea_default: float = 0.12

    class Config:
        env_file = ".env"


settings = Settings()
