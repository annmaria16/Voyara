import re
import urllib.parse
from services.shopping.normalization_service import normalize_product

def check_category_match(title: str, expected_category: str) -> bool:
    title_lower = title.lower()
    if expected_category == "laptop":
        # Must contain laptop-related terms
        has_laptop_kw = any(x in title_lower for x in ["laptop", "notebook", "ultrabook", "chromebook", "macbook", "zenbook", "thinkpad", "ideapad", "inspiron", "vivobook", "predator", "hp 15", "hp 14", "pavilion", "mac book"])
        # Accessories blocklist
        is_accessory = any(x in title_lower for x in ["bag", "stand", "sleeve", "charger", "skin", "table", "accessory", "accessories", "adapter", "case", "cover", "mount", "bracket", "desk"])
        return has_laptop_kw and not is_accessory
    elif expected_category == "phone":
        has_phone_kw = any(x in title_lower for x in ["phone", "mobile", "smartphone", "iphone", "pixel", "galaxy", "oneplus"])
        is_accessory = any(x in title_lower for x in ["case", "cover", "glass", "protector", "charger", "cable", "holder", "mount", "stand", "accessory"])
        return has_phone_kw and not is_accessory
    return True

def _extract_criteria_fallback(query: str) -> dict:
    q = query.lower()
    
    # 1. Category
    category = "other"
    if any(x in q for x in ["laptop", "notebook", "ultrabook", "chromebook", "macbook"]):
        category = "laptop"
    elif any(x in q for x in ["phone", "mobile", "smartphone", "iphone", "pixel", "galaxy"]):
        category = "phone"
        
    # 2. Brand
    brand = None
    for b in ["apple", "samsung", "oneplus", "google", "lenovo", "hp", "dell", "asus", "acer", "xiaomi", "redmi", "realme", "oppo", "vivo", "motorola", "lg", "sony", "intel", "amd"]:
        if re.search(r'\b' + re.escape(b) + r'\b', q):
            brand = b.upper() if b in ["hp", "lg"] else b.capitalize()
            break
    if "iphone" in q and not brand:
        brand = "Apple"

    # 3. Model
    model = None
    iphone_match = re.search(r'\b(iphone\s*\d+(?:\s*pro\s*max|\s*pro|\s*plus|\s*mini)?)\b', q)
    if iphone_match:
        model = iphone_match.group(1).title()

    # 4. RAM
    ram_gb = None
    ram_match = re.search(r'\b(\d+)\s*(?:gb|gigabytes)?\s*ram\b', q)
    if not ram_match:
        ram_match = re.search(r'\b(\d+)\s*gb\b', q)
    if ram_match:
        val = int(ram_match.group(1))
        if val in [4, 6, 8, 12, 16, 24, 32, 64]:
            ram_gb = val

    # 5. Storage capacity and type
    storage_gb = None
    storage_type = None
    
    if "ssd" in q:
        storage_type = "SSD"
    elif "hdd" in q:
        storage_type = "HDD"
    elif "nvme" in q:
        storage_type = "NVMe"
        
    storage_match = re.search(r'\b(\d+)\s*(?:gb|tb)\b', q)
    if storage_match:
        val = int(storage_match.group(1))
        unit = "tb" if "tb" in storage_match.group(0) else "gb"
        if unit == "tb":
            storage_gb = val * 1024
        else:
            if val != ram_gb and val in [64, 128, 256, 512, 1024, 2048]:
                storage_gb = val

    # 6. Processor
    processor = None
    if "i3" in q or "core i3" in q:
        processor = "Intel Core i3"
    elif "i5" in q or "core i5" in q:
        processor = "Intel Core i5"
    elif "i7" in q or "core i7" in q:
        processor = "Intel Core i7"
    elif "i9" in q or "core i9" in q:
        processor = "Intel Core i9"
    elif "ryzen 3" in q:
        processor = "AMD Ryzen 3"
    elif "ryzen 5" in q:
        processor = "AMD Ryzen 5"
    elif "ryzen 7" in q:
        processor = "AMD Ryzen 7"
    elif "ryzen 9" in q:
        processor = "AMD Ryzen 9"
    elif "m1" in q:
        processor = "Apple M1"
    elif "m2" in q:
        processor = "Apple M2"
    elif "m3" in q:
        processor = "Apple M3"

    # 7. GPU
    gpu = None
    if "rtx" in q:
        gpu = "RTX"
        rtx_match = re.search(r'\b(rtx\s*\d{4})\b', q)
        if rtx_match:
            gpu = rtx_match.group(1).upper()
    elif "gtx" in q:
        gpu = "GTX"
    elif "radeon" in q:
        gpu = "Radeon"
    elif "iris" in q or "intel iris" in q:
        gpu = "Intel Iris"

    # 8. Screen Size
    screen_size = None
    screen_match = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:inch|\"|\-inch)\b', q)
    if screen_match:
        try:
            screen_size = float(screen_match.group(1))
        except ValueError:
            pass

    # 9. Budget
    budget_max = None
    under_match = re.search(r'(?:under|below|budget|max|maximum|rs\.?|₹)\s*([\d,]+)', q)
    if under_match:
        try:
            budget_max = float(under_match.group(1).replace(",", ""))
        except ValueError:
            pass

    return {
        "category": category,
        "brand": brand,
        "model": model,
        "processor": processor,
        "ram_gb": ram_gb,
        "storage_gb": storage_gb,
        "storage_type": storage_type,
        "gpu": gpu,
        "screen_size": screen_size,
        "budget_max": budget_max,
        "currency": "INR"
    }

