import torch
import hashlib

class EventPreprocessor:
    def __init__(self, num_event_types: int, max_seq_length: int):
        self.num_event_types = num_event_types
        self.max_seq_length = max_seq_length

    def encode_event_type(self, event_type: str) -> int:
        # A simple hashing trick to encode event types dynamically
        # In a production system, you'd use a fixed mapping/vocabulary
        hash_val = int(hashlib.md5(event_type.encode()).hexdigest(), 16)
        return (hash_val % (self.num_event_types - 1)) + 1 # 0 reserved for padding

    def process_sequence(self, events: list) -> torch.Tensor:
        """
        Converts a list of Event schemas or dicts into a tensor of shape (max_seq_length,)
        """
        seq = []
        for e in events[-self.max_seq_length:]:
            event_type = e.event_type if hasattr(e, 'event_type') else e['event_type']
            seq.append(self.encode_event_type(event_type))
            
        # Pad sequence from the beginning (left padding) so the latest event is always at the end
        pad_len = self.max_seq_length - len(seq)
        padded_seq = [0] * pad_len + seq
        
        return torch.tensor(padded_seq, dtype=torch.long)
