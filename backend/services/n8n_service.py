import os
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger("verinova.n8n_service")

class N8NService:
    @staticmethod
    def call_webhook(payload: dict) -> dict:
        url = os.getenv("N8N_WEBHOOK_URL", "").strip()
        if not url:
            raise ValueError("N8N_WEBHOOK_URL is not configured.")

        timeout_str = os.getenv("N8N_TIMEOUT", "10").strip()
        try:
            timeout = float(timeout_str)
        except ValueError:
            timeout = 10.0

        headers = {
            "Content-Type": "application/json"
        }
        
        n8n_api_key = os.getenv("N8N_API_KEY", "").strip()
        if n8n_api_key:
            headers["X-N8N-API-KEY"] = n8n_api_key

        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")

        try:
            logger.info(f"Calling n8n webhook at {url} with timeout={timeout}")
            with urllib.request.urlopen(req, timeout=timeout) as response:
                res_data = response.read().decode("utf-8")
                if not res_data:
                    raise ValueError("n8n webhook returned empty response.")
                
                res_json = json.loads(res_data)
                return res_json
        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
            except Exception:
                pass
            logger.error(f"n8n webhook HTTP error {e.code}: {error_body}")
            raise Exception(f"n8n HTTP {e.code}: {error_body}")
        except urllib.error.URLError as e:
            logger.error(f"n8n webhook URL/network error: {str(e)}")
            raise Exception(f"n8n network error: {str(e)}")
        except Exception as e:
            logger.error(f"n8n webhook error: {str(e)}")
            raise Exception(f"n8n service error: {str(e)}")