def extract_criteria_from_query(query: str) -> dict:
    fallback_res = _extract_criteria_fallback(query)
    
    try:
        from services.agent.ai_provider import get_active_provider
        import json
        
        provider = get_active_provider()
        
        system_prompt = (
            "You are the VeriNova Query Parser.\n"
            "Analyze the shopping or comparison query and extract structured criteria details.\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            "  \"category\": \"laptop\" | \"phone\" | \"other\",\n"
            "  \"brand\": string or null,\n"
            "  \"model\": string or null,\n"
            "  \"processor\": string or null,\n"
            "  \"ram_gb\": integer size in GB or null,\n"
            "  \"storage_gb\": integer size in GB or null,\n"
            "  \"storage_type\": \"SSD\" | \"HDD\" | \"NVMe\" | null,\n"
            "  \"gpu\": string or null,\n"
            "  \"screen_size\": float size in inches or null,\n"
            "  \"budget_max\": float budget in INR or null,\n"
            "  \"currency\": \"INR\",\n"
            "  \"allowed_brands\": list of strings or null,\n"
            "  \"allowed_models\": list of strings or null\n"
            "}\n"
            "Rules:\n"
            "- Convert RAM (e.g. '16GB' -> 16) and Storage (e.g. '512GB' -> 512, '1TB' -> 1024) to integers.\n"
            "- Brand names should be normalized (e.g. 'asus' -> 'ASUS', 'apple' -> 'Apple', 'hp' -> 'HP').\n"
            "- If multiple products are compared, list all their brands in allowed_brands and model identifiers in allowed_models.\n"
            "- Do not output markdown fences or other text outside the JSON object."
        )
        
        res = provider.generate([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Extract criteria from query: '{query}'"}
        ], response_format={"type": "json_object"})
        
        content = res["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        
        # Merge parsed results with defaults
        final_res = {
            "category": parsed.get("category") or fallback_res["category"],
            "brand": parsed.get("brand") or fallback_res["brand"],
            "model": parsed.get("model") or fallback_res["model"],
            "processor": parsed.get("processor") or fallback_res["processor"],
            "ram_gb": parsed.get("ram_gb") or fallback_res["ram_gb"],
            "storage_gb": parsed.get("storage_gb") or fallback_res["storage_gb"],
            "storage_type": parsed.get("storage_type") or fallback_res["storage_type"],
            "gpu": parsed.get("gpu") or fallback_res["gpu"],
            "screen_size": parsed.get("screen_size") or fallback_res["screen_size"],
            "budget_max": parsed.get("budget_max") or fallback_res["budget_max"],
            "currency": parsed.get("currency") or fallback_res["currency"],
            "allowed_brands": parsed.get("allowed_brands") or ([fallback_res["brand"]] if fallback_res["brand"] else None),
            "allowed_models": parsed.get("allowed_models") or ([fallback_res["model"]] if fallback_res["model"] else None)
        }
        return final_res
    except Exception as e:
        import logging
        logging.getLogger("verinova.shopping.verifier").warning(f"Gemini criteria extraction failed: {str(e)}. Using fallback regex parser.")
        return fallback_res

def extract_product_attributes(title: str, price: float, url: str, seller: str) -> dict:
    t = title.lower()
    
    # Determine category
    category = "other"
    if check_category_match(title, "laptop"):
        category = "laptop"
    elif check_category_match(title, "phone"):
        category = "phone"
        
    # Extract brand
    brand = None
    for b in ["apple", "samsung", "oneplus", "google", "lenovo", "hp", "dell", "asus", "acer", "xiaomi", "redmi", "realme", "oppo", "vivo", "motorola", "lg", "sony", "intel", "amd"]:
        if re.search(r'\b' + re.escape(b) + r'\b', t):
            brand = b.upper() if b in ["hp", "lg"] else b.capitalize()
            break
    if "iphone" in t and not brand:
        brand = "Apple"
        
    # Extract RAM
    ram_gb = None
    ram_match = re.search(r'\b(\d+)\s*gb\s*(?:ddr\d|lpddr\d)?\s*ram\b', t)
    if not ram_match:
        slash_match = re.search(r'\b(\d+)\s*gb\s*/\s*\d+\s*(?:gb|tb)\b', t)
        if slash_match:
            ram_gb = int(slash_match.group(1))
        else:
            generic_gb = re.findall(r'\b(\d+)\s*gb\b', t)
            for val_str in generic_gb:
                val = int(val_str)
                if val in [4, 6, 8, 12, 16, 24, 32, 64]:
                    ram_gb = val
                    break
    else:
        ram_gb = int(ram_match.group(1))

    # Extract Storage
    storage_gb = None
    storage_type = "SSD" if "ssd" in t else ("HDD" if "hdd" in t else ("NVMe" if "nvme" in t else "SSD"))
    
    tb_match = re.search(r'\b(\d+)\s*tb\b', t)
    if tb_match:
        storage_gb = int(tb_match.group(1)) * 1024
    else:
        generic_gbs = re.findall(r'\b(\d+)\s*gb\b', t)
        for val_str in generic_gbs:
            val = int(val_str)
            if val in [64, 128, 256, 512, 1024, 2048] and val != ram_gb:
                storage_gb = val
                break
                
    # Extract Processor
    processor = None
    for p in ["i3", "i5", "i7", "i9", "ryzen 3", "ryzen 5", "ryzen 7", "ryzen 9", "m1", "m2", "m3"]:
        if re.search(r'\b' + re.escape(p) + r'\b', t):
            if "i" in p:
                processor = f"Intel Core {p.upper()}"
            elif "ryzen" in p:
                processor = f"AMD {p.title()}"
            else:
                processor = f"Apple {p.upper()}"
            break
            
    # Extract GPU
    gpu = None
    if "rtx" in t:
        rtx_match = re.search(r'\b(rtx\s*\d{4})\b', t)
        gpu = rtx_match.group(1).upper() if rtx_match else "RTX Graphics"
    elif "gtx" in t:
        gpu = "GTX Graphics"
    elif "radeon" in t:
        gpu = "Radeon Graphics"
    elif "iris" in t:
        gpu = "Intel Iris Graphics"
        
    # Extract Screen Size
    screen_size = None
    screen_match = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:inch|\"|\-inch)\b', t)
    if screen_match:
        try:
            screen_size = float(screen_match.group(1))
        except ValueError:
            pass

    return {
        "store": seller,
        "title": title,
        "brand": brand,
        "model": normalize_product(title).get("model") or "Standard",
        "category": category,
        "price": price,
        "currency": "INR",
        "ram_gb": ram_gb,
        "storage_gb": storage_gb,
        "storage_type": storage_type,
        "processor": processor,
        "gpu": gpu,
        "screen_size": str(screen_size) if screen_size else None,
        "availability": "IN_STOCK",
        "url": url,
        "source": seller,
        "verification_status": "UNVERIFIED"
    }

def verify_product(product: dict, criteria: dict) -> dict:
    reasons = []

    # Allowed brands verification (if specified)
    if criteria.get("allowed_brands"):
        matched_brand = False
        p_brand = product.get("brand")
        p_title = product.get("title", "").lower()
        for b in criteria["allowed_brands"]:
            if (p_brand and b.lower() == p_brand.lower()) or b.lower() in p_title:
                matched_brand = True
                break
        if not matched_brand:
            reasons.append(f"Brand mismatch (expected one of {criteria['allowed_brands']}, got {p_brand or 'None'})")

    # Allowed models verification (if specified)
    if criteria.get("allowed_models"):
        matched_model = False
        p_title = product.get("title", "").lower()
        for m in criteria["allowed_models"]:
            if re.search(r'\b' + re.escape(m.lower()) + r'\b', p_title) or m.lower() in p_title:
                matched_model = True
                break
        if not matched_model:
            reasons.append(f"Model mismatch (expected one of {criteria['allowed_models']})")

    # Category verification (mandatory)
    if criteria.get("category"):
        if product.get("category") != criteria["category"]:
            reasons.append(f"Category mismatch (expected {criteria['category']}, got {product.get('category')})")

    # Brand verification (mandatory if requested)
    if criteria.get("brand"):
        if not product.get("brand") or product["brand"].lower() != criteria["brand"].lower():
            reasons.append(f"Brand mismatch (expected {criteria['brand']}, got {product.get('brand') or 'None'})")

    # RAM verification (mandatory if requested)
    if criteria.get("ram_gb"):
        if product.get("ram_gb") is None:
            reasons.append("RAM not verified (missing specification)")
        elif product["ram_gb"] < criteria["ram_gb"]:
            reasons.append(f"RAM requirement not satisfied (expected at least {criteria['ram_gb']}GB, got {product['ram_gb']}GB)")

    # Storage capacity verification (mandatory if requested)
    if criteria.get("storage_gb"):
        if product.get("storage_gb") is None:
            reasons.append("Storage not verified (missing specification)")
        elif product["storage_gb"] < criteria["storage_gb"]:
            reasons.append(f"Storage requirement not satisfied (expected at least {criteria['storage_gb']}GB, got {product['storage_gb']}GB)")

    # Storage type verification (mandatory if requested)
    if criteria.get("storage_type"):
        if not product.get("storage_type") or product["storage_type"].lower() != criteria["storage_type"].lower():
            reasons.append(f"Storage type mismatch (expected {criteria['storage_type']}, got {product.get('storage_type') or 'None'})")

    # Processor verification (mandatory if requested)
    if criteria.get("processor"):
        if not product.get("processor") or criteria["processor"].lower() not in product["processor"].lower():
            reasons.append(f"Processor mismatch (expected {criteria['processor']}, got {product.get('processor') or 'None'})")

    # GPU verification (mandatory if requested)
    if criteria.get("gpu"):
        if not product.get("gpu") or criteria["gpu"].lower() not in product["gpu"].lower():
            reasons.append(f"GPU requirement not satisfied (expected {criteria['gpu']}, got {product.get('gpu') or 'None'})")

    # Budget verification (mandatory)
    if criteria.get("budget_max"):
        price = product.get("price")
        if price is None:
            reasons.append("Price not verified")
        elif float(price) > float(criteria["budget_max"]):
            reasons.append(f"Over budget (expected ≤ ₹{criteria['budget_max']:,}, got ₹{price:,})")

    # Source URL check (mandatory)
    if not product.get("url") or not product["url"].startswith("http"):
        reasons.append("Source URL is missing or invalid")

    is_verified = len(reasons) == 0
    return {
        "verified": is_verified,
        "reasons": reasons,
        "verification_status": "VERIFIED" if is_verified else "INSUFFICIENT_DATA" if any("not verified" in r or "missing" in r for r in reasons) else "REJECTED"
    }
