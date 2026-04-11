import asyncio
from backend.services.gemini_client import gemini_client

async def run_minimal_test():
    system = "You are a venue staff assistant. Respond in JSON."
    user = (
        "Ticket: Block B, Row 12\n"
        "Gates Available:\n"
        "- entry_A (North, 500m, high density)\n"
        "- entry_B (South, 50m, low density)\n"
        "Recommend the best gate."
    )
    
    print("--- STARTING MINIMAL AI TEST (1 SINGLE CALL) ---")
    result = await gemini_client.generate_recommendation(system, user)
    
    if "error" in result:
        print(f"❌ TEST FAILED: {result['error']}")
        if "body" in result:
            print(f"Response Body: {result['body']}")
    else:
        print("✅ TEST PASSED: Received valid AI reasoning!")
        print(f"Recommended Gate: {result.get('recommended_entry')}")
        print(f"Reason: {result.get('reason')}")

if __name__ == "__main__":
    asyncio.run(run_minimal_test())
