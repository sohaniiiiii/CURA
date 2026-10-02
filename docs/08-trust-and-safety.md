# Trust & Safety Pipeline — Design

## Overview

The trust and safety pipeline runs after Groq generates a response (Stage 5 in the Python service). It produces four outputs that are returned to the frontend: `confidence`, `explanation`, `hallucination_flag`, and `is_emergency`.

```
Groq response
    │
    ├──► Confidence Estimation
    ├──► Hallucination Verification
    ├──► XAI / Explanation Extraction
    └──► Emergency Risk Detection (also runs pre-retrieval)

    → Final response JSON
```

---

## 1. Confidence Estimation

**Input:**
- `retrieved_chunks`: list of `{text, score}` from ChromaDB
- `response_text`: generated response from Groq
- `hallucination_penalty`: fraction of unsupported sentences (from hallucination check)
- `is_emergency`: bool
- `retrieval_coverage_ratio`: fraction of retrieved chunks above relevance threshold

**Processing:**

```python
def compute_confidence(
    retrieved_chunks,
    response_text,
    hallucination_penalty,
    is_emergency,
    retrieval_coverage_ratio
) -> float:

    # Signal 1: mean cosine similarity of retrieved chunks to query
    mean_retrieval_sim = mean([c["score"] for c in retrieved_chunks])

    # Signal 2: semantic similarity between response and top-3 chunks
    response_emb = embedder.encode(response_text)
    chunk_embs = embedder.encode([c["text"] for c in retrieved_chunks[:3]])
    answer_evidence_sim = float(cos_sim(response_emb, chunk_embs).max())

    # Signal 3: hallucination penalty (already computed)
    # Signal 4: retrieval coverage (already computed)

    # Signal 5: emergency uncertainty penalty
    emergency_uncertainty = 1.0 if (is_emergency and retrieval_coverage_ratio < 0.5) else 0.0

    confidence = (
        0.35 * mean_retrieval_sim
      + 0.30 * answer_evidence_sim
      + 0.20 * (1.0 - hallucination_penalty)
      + 0.10 * retrieval_coverage_ratio
      + 0.05 * (1.0 - emergency_uncertainty)
    )

    return round(min(max(confidence, 0.0), 1.0), 2)
```

**Output:** `confidence: float` (0.0–1.0)

**Frontend representation:**

```
ConfidenceBadge component:
  ≥ 0.75  →  🟢  "High confidence"
  0.50–0.74 →  🟡  "Moderate confidence"
  < 0.50  →  🔴  "Low confidence — verify with a healthcare provider"
```

---

## 2. Hallucination Verification

**Input:**
- `response_text`: Groq response
- `retrieved_chunks`: list of `{text, score}`

**Processing:**

```python
def verify_hallucination(response_text, retrieved_chunks) -> tuple[bool, float]:
    sentences = [s.strip() for s in response_text.split(".") if len(s.strip()) > 20]
    if not sentences:
        return False, 0.0

    sentence_embs = embedder.encode(sentences)
    chunk_embs = embedder.encode([c["text"] for c in retrieved_chunks])

    unsupported = 0
    for sent_emb in sentence_embs:
        max_sim = float(cos_sim(sent_emb, chunk_embs).max())
        if max_sim < 0.40:
            unsupported += 1

    penalty = unsupported / len(sentences)
    flag = penalty > 0.20  # more than 20% of sentences unsupported
    return flag, penalty
```

**Output:**
- `hallucination_flag: bool`
- `hallucination_penalty: float` (used internally by confidence computation)

**Frontend representation:**

```
HallucinationWarning component (shown only if hallucination_flag=True):
  Yellow inline warning in bot message footer:
  ⚠️ "This response contains claims not found in retrieved sources.
      Please verify with a healthcare professional."
```

---

## 3. Explainable AI (XAI) — Chain-of-Thought

**Input:**
- The Groq prompt includes chain-of-thought instruction in the system message

**System prompt addition:**
```
Before giving your answer, briefly reason step by step:
Reasoning: [your step-by-step thinking]
Answer: [your final medical response]
```

**Processing:**

