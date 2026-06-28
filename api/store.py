from typing import Dict, List

# In-memory store for user event histories
# Loaded from SQLite on startup
from core.database import load_all_histories_from_db
try:
    user_histories = load_all_histories_from_db()
except Exception as e:
    print(f"Error loading database histories: {e}")
    user_histories = {}

# In-memory reverse mapping for action ID -> readable event name
event_mapping: Dict[int, str] = {}

# Pre-populate mapping for common actions
common_actions = [
    "login", "logout", "search", "view_item", "add_to_cart", "remove_from_cart",
    "view_cart", "checkout", "purchase", "view_reviews", "write_review",
    "add_to_wishlist", "share_item", "contact_support", "apply_coupon",
    "update_shipping", "click_ad", "filter_items", "view_category",
    "subscribe", "unsubscribe", "refund_request", "add_to_compare", "view_profile"
]

from core.config import settings
import hashlib

for action in common_actions:
    hash_val = int(hashlib.md5(action.encode()).hexdigest(), 16)
    action_id = (hash_val % (settings.NUM_EVENT_TYPES - 1)) + 1
    event_mapping[action_id] = action

