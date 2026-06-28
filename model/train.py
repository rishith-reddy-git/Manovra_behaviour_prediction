import os
import sys

# Add project root to sys.path to allow direct execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from data.dataset import BehaviorDataset
from data.preprocessing import EventPreprocessor
from model.architecture import BehaviorRNNBase
from core.config import settings

def train_model(user_sequences: dict):
    # Initialize Preprocessor and Dataset
    preprocessor = EventPreprocessor(num_event_types=settings.NUM_EVENT_TYPES, max_seq_length=settings.MAX_SEQ_LENGTH)
    dataset = BehaviorDataset(user_sequences, preprocessor)
    
    if len(dataset) == 0:
        print("No training data generated. Need longer sequences.")
        return
        
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

    # Initialize Model
    model = BehaviorRNNBase(
        vocab_size=settings.NUM_EVENT_TYPES,
        embedding_dim=settings.EMBEDDING_DIM,
        hidden_dim=settings.HIDDEN_DIM,
        num_layers=settings.NUM_LAYERS
    )
    
    criterion = nn.CrossEntropyLoss(ignore_index=0) # Ignore computing loss for padding predictions
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    epochs = 5
    model.train()
    
    for epoch in range(epochs):
        total_loss = 0
        for batch_idx, (X, y) in enumerate(dataloader):
            optimizer.zero_grad()
            logits = model(X)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(dataloader):.4f}")

    # Save model
    os.makedirs(os.path.dirname(settings.MODEL_PATH), exist_ok=True) if os.path.dirname(settings.MODEL_PATH) else None
    torch.save(model.state_dict(), settings.MODEL_PATH)
    print(f"Model saved to {settings.MODEL_PATH}")

if __name__ == "__main__":
    # Mock data for testing the script standalone
    mock_sequences = {
        "user_1": ["login", "view_item", "add_to_cart", "checkout"],
        "user_2": ["login", "view_item", "view_item", "logout"],
        "user_3": ["view_item", "logout"],
    }
    train_model(mock_sequences)
