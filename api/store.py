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

# Pre-populate mapping for common actions across all domains (SaaS, Gaming, Media, E-Commerce)
common_actions = [
    # General
    "login", "logout", "contact_support", "open_settings", "view_profile",
    # SaaS Domain
    "view_dashboard", "create_project", "invite_member", "configure_api", "deploy_service", "upgrade_billing", "view_logs",
    # Gaming Domain
    "open_lobby", "join_matchmaker", "start_match", "complete_quest", "purchase_item", "send_friend_request",
    # Media Streaming Domain
    "search_content", "play_media", "pause_media", "add_to_favorites", "share_media", "rate_content", "subscribe_channel",
    # E-Commerce Domain (Existing compatibility)
    "search", "search_product", "view_item", "add_to_cart", "remove_from_cart", "view_cart", "checkout", "checkout_start", "purchase", "purchase_complete", "view_reviews", "write_review", "add_to_wishlist", "share_item", "apply_coupon", "update_shipping"
]

from core.config import settings
import hashlib

for action in common_actions:
    hash_val = int(hashlib.md5(action.encode()).hexdigest(), 16)
    action_id = (hash_val % (settings.NUM_EVENT_TYPES - 1)) + 1
    event_mapping[action_id] = action

