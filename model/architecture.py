import torch
import torch.nn as nn
import torch.nn.functional as F

class BehaviorRNNBase(nn.Module):
    def __init__(self, vocab_size: int, embedding_dim: int, hidden_dim: int, num_layers: int, dropout: float = 0.2):
        super(BehaviorRNNBase, self).__init__()
        # vocab_size includes the padding token (index 0)
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=0)
        self.lstm = nn.LSTM(
            input_size=embedding_dim, 
            hidden_size=hidden_dim, 
            num_layers=num_layers, 
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        self.fc = nn.Linear(hidden_dim, vocab_size)

    def forward(self, x):
        # x shape: (batch_size, seq_length)
        embedded = self.embedding(x)
        # embedded shape: (batch_size, seq_length, embedding_dim)
        
        lstm_out, (hidden, cell) = self.lstm(embedded)
        # lstm_out shape: (batch_size, seq_length, hidden_dim)
        # we care about the representation at the last time step
        last_out = lstm_out[:, -1, :]
        
        logits = self.fc(last_out)
        return logits
