import torch
from torch.utils.data import Dataset
from data.preprocessing import EventPreprocessor

class BehaviorDataset(Dataset):
    def __init__(self, user_sequences: dict, preprocessor: EventPreprocessor):
        """
        user_sequences: dict of form {user_id: [list of event types]}
        """
        self.samples = []
        
        for p, seq in user_sequences.items():
            # Create training windows: given history, predict next event
            # We need at least 2 events to predict the next one
            if len(seq) > 1:
                for i in range(1, len(seq)):
                    history = seq[:i]
                    target = seq[i]
                    
                    history_tensor = preprocessor.process_sequence([{'event_type': e} for e in history])
                    target_encoded = preprocessor.encode_event_type(target)
                    target_tensor = torch.tensor(target_encoded, dtype=torch.long)
                    
                    self.samples.append((history_tensor, target_tensor))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        return self.samples[idx]
