import os
import json
import firebase_admin
from firebase_admin import credentials, db

# Mocking the settings for simplicity
DATABASE_URL = "https://venueflow-185ef-default-rtdb.firebaseio.com/"
# Extracting creds from .env (simplified for this script)
# In reality, I'll just load the file and parse it.

def check_db():
    with open('/Users/olixstudios/Documents/workspace/Projects/hackathons/VenueFlow/.env', 'r') as f:
        lines = f.readlines()
        creds_line = [l for l in lines if l.startswith('FIREBASE_SERVICE_CREDENTIALS=')][0]
        raw_json = creds_line.split('=', 1)[1].strip().strip("'")
        creds_dict = json.loads(raw_json)
        # Fix the private key newlines
        creds_dict['private_key'] = creds_dict['private_key'].replace('\\n', '\n')

    if not firebase_admin._apps:
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred, {
            'databaseURL': DATABASE_URL
        })

    print("--- ACTIVE EVENT POINTER ---")
    active_event = db.reference('/active_event').get()
    print(json.dumps(active_event, indent=2))

    print("\n--- EVENTS ---")
    events = db.reference('/events').get()
    print(json.dumps(events, indent=2))

    print("\n--- TICKETS ---")
    tickets = db.reference('/tickets').get()
    print(json.dumps(tickets, indent=2))

if __name__ == "__main__":
    check_db()
