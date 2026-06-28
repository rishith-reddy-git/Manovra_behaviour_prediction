from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional

class Event(BaseModel):
    user_id: str
    event_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None

class UserContext(BaseModel):
    user_id: str
    events: list[Event]
