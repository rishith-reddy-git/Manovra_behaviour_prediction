from fastapi import APIRouter
from api.store import user_histories, event_mapping
from model.train import train_model
from core.config import settings
import os
import hashlib
import time
import io
import contextlib

router = APIRouter(prefix="/admin", tags=["admin"])

# Defined mock sequences representing typical shopping behaviors
MOCK_PATTERNS = {
    "shopper_alice": ["login", "search", "view_item", "add_to_cart", "view_item", "add_to_cart", "checkout", "logout"],
    "browser_bob": ["login", "view_item", "view_item", "search", "view_item", "logout"],
    "supporter_charlie": ["login", "view_item", "contact_support", "view_item", "contact_support", "logout"],
    "shopper_david": ["login", "view_item", "add_to_cart", "checkout"],
    "browser_emily": ["login", "search", "view_item", "search", "view_item", "search", "logout"]
}

@router.post("/simulate")
def simulate_data():
    """
    Seed the application store with predefined user event patterns.
    """
    from core.database import clear_db, add_event_to_db
    try:
        clear_db()
    except Exception as e:
        print(f"Error clearing database: {e}")
        
    for user, seq in MOCK_PATTERNS.items():
        user_histories[user] = seq.copy()
        for s in seq:
            # Save simulated event to SQLite
            try:
                add_event_to_db(user, s)
            except Exception as e:
                print(f"Error writing simulated event: {e}")
                
            # Populate reverse mapping for readable predictions
            hash_val = int(hashlib.md5(s.encode()).hexdigest(), 16)
            action_id = (hash_val % (settings.NUM_EVENT_TYPES - 1)) + 1
            event_mapping[action_id] = s
            
    return {"status": "success", "message": f"Simulated histories for {len(MOCK_PATTERNS)} users."}

@router.post("/train")
def train_current_model():
    """
    Train the LSTM model on current user histories in memory.
    """
    valid_sequences = {k: v for k, v in user_histories.items() if len(v) >= 2}
    
    if not valid_sequences:
        return {
            "status": "error", 
            "message": "Insufficient data to train. Please ingest more events first (need histories with at least 2 events)."
        }
        
    f = io.StringIO()
    with contextlib.redirect_stdout(f):
        try:
            train_model(valid_sequences)
        except Exception as e:
            return {"status": "error", "message": f"Training failed: {str(e)}"}
    
    # Reload model weights in prediction route
    from api.routes.predict import reload_model
    reload_model()
    
    logs = f.getvalue()
    return {"status": "success", "message": "Model trained successfully.", "logs": logs}

@router.get("/status")
def get_status():
    """
    Get telemetry details about the model, config settings, and active store.
    """
    model_exists = os.path.exists(settings.MODEL_PATH)
    model_size_bytes = os.path.getsize(settings.MODEL_PATH) if model_exists else 0
    model_modified = time.ctime(os.path.getmtime(settings.MODEL_PATH)) if model_exists else "N/A"
    
    total_events = sum(len(h) for h in user_histories.values())
    
    return {
        "model_loaded": model_exists,
        "model_size_bytes": model_size_bytes,
        "model_last_modified": model_modified,
        "active_users": len(user_histories),
        "total_events": total_events,
        "settings": {
            "num_event_types": settings.NUM_EVENT_TYPES,
            "embedding_dim": settings.EMBEDDING_DIM,
            "hidden_dim": settings.HIDDEN_DIM,
            "num_layers": settings.NUM_LAYERS,
            "max_seq_length": settings.MAX_SEQ_LENGTH
        }
    }
