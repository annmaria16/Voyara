# VeriNova - An Outcome Verification Platform

VeriNova is an AI-powered outcome verification and research workspace designed to plan, execute, and verify dynamic task requirements with factual accuracy.

---

## 1. System Architecture

```
USER
  ↓
VERINOVA REACT UI
  ↓
FASTAPI BACKEND
  ↓
VERINOVA AGENT ORCHESTRATOR
  ↓
GEMINI (REASONING & PLANNING)
  ↓
TOOL / WORKFLOW ROUTER
  ↓
N8N WEBHOOKS
  ↓
SEARCH / SHOPPING / RESEARCH / BOOKING / VERIFICATION
  ↓
STRUCTURED REAL DATA
  ↓
VALIDATION + NORMALIZATION
  ↓
GEMINI FINAL ANALYSIS
  ↓
VERINOVA RESULT -> UI
```

---

## 2. Component Details

### A. Frontend (React)
- Centered conversational workspace with responsive mesh gradient overlays and inline plan/execution steps indicators.
- Synchronous click locks and button disablers to prevent duplicate planning requests.

### B. FastAPI Backend
- Orchestrates plan cycles, registers tools, tracks execution states, and normalizes external output schemas.

### C. AI Provider & Gemini
- Cloud AI provider abstraction (`GeminiProvider`) dynamically routing tasks.
- Maximum 2 retries on 429 and 5xx errors with capped exponential backoff.
- Fail-fast mechanism avoiding long sleeping threads.

### D. Agent Orchestrator
- Life-cycle steps: `RECEIVED` -> `UNDERSTANDING` -> `PLANNED` -> `EXECUTING` -> `VALIDATING` -> `ANALYZING` -> `COMPLETED`.
- Multi-agent state locks and action idempotency checks.

### E. n8n Integration & Webhook Workflows
Dynamic routing to local or external n8n workflows:
- **`shopping_search`**: Extract price, specifications, and model availability.
- **`product_comparison`**: Compare specifications and output normalized results.
- **`web_research`**: Execute Tavily/Google Search grounding and aggregate source links.
- **`verification`**: Factual verification of specific requirements.
- **`booking`**: Search and booking options with explicit user confirmation.

---

## 3. Configuration & Environment Variables

Create a `.env` file in the `backend/` folder:

```ini
SECRET_KEY=your_secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000

AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.5-flash

N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=your_webhook_secret
```

---

## 4. How to Start the Services

### Start Backend (FastAPI)
```powershell
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Start Frontend (Vite)
```powershell
cd frontend
npm install
npm run dev
```

### Start n8n
```bash
n8n start
```

---

## 5. Verification & Tests

To execute the backend suite:
```powershell
cd backend
python run_all_tests.py
```

### Known Limitations
- High-risk operations (e.g. email draft dispatch, financial transactions) are simulated or require direct explicit confirmation.
- API limits on the Gemini Free Tier model (20 daily calls) can restrict massive sequential loops.
