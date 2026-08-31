import logging
from pydantic import BaseModel, Field
from services.agent.tool_registry import register_tool
from services.providers import ShoppingProvider
from services.shopping.normalization_service import normalize_product, are_products_equivalent

logger = logging.getLogger("verinova.tools.shopping_agent")

from services.shopping.shopping_verifier import extract_criteria_from_query, extract_product_attributes, verify_product

def choose_best_value(offers):
    valid_offers = [
        offer for offer in offers
        if offer.get("price") is not None
    ]
    if not valid_offers:
        return None
    return min(
        valid_offers,
        key=lambda offer: float(offer["price"])
    )

def filter_by_budget(offers, budget):
    if budget is None:
        return offers
    return [
        offer
        for offer in offers
        if offer.get("price") is not None
        and float(offer["price"]) <= budget
    ]

class ProductComparisonInput(BaseModel):
    query: str = Field(..., description="The query string to search for (e.g. 'HP laptop 16GB RAM').")

@register_tool(
    name="compare_shopping_offers",
    description="Normalize product names, verify specifications against criteria, filter invalid items, and return verified comparisons.",
    input_schema=ProductComparisonInput,
    risk_level="LOW",
    requires_auth=False
)
def compare_shopping_offers(query: str) -> dict:
    criteria = extract_criteria_from_query(query)
    raw_offers = ShoppingProvider.search_offers(query)
    
    # Since search_offers doesn't produce demo fallbacks, all raw_offers are live results.
    candidates = [o for o in raw_offers if o.get("source_type") == "LIVE"]
    if not candidates:
        return {
            "success": False,
            "error": "No verified product results are currently available from the configured sources.",
            "results": [],
            "excluded_results": []
        }
        
    verified_products = []
    excluded_results = []
    
    for offer in candidates:
        # Extract attributes from candidate
        product = extract_product_attributes(
            title=offer["title"],
            price=offer["price"],
            url=offer["url"],
            seller=offer["seller"]
        )
        
        # Add shipping and discount
        product["shipping"] = offer.get("shipping", 0)
        product["discount"] = offer.get("discount", 0)
        product["effective_price"] = product["price"] + product["shipping"] - product["discount"]
        product["source_type"] = "LIVE"
        
        # Verify product against query criteria
        verification = verify_product(product, criteria)
        product["verification_status"] = verification["verification_status"]
        product["reasons"] = verification["reasons"]
        
        if verification["verified"]:
            verified_products.append(product)
        else:
            excluded_results.append({
                "title": product["title"],
                "store": product["store"],
                "price": product["price"],
                "reason": ", ".join(verification["reasons"]),
                "url": product["url"]
            })
            
    # Resolve product groups using equivalence matches
    groups = []
    for product in verified_products:
        added_to_group = False
        product_norm = {
            "brand": product["brand"],
            "model": product["model"],
            "storage": f"{product['storage_gb']}GB" if product.get("storage_gb") else None,
            "ram": f"{product['ram_gb']}GB" if product.get("ram_gb") else None
        }
        for group in groups:
            rep = group["representative"]
            rep_norm = {
                "brand": rep["brand"],
                "model": rep["model"],
                "storage": f"{rep['storage_gb']}GB" if rep.get("storage_gb") else None,
                "ram": f"{rep['ram_gb']}GB" if rep.get("ram_gb") else None
            }
            if are_products_equivalent(product_norm, rep_norm):
                group["offers"].append(product)
                added_to_group = True
                break
        
        if not added_to_group:
            groups.append({
                "representative": product,
                "offers": [product]
            })
            
    # Rank offers inside each group and calculate best price
    comparison_results = []
    for g in groups:
        sorted_offers = sorted(g["offers"], key=lambda o: (o["availability"] != "IN_STOCK", o["effective_price"]))
        best_offer = sorted_offers[0]
        
        comparison_results.append({
            "product_group": f"{best_offer['brand'] or ''} {best_offer['model'] or 'Unknown'}".strip(),
            "best_option": {
                "seller": best_offer["store"],
                "effective_price": best_offer["effective_price"],
                "original_price": best_offer["price"],
                "shipping": best_offer["shipping"],
                "discount": best_offer["discount"],
                "url": best_offer["url"],
                "availability": best_offer["availability"],
                "title": best_offer["title"],
                "brand": best_offer["brand"],
                "ram_gb": best_offer["ram_gb"],
                "storage_gb": best_offer["storage_gb"],
                "processor": best_offer["processor"],
                "gpu": best_offer["gpu"]
            },
            "offers_compared_count": len(sorted_offers),
            "all_offers": [
                {
                    "seller": o["store"],
                    "effective_price": o["effective_price"],
                    "availability": o["availability"],
                    "url": o["url"],
                    "title": o["title"],
                    "brand": o["brand"],
                    "ram_gb": o["ram_gb"],
                    "storage_gb": o["storage_gb"],
                    "processor": o["processor"],
                    "gpu": o["gpu"],
                    "verification_status": o["verification_status"],
                    "reasons": o["reasons"]
                }
                for o in sorted_offers
            ],
            "source_type": "LIVE"
        })
        
    # Sort final groups by best option price
    comparison_results = sorted(comparison_results, key=lambda c: c["best_option"]["effective_price"])
    
    return {
        "success": True,
        "query": query,
        "criteria": criteria,
        "results": comparison_results,
        "excluded_results": excluded_results,
        "source_type": "LIVE"
    }
