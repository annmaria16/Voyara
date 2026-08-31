import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.append("c:/Users/HP/Documents/verinova/backend")

# Set dummy keys
os.environ["TAVILY_API_KEY"] = "dummy_tavily_key"

from main import app
from services.tools.shopping_agent import choose_best_value, filter_by_budget

class TestProductComparisonLogic(unittest.TestCase):

    def test_budget_filtering(self):
        """Test 1 — budget filtering"""
        offers = [
            {"store": "A", "price": 55000},
            {"store": "B", "price": 65000}
        ]
        result = filter_by_budget(offers, 60000)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["store"], "A")

    def test_best_value(self):
        """Test 2 — best value"""
        offers = [
            {"store": "A", "price": 55000},
            {"store": "B", "price": 52000}
        ]
        result = choose_best_value(offers)
        self.assertEqual(result["store"], "B")
        self.assertEqual(result["price"], 52000)

    def test_empty_results(self):
        """Test 3 — empty results"""
        result = choose_best_value([])
        self.assertIsNone(result)

    def test_api_endpoint(self):
        """Test 4 — API endpoint"""
        from unittest.mock import patch
        
        mock_offers = [
            {
                "id": 1,
                "title": "Apple iPhone 15 (Blue, 128 GB)",
                "price": 57999,
                "shipping": 0,
                "discount": 0,
                "availability": "IN_STOCK",
                "url": "https://www.flipkart.com/apple-iphone-15-blue-128-gb/p/itm2c879",
                "seller": "Flipkart",
                "source_type": "LIVE"
            },
            {
                "id": 2,
                "title": "Apple iPhone 15 (Black, 128 GB)",
                "price": 56999,
                "shipping": 0,
                "discount": 0,
                "availability": "IN_STOCK",
                "url": "https://www.meesho.com/apple-iphone-15-black-128-gb",
                "seller": "Meesho",
                "source_type": "LIVE"
            }
        ]
        
        with patch("services.providers.ShoppingProvider.search_offers", return_value=mock_offers):
            # We can test the compare_shopping_offers tool directly or run a test query
            from services.tools.shopping_agent import compare_shopping_offers
            res = compare_shopping_offers("Compare iPhone 15 128GB under 60000 across Flipkart and Meesho")
            self.assertTrue(res["success"])
            self.assertEqual(res["query"], "Compare iPhone 15 128GB under 60000 across Flipkart and Meesho")
            self.assertTrue(len(res["results"]) > 0)
            
            # Verify first product group results
            group = res["results"][0]
            self.assertIn("iphone 15", group["product_group"].lower())
            self.assertTrue(len(group["all_offers"]) >= 2)
            
            # Check that the best option effective price is the lowest
            best_price = group["best_option"]["effective_price"]
            for o in group["all_offers"]:
                self.assertTrue(best_price <= o["effective_price"])

if __name__ == "__main__":
    unittest.main()
