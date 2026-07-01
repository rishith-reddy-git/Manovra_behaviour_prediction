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

# Defined mock sequences representing different application domains
DOMAIN_PRESETS = {
    "saas": {
        "dev_alice": ["login", "view_dashboard", "create_project", "configure_api", "deploy_service", "view_logs", "logout"],
        "admin_bob": ["login", "view_dashboard", "invite_member", "view_dashboard", "upgrade_billing", "logout"],
        "guest_charlie": ["login", "view_dashboard", "view_logs", "logout"],
        "billing_david": ["login", "view_dashboard", "upgrade_billing", "contact_support", "logout"],
        "dev_emily": ["login", "view_dashboard", "create_project", "deploy_service", "view_logs", "deploy_service"]
    },
    "gaming": {
        "gamer_greg": ["login", "open_lobby", "join_matchmaker", "start_match", "complete_quest", "complete_quest"],
        "casual_sam": ["login", "open_settings", "open_lobby", "join_matchmaker", "start_match", "logout"],
        "social_zoe": ["login", "send_friend_request", "send_friend_request", "open_lobby", "logout"],
        "whale_will": ["login", "purchase_item", "purchase_item", "open_lobby", "start_match"],
        "speedrunner_sara": ["login", "open_lobby", "start_match", "complete_quest", "start_match", "complete_quest"]
    },
    "media": {
        "binge_watcher": ["login", "search_content", "play_media", "pause_media", "play_media", "add_to_favorites"],
        "casual_viewer": ["login", "play_media", "rate_content", "logout"],
        "curator_dan": ["login", "search_content", "add_to_favorites", "search_content", "add_to_favorites", "share_media"],
        "subscriber_sue": ["login", "subscribe_channel", "play_media", "share_media", "logout"],
        "listener_leo": ["login", "search_content", "play_media", "pause_media", "logout"]
    },
    "ecommerce": {
        "shopper_emma": ["login", "search_product", "view_item", "add_to_cart", "checkout_start", "purchase_complete", "logout"],
        "browser_jack": ["login", "view_item", "view_item", "search_product", "view_item", "logout"],
        "support_chloe": ["login", "view_item", "contact_support", "view_item", "contact_support", "logout"],
        "buyer_ben": ["login", "view_item", "add_to_cart", "checkout_start", "purchase_complete"],
        "reviewer_rose": ["login", "view_item", "view_reviews", "write_review", "logout"]
    }
}

@router.post("/simulate")
def simulate_data(domain: str = "saas"):
    """
    Seed the application store with predefined user event patterns for a given domain.
    """
    domain = domain.lower()
    if domain not in DOMAIN_PRESETS:
        domain = "saas"
        
    mock_patterns = DOMAIN_PRESETS[domain]
    
    from core.database import clear_db, add_event_to_db
    try:
        clear_db()
    except Exception as e:
        print(f"Error clearing database: {e}")
        
    # Clear active histories in memory before seeding new ones
    user_histories.clear()
        
    for user, seq in mock_patterns.items():
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
            
    return {"status": "success", "message": f"Simulated histories for {len(mock_patterns)} users in domain '{domain}'."}

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
