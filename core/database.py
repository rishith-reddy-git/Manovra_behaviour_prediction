import sqlite3
from typing import Dict, List
from core.config import settings

# Parse the database name from the connection string
DB_PATH = settings.DATABASE_URL.replace("sqlite:///", "") if settings.DATABASE_URL else "events.db"

def get_db_connection():
    """
    Returns an active SQLite database connection with row representation.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the database schema if it doesn't already exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def add_event_to_db(user_id: str, event_type: str):
    """
    Inserts a single event record for a user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO events (user_id, event_type) VALUES (?, ?)",
        (user_id, event_type)
    )
    conn.commit()
    conn.close()

def load_all_histories_from_db() -> Dict[str, List[str]]:
    """
    Retrieves all history records from database and formats them as a memory buffer dictionary.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, event_type FROM events ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    
    histories: Dict[str, List[str]] = {}
    for row in rows:
        user_id = row["user_id"]
        event_type = row["event_type"]
        if user_id not in histories:
            histories[user_id] = []
        histories[user_id].append(event_type)
        
    # Keep only the latest 50 events per user to avoid memory overflow
    for user_id in histories:
        if len(histories[user_id]) > 50:
            histories[user_id] = histories[user_id][-50:]
            
    return histories

def clear_db():
    """
    Clears all tables in the database. Useful for resetting simulation states.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events")
    conn.commit()
    conn.close()
