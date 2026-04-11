import vertexai
from vertexai.generative_models import GenerativeModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vertex_test")

def test_vertex():
    project_id = "venueflow-185ef"
    location = "us-central1"
    
    try:
        vertexai.init(project=project_id, location=location)
        model = GenerativeModel("gemini-1.5-flash") # Stable Vertex Identifier
        
        print(f"Testing Vertex AI on project {project_id}...")
        response = model.generate_content("ping")
        
        if response.text:
            print(f"SUCCESS: Received response from Vertex AI: {response.text}")
            return True
        else:
            print("FAILURE: Empty response from Vertex AI")
    except Exception as e:
        print(f"FAILURE: Vertex AI error: {e}")
    
    return False

if __name__ == "__main__":
    test_vertex()
