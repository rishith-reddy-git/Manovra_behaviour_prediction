from fastapi import APIRouter
from schemas.event import Event
from api.store import user_histories, event_mapping
from data.preprocessing import EventPreprocessor
from core.config import settings

router = APIRouter()
preprocessor = EventPreprocessor(num_event_types=settings.NUM_EVENT_TYPES, max_seq_length=settings.MAX_SEQ_LENGTH)

@router.post("/ingest")
def ingest_event(event: Event):
    if event.user_id not in user_histories:
        user_histories[event.user_id] = []
    
    user_histories[event.user_id].append(event.event_type)
    
    # Save to SQLite Database
    from core.database import add_event_to_db
    add_event_to_db(event.user_id, event.event_type)
    
    # Store the reverse mapping for human-readable predictions
    action_id = preprocessor.encode_event_type(event.event_type)
    event_mapping[action_id] = event.event_type
    
    # Keep only the latest events to avoid memory bloat
    if len(user_histories[event.user_id]) > 50:
        user_histories[event.user_id] = user_histories[event.user_id][-50:]
        
    return {"status": "success", "message": f"Event ingested for user {event.user_id}"}
