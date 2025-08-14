from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:////data/app.db"
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    HF_API_KEY: str = ""
    SPACE_ID: str = ""
    ENVIRONMENT: str = "production"
    STORAGE_PROVIDER: str = "local"
    STORAGE_DIR: str = "/data/uploads"
    HF_HOME: str = "/data/.cache/huggingface"
    BASE_URL: str = "http://localhost:8080"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8-sig"
        extra = "ignore"
        case_sensitive = False

settings = Settings()