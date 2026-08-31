import os
import json
import urllib.request
import urllib.parse
import logging
from pydantic import BaseModel, Field
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.web_search")

class WebSearchInput(BaseModel):
    query: str = Field(..., description="The search query to search the web for.")

class WebSearchResultItem(BaseModel):
    title: str
    url: str
    snippet: str

class WebSearchResponse(BaseModel):
    query: str
    results: list[WebSearchResultItem]

# get_mock_results removed to prevent fallback mock outputs in production


@register_tool(
    name="web_search",
    description="Search the web for up-to-date information on a topic, returning titles, links, and text snippets.",
    input_schema=WebSearchInput,
    risk_level="LOW",
    requires_auth=False
)
def execute_web_search(query: str) -> dict:
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        logger.info("TAVILY_API_KEY is not configured. Falling back to Gemini Google Search Grounding.")
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
        if not gemini_key:
            raise ValueError("Neither TAVILY_API_KEY nor GEMINI_API_KEY is configured. Cannot perform web search.")
            
        g_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
        payload = {
            "contents": [{"parts": [{"text": f"Search the web for up-to-date information on: {query}"}]}],
            "tools": [{"googleSearch": {}}]
        }
        headers = {"Content-Type": "application/json"}
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(g_url, data=req_data, headers=headers, method="POST")
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                grounding_metadata = candidates[0].get("groundingMetadata", {}) if candidates else {}
                grounding_chunks = grounding_metadata.get("groundingChunks", [])
                
                results = []
                for idx, chunk in enumerate(grounding_chunks):
                    web = chunk.get("web", {})
                    uri = web.get("uri")
                    title = web.get("title", f"Result {idx + 1}")
                    if uri:
                        source = urllib.parse.urlparse(uri).netloc
                        results.append({
                            "title": title,
                            "url": uri,
                            "snippet": title,
                            "source": source
                        })
                
                if not results and candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")
                        results.append({
                            "title": "Google Search Summary",
                            "url": "https://google.com",
                            "snippet": text,
                            "source": "google.com"
                        })
                
                return {
                    "query": query,
                    "results": results
                }
        except Exception as e:
            logger.error(f"Gemini search grounding fallback failed: {str(e)}")
            raise RuntimeError(f"Web search tool failed: {str(e)}")

    url = "https://api.tavily.com/search"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "api_key": api_key,
        "query": query,
        "include_answer": False,
        "max_results": 5
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            
            results = []
            for item in res_data.get("results", []):
                url = item.get("url", "")
                source = urllib.parse.urlparse(url).netloc if url else "Unknown"
                results.append({
                    "title": item.get("title", ""),
                    "url": url,
                    "snippet": item.get("content", ""),
                    "source": source
                })
            
            return {
                "query": query,
                "results": results
            }
    except Exception as e:
        logger.error(f"Tavily API call failed: {str(e)}")
        raise RuntimeError(f"Tavily search tool failed: {str(e)}")