```python
def extract_explanation(raw_response: str) -> tuple[str, str]:
    """Split Groq output into reasoning and final answer."""
    if "Answer:" in raw_response:
        parts = raw_response.split("Answer:", 1)
        explanation = parts[0].replace("Reasoning:", "").strip()
        answer = parts[1].strip()
    else:
        explanation = ""
        answer = raw_response.strip()
    return explanation, answer
```

**Output:**
- `explanation: str` — the chain-of-thought reasoning
- `reply: str` — the clean final answer (without the reasoning prefix)

**Frontend representation:**

```
ExplanationPanel component (collapsible, below each bot message):
  "Why this answer? ▼"
  [Expanded: chain-of-thought reasoning text]
```

---

## 4. Emergency Risk Detection

**Input:** Original user query (before translation), optionally also the generated response

**Processing — two stages:**

### Stage A — Fast keyword match (runs before retrieval)

```python
EMERGENCY_KEYWORDS = [
    "chest pain", "can't breathe", "cannot breathe", "stroke", "seizure",
    "overdose", "unconscious", "unresponsive", "severe bleeding", "heart attack",
    "anaphylaxis", "allergic reaction severe", "suicide", "suicidal",
    "self harm", "not breathing", "difficulty breathing", "choking"
]

def keyword_emergency_check(query: str) -> bool:
    query_lower = query.lower()
    return any(kw in query_lower for kw in EMERGENCY_KEYWORDS)
```

### Stage B — LLM classifier (only if keyword match hits)

If keyword match returns True, send a fast binary classification to Groq:

```python
def llm_emergency_classify(query: str) -> bool:
    response = groq_client.chat.completions.create(
        model="llama3-8b-8192",  # use fast small model for classification
        messages=[
            {
                "role": "system",
                "content": "You are a medical triage assistant. Answer only YES or NO."
            },
            {
                "role": "user",
                "content": f"Does this describe a medical emergency requiring immediate attention?\n\n{query}"
            }
        ],
        max_tokens=5,
        temperature=0.0
    )
    answer = response.choices[0].message.content.strip().upper()
    return answer.startswith("YES")
```

**Output:**
- `is_emergency: bool`
- `alert_message: str | None`

```python
if is_emergency:
    alert_message = (
        "⚠️ MEDICAL EMERGENCY DETECTED — "
        "Please call emergency services (911 / 112 / local emergency number) immediately. "
        "Do not wait for AI guidance in an emergency."
    )
```

**Frontend representation:**

```
EmergencyBanner component (full-width red banner, shown above the response):
  ┌─────────────────────────────────────────────────────┐
  │ ⚠️  MEDICAL EMERGENCY DETECTED                      │
  │ Call 911 or your local emergency number immediately. │
  │ Do not rely on AI in a medical emergency.           │
  └─────────────────────────────────────────────────────┘
```

The emergency banner renders **above** the response text, is dismissable, and uses high-contrast red/white styling.

---

## Pipeline Execution Order

```
User query arrives
    │
    ├── Stage 1: Language detection + translation
    │
    ├── Stage 2: Emergency keyword check  ← fast, no LLM
    │       │
    │       ├── if match: LLM classify  ← small fast model
    │       │       │
    │       │       └── set is_emergency, alert_message
    │       │
    │       └── if no match: is_emergency = False
    │
    ├── Stage 3: RAG retrieval
    │
    ├── Stage 4: Groq generation (main LLM)
    │
    ├── Stage 5: Trust & Safety (all run after Groq)
    │       ├── extract_explanation()
    │       ├── verify_hallucination()
    │       └── compute_confidence()
    │
    ├── Stage 6: Translate response if needed
    │
    └── Stage 7: Assemble final response JSON
```

## Final Response JSON

```json
{
  "reply": "Your cleaned medical response...",
  "confidence": 0.83,
  "explanation": "Step 1: The user described symptoms consistent with... Step 2: Evidence from MedlinePlus indicates...",
  "evidence": [
    { "source": "MedlinePlus", "title": "Hypertension", "excerpt": "...", "relevance_score": 0.89 }
  ],
  "is_emergency": false,
  "alert_message": null,
  "language": "en",
  "hallucination_flag": false,
  "sources": ["MedlinePlus", "WHO Hypertension Guidelines"]
}
```
