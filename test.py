import urllib.request
import json

def post_event(event_type):
    data = json.dumps({"user_id": "test_user_1", "event_type": event_type}).encode("utf-8")
    req = urllib.request.Request("http://localhost:8000/api/v1/ingest", data=data, headers={'Content-Type': 'application/json'})
    response = urllib.request.urlopen(req)
    print(response.read().decode("utf-8"))

print("Testing /health...")
print(urllib.request.urlopen("http://localhost:8000/health").read().decode("utf-8"))

print("\nIngesting sequence...")
post_event("login")
post_event("view_item")
post_event("add_to_cart")

print("\nGetting Predictions...")
print(urllib.request.urlopen("http://localhost:8000/api/v1/predict/test_user_1").read().decode("utf-8"))
