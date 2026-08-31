import os
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import cast, String

import core_models
from services.shopping.providers.amazon import AmazonProvider
from services.shopping.providers.flipkart import FlipkartProvider
from services.shopping.providers.meesho import MeeshoProvider

PRODUCT_SEARCH_CACHE_TTL = 300

PROVIDERS = {
    "amazon": AmazonProvider(),
    "flipkart": FlipkartProvider(),
    "meesho": MeeshoProvider()
}

def execute_product_search(
    query: str,
    user_id: int,
    db: Session,
    max_price: float = None,
    providers_list: list[str] = None
) -> dict:
    if not providers_list:
        providers_list = ["amazon", "flipkart", "meesho"]

    allowed = ["amazon", "flipkart", "meesho"]
    providers_list = [p.lower() for p in providers_list if p.lower() in allowed]

    filters = {"max_price": max_price}
    filters_json = json.dumps(filters)

    # 1. Check cache
    cache_cutoff = datetime.utcnow() - timedelta(seconds=PRODUCT_SEARCH_CACHE_TTL)
    cached_search = (
        db.query(core_models.ProductSearch)
        .filter(
            core_models.ProductSearch.query == query,
            cast(core_models.ProductSearch.filters, String) == filters_json,
            core_models.ProductSearch.created_at >= cache_cutoff
        )
        .order_by(core_models.ProductSearch.created_at.desc())
        .first()
    )

    if cached_search:
        cached_offers = (
            db.query(core_models.ProductOffer)
            .filter(core_models.ProductOffer.search_id == cached_search.id)
            .all()
        )
        results = []
        providers_checked = set()
        for off in cached_offers:
            providers_checked.add(off.provider)
            results.append({
                "provider": off.provider,
                "provider_product_id": off.provider_product_id,
                "title": off.title,
                "price": off.price,
                "currency": off.currency,
                "availability": off.availability,
                "url": off.url,
                "image_url": off.image_url,
                "rating": off.rating,
                "review_count": off.review_count,
                "last_checked": off.last_checked.isoformat()
            })
        
        unconfigured = []
        for p in providers_list:
            if p not in providers_checked:
                prov = PROVIDERS.get(p)
                if prov and not prov.is_configured():
                    unconfigured.append(p)

        return {
            "success": True,
            "cached": True,
            "results": results,
            "providers_checked": list(providers_checked),
            "providers_unavailable": unconfigured
        }

    # 2. Run fresh search
    new_search = core_models.ProductSearch(
        user_id=user_id,
        query=query,
        filters=filters_json
    )
    db.add(new_search)
    db.commit()
    db.refresh(new_search)

    results = []
    providers_checked = []
    providers_unavailable = []

    for p in providers_list:
        prov = PROVIDERS.get(p)
        if not prov:
            continue
            
        if not prov.is_configured():
            providers_unavailable.append(p)
            continue

        res = prov.search_products(query, filters)
        providers_checked.append(p)

        if res.get("success") and res.get("results"):
            for r in res["results"]:
                results.append(r)
                
                db_offer = core_models.ProductOffer(
                    search_id=new_search.id,
                    provider=r["provider"],
                    provider_product_id=r["provider_product_id"],
                    title=r["title"],
                    price=r["price"],
                    currency=r["currency"],
                    availability=r["availability"],
                    url=r["url"],
                    image_url=r.get("image_url"),
                    rating=r.get("rating"),
                    review_count=r.get("review_count")
                )
                db.add(db_offer)
            db.commit()

    return {
        "success": True,
        "cached": False,
        "results": results,
        "providers_checked": providers_checked,
        "providers_unavailable": providers_unavailable
    }
