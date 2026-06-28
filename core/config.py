from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "AI Behavior Prediction Engine"
    DEBUG: bool = True
    VERSION: str = "0.1.0"
    
    # Model configuration
    MODEL_PATH: str = "model_weights.pth"
    EMBEDDING_DIM: int = 64
    HIDDEN_DIM: int = 128
    NUM_LAYERS: int = 2
    
    # Vocabulary (to be populated or loaded dynamically in real life)
    MAX_SEQ_LENGTH: int = 20
    NUM_EVENT_TYPES: int = 100 # Adjust based on data

    # Database
    DATABASE_URL: Optional[str] = "sqlite:///./events.db"

    class Config:
        env_file = ".env"

settings = Settings()
