import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def check_gemini_quota():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ No GEMINI_API_KEY found in environment.")
        return

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": "Quota check. Please respond with 'OK'."}]}]
    }
    
    print(f"Calling Gemini API to check raw quota headers...")
    response = requests.post(url, json=payload)
    
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    
    if response.status_code == 429:
        print("\n❌ 429 RATE LIMITED DETECTED")
        print("Raw Error Body:")
        print(json.dumps(response.json(), indent=2))
        
        # Check for specific quota info in the error
        error_details = response.json().get('error', {})
        message = error_details.get('message', '')
        print(f"\nREASON: {message}")
    else:
        print("\n✅ API IS RESPONDING")
        print(response.json())

if __name__ == "__main__":
    check_gemini_quota()
