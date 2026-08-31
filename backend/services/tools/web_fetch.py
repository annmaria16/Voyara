import urllib.request
import urllib.error
import re
import logging
from pydantic import BaseModel, Field
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.web_fetch")

class WebFetchInput(BaseModel):
    url: str = Field(..., description="The URL of the webpage to fetch content from.")

def clean_html(html_content: str) -> str:
    # Strip script and style blocks
    html_content = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', ' ', html_content, flags=re.I)
    html_content = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', ' ', html_content, flags=re.I)
    # Strip all remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', html_content)
    # Normalize spacing
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:2000]

@register_tool(
    name="web_fetch",
    description="Fetch text content from a specific URL, cleaning all HTML tags, script, and style blocks.",
    input_schema=WebFetchInput,
    risk_level="LOW",
    requires_auth=False
)
def execute_web_fetch(url: str) -> dict:
    if not (url.startswith("http://") or url.startswith("https://")):
        return {
            "success": False,
            "url": url,
            "error": "Invalid URL scheme. Only http and https are supported."
        }

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VeriNovaAgent/1.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            content_type = response.headers.get("Content-Type", "")
            if "text/html" not in content_type and "text/plain" not in content_type:
                return {
                    "success": False,
                    "url": url,
                    "error": f"Unsupported content type: {content_type}. Only HTML and plain text are supported."
                }
            
            raw_data = response.read()
            html_text = raw_data.decode("utf-8", errors="ignore")
            cleaned_text = clean_html(html_text)
            
            return {
                "success": True,
                "url": url,
                "text": cleaned_text
            }
            
    except Exception as e:
        logger.error(f"Error fetching url {url}: {str(e)}")
        return {
            "success": False,
            "url": url,
            "error": f"Fetch failed: {str(e)}"
        }
