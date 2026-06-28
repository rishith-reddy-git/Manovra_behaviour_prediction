from fastapi import APIRouter, HTTPException
import torch
from api.store import user_histories
from model.architecture import BehaviorRNNBase
from data.preprocessing import EventPreprocessor
from core.config import settings
import os

router = APIRouter()

# Initialize Preprocessor
preprocessor = EventPreprocessor(num_event_types=settings.NUM_EVENT_TYPES, max_seq_length=settings.MAX_SEQ_LENGTH)

# Load model (lazily to avoid startup failures if weights don't exist yet)
model = None

def get_model():
    global model
    if model is None:
        model = BehaviorRNNBase(
            vocab_size=settings.NUM_EVENT_TYPES,
            embedding_dim=settings.EMBEDDING_DIM,
            hidden_dim=settings.HIDDEN_DIM,
            num_layers=settings.NUM_LAYERS
        )
        if os.path.exists(settings.MODEL_PATH):
            model.load_state_dict(torch.load(settings.MODEL_PATH))
            model.eval()
        else:
            print("Warning: Model weights not found, using randomly initialized weights.")
            model.eval()
    return model

def reload_model():
    global model
    model = None


@router.get("/predict/{user_id}")
def predict_next_action(user_id: str, top_k: int = 3):
    history = user_histories.get(user_id, [])
    
    if len(history) == 0:
        raise HTTPException(status_code=404, detail="No history found for user")
        
    current_model = get_model()
    
    # Process sequence
    # preprocessor.process_sequence expects a list of objects with 'event_type'
    input_tensor = preprocessor.process_sequence([{'event_type': e} for e in history])
    
    # Add batch dimension
    input_batch = input_tensor.unsqueeze(0)
    
    with torch.no_grad():
        logits = current_model(input_batch)
    
    # Get probabilities
    probs = torch.nn.functional.softmax(logits[0], dim=0)
    
    # Get top K indices
    top_probs, top_indices = torch.topk(probs, k=min(top_k, settings.NUM_EVENT_TYPES - 1))
    
    # Note: in a real application, you would map these indices back to the original event type strings
    # using a reverse dictionary. Here we just return the encoded IDs map them based on our event_mapping dict.
    from api.store import event_mapping
    
    predictions = [
        {
            "action_id": idx.item(), 
            "predicted_action": event_mapping.get(idx.item(), f"unknown_action_{idx.item()}"),
            "probability": float(prob.item())
        }
        for prob, idx in zip(top_probs, top_indices)
        if idx.item() != 0 # ignore padding token prediction
    ]
    
    return {
        "user_id": user_id,
        "history_length": len(history),
        "predictions": predictions
    }

@router.get("/history/{user_id}")
def get_user_history(user_id: str):
    from api.store import user_histories
    history = user_histories.get(user_id, [])
    return {
        "user_id": user_id,
        "history": history
    }

