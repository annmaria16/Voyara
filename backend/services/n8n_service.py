import os
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger("verinova.n8n_service")

class N8NTimeoutError(Exception):
    pass

class N8NError(Exception):
    pass

class N8NService:
    @staticmethod
    def get_webhook_url(tool_name: str) -> Optional[str]:
        from typing import Optional
        base_url = os.getenv("N8N_BASE_URL", "").strip()
        if not base_url:
            return os.getenv("N8N_WEBHOOK_URL", "").strip() or None
            
        base_url = base_url.rstrip("/")
        
        # Mappings: shopping_search, product_comparison, web_research, verification, booking
        mappings = {
            "search_products": "shopping_search",
            "compare_shopping_offers": "shopping_search",
            "compare_products": "product_comparison",
            "web_search": "web_research",
            "execute_booking": "booking",
            "book_property": "booking",
            "verify_product_details": "verification",
            "verify_claim": "verification"
        }
        
        path = mappings.get(tool_name, "general_task")
        return f"{base_url}/webhook/{path}"

    @staticmethod
    def call_webhook(payload: dict, tool_name: str = None) -> dict:
        import time
        
        request_id = payload.get("request_id", "unknown")
        
        url = None
        if tool_name:
            url = N8NService.get_webhook_url(tool_name)
        if not url:
            url = os.getenv("N8N_WEBHOOK_URL", "").strip()
            
        if not url:
            raise N8NError("Neither N8N_BASE_URL nor N8N_WEBHOOK_URL is configured.")

        # Default to 60 seconds for n8n webhook requests to prevent early timeouts
        timeout_str = os.getenv("N8N_TIMEOUT", "60").strip()
        try:
            timeout = float(timeout_str)
        except ValueError:
            timeout = 60.0

        headers = {
            "Content-Type": "application/json"
        }
        
        n8n_api_key = os.getenv("N8N_API_KEY", "").strip()
        if n8n_api_key:
            headers["X-N8N-API-KEY"] = n8n_api_key
            
        webhook_secret = os.getenv("N8N_WEBHOOK_SECRET", "").strip()
        if webhook_secret:
            headers["X-Webhook-Secret"] = webhook_secret

        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")

        start_time = time.time()
        workflow_name = tool_name or url.split("/")[-1]
        
        logger.info(f"[VERINOVA] request_id={request_id} n8n_request_started")
        logger.info(f"n8n workflow='{workflow_name}' request started")

        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                res_data_bytes = response.read()
                res_data = res_data_bytes.decode("utf-8")
                duration = int((time.time() - start_time) * 1000)
                body_size = len(res_data_bytes)
                
                logger.info(f"[VERINOVA] request_id={request_id} n8n_response_received")
                logger.info(f"n8n workflow='{workflow_name}' response status={response.status} duration={duration}ms body_size={body_size} bytes")
                
                if not res_data:
                    raise N8NError("n8n webhook returned empty response.")
                
                res_json = json.loads(res_data)
                return res_json
        except urllib.error.HTTPError as e:
            duration = int((time.time() - start_time) * 1000)
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
            except Exception:
                pass
            logger.error(f"n8n webhook '{workflow_name}' HTTP error {e.code} after {duration}ms: {error_body}")
            raise N8NError(f"n8n HTTP {e.code}: {error_body}")
        except (urllib.error.URLError, TimeoutError) as e:
            duration = int((time.time() - start_time) * 1000)
            err_msg = str(e)
            is_timeout = "timed out" in err_msg.lower() or (hasattr(e, "reason") and "timed out" in str(e.reason).lower())
            if is_timeout:
                logger.error(f"n8n webhook '{workflow_name}' timed out after {duration}ms: {err_msg}")
                raise N8NTimeoutError(f"n8n webhook '{workflow_name}' request timed out: {err_msg}")
            else:
                logger.error(f"n8n webhook '{workflow_name}' network/URL error after {duration}ms: {err_msg}")
                raise N8NError(f"n8n webhook '{workflow_name}' network error: {err_msg}")
        except Exception as e:
            logger.error(f"n8n webhook '{workflow_name}' error: {str(e)}")
            raise N8NError(f"n8n service error: {str(e)}")
