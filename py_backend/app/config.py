from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:pass@host:5432/dbname"
    S3_ENDPOINT: str = "https://your-s3-endpoint.com"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    HF_API_KEY: str = ""
    SPACE_ID: str = ""
    ENVIRONMENT: str = "development"
    BASE_URL: str = "http://localhost:8080"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8-sig"
        extra = "ignore"
        case_sensitive = False

settings = Settings()