from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    S3_ENDPOINT: str
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET: str
    
    # VLM API Keys
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    HF_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8-sig"

# instantiate a single global settings object
settings = Settings()