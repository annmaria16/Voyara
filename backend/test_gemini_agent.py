import os
import sys
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("test_gemini_agent")

# Load environment
load_dotenv(override=True)

def test_all():
    print("="*60)
    print("VERINOVA GEMINI INTEGRATION & AGENT DIAGNOSTIC HEALTH CHECK")
    print("="*60)

    # 1. Check Env Config
    provider_name = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
    
    print(f"Configured Provider: {provider_name}")
    print(f"Gemini API Key Configured: {'Yes (Length: ' + str(len(gemini_key)) + ')' if gemini_key else 'No'}")
    print(f"Gemini Model: {gemini_model}")
    print("-"*60)

    if provider_name != "gemini":
        print("ERROR: AI_PROVIDER is not set to 'gemini'. Cannot run Gemini health checks.")
        sys.exit(1)
    if not gemini_key:
        print("ERROR: GEMINI_API_KEY is not configured in .env file.")
        sys.exit(1)

    # 2. Test Gemini provider generate (A)
    print("A. Testing Gemini Provider Generate...")
    try:
        from services.agent.ai_provider import GeminiProvider
        provider = GeminiProvider()
        res = provider.generate([
            {"role": "user", "content": "Hello, respond with exactly the word: SUCCESS"}
        ])
        content = res["choices"][0]["message"]["content"].strip()
        print(f"   [PASS] Gemini generate returned content: '{content}'")
    except Exception as e:
        print(f"   [FAIL] Gemini generate failed: {str(e)}")
        # Do not exit, proceed to test other components

    # 3. Test Planner orchestration (B)
    print("\nB. Testing Task Planner Orchestration...")
    test_goal = "Compare Vivo V40 and OnePlus Nord 4 prices"
    try:
        from services.agent.planner import TaskPlanner
        plan = TaskPlanner.plan_task(test_goal)
        steps = plan.get("steps", [])
        print(f"   [PASS] Planner successfully generated {len(steps)} steps:")
        for step in steps:
            print(f"      - Step {step.get('step_id') or step.get('step_number')}: tool='{step.get('tool')}' description='{step.get('description')}'")
    except Exception as e:
        print(f"   [FAIL] Planner failed: {str(e)}")

    # 4. Test Comparison tool logic (C & D)
    print("\nC & D. Testing Comparison Tool...")
    try:
        from services.tools.shopping_agent import compare_shopping_offers
        from unittest.mock import patch
        # Simulate some raw offers
        sample_raw_offers = [
            {
                "id": 1,
                "title": "Vivo V40 5G (8GB RAM, 256GB Storage)",
                "price": 39999.0,
                "url": "https://www.flipkart.com/vivo-v40-5g-256gb",
                "source_type": "LIVE",
                "seller": "Flipkart"
            },
            {
                "id": 2,
                "title": "OnePlus Nord 4 5G (8GB RAM, 256GB Storage)",
                "price": 32999.0,
                "url": "https://www.flipkart.com/oneplus-nord-4-256gb",
                "source_type": "LIVE",
                "seller": "Flipkart"
            }
        ]
        with patch("services.providers.ShoppingProvider.search_offers", return_value=sample_raw_offers):
            comparison = compare_shopping_offers(
                query="Compare Vivo V40 and OnePlus Nord 4"
            )
        if comparison.get("success"):
            print("   [PASS] Comparison tool successfully parsed and structured products:")
            results = comparison.get("results", [])
            for res in results:
                print(f"      - Group: {res.get('product_group')} | Best seller: {res.get('best_option', {}).get('seller')} (₹{res.get('best_option', {}).get('effective_price')})")
            offers = comparison.get("offers", [])
            for off in offers:
                print(f"      - {off.get('title')} price=₹{off.get('price')} from {off.get('provider')}")
        else:
            print(f"   [FAIL] Comparison tool returned success=False: {comparison.get('error')}")
    except Exception as e:
        print(f"   [FAIL] Comparison tool failed: {str(e)}")

    # 5. Test Synthesis engine (E)
    print("\nE. Testing Final Synthesis...")
    try:
        completed_steps_summary = [
            {
                "step_id": 1,
                "description": "Compare Vivo V40 and OnePlus Nord 4 prices",
                "tool": "compare_shopping_offers",
                "output": {
                    "success": True,
                    "offers": [
                        {"title": "Vivo V40", "price": 39999.0, "provider": "Flipkart"},
                        {"title": "OnePlus Nord 4", "price": 32999.0, "provider": "Flipkart"}
                    ],
                    "best_value": {"store": "Flipkart", "price": 32999.0, "reason": "OnePlus Nord 4 is cheaper by ₹7,000."}
                }
            }
        ]
        
        system_prompt_final = (
            "You are the VeriNova AI Agent Final Responder.\n"
            "Your job is to synthesize all completed steps outputs and generate a clear, trustworthy, final response to the user's task.\n"
            "Ensure all details are fully justified by the step output evidence.\n"
            "You MUST explicitly separate your answer into three sections:\n"
            "- **Facts**: Factual information gathered from reliable tool outputs.\n"
            "- **Inferences & Recommendations**: Logical deductions and suggested choices.\n"
            "- **Limitations & Unknowns**: Factors that could not be verified or variables that remain uncertain."
        )
        prompt_final = (
            f"Task Goal: Compare Vivo V40 and OnePlus Nord 4 prices\n"
            f"Executed Steps Results: {json.dumps(completed_steps_summary)}\n\n"
            f"Generate the final answer response."
        )
        
        res = provider.generate([
            {"role": "system", "content": system_prompt_final},
            {"role": "user", "content": prompt_final}
        ])
        synthesis = res["choices"][0]["message"]["content"]
        print("   [PASS] Synthesis engine generated final response:")
        print("-" * 60)
        print(synthesis.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8'))
        print("-" * 60)
    except Exception as e:
        print(f"   [FAIL] Synthesis engine failed: {str(e)}")

    print("\n" + "="*60)
    print("DIAGNOSTIC HEALTH CHECK COMPLETE")
    print("="*60)

if __name__ == "__main__":
    import json
    test_all()
