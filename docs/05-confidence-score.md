# Confidence Score — Design & Implementation Plan

## Problem

The current system returns `"confidence": 0.9` — a hardcoded constant that is identical for every response regardless of quality, topic, or evidence availability. It is never displayed in the UI. It means nothing.

The target requires a **real, computed, meaningful** confidence score that helps users assess the reliability of each response.

## Principle

> Do NOT ask the LLM to produce or guess a confidence number.
> Compute it from measurable, deterministic signals.

LLMs are poorly calibrated when asked to self-report confidence. They tend to sound confident even when wrong. The score must come from signals that are independent of the model's own output.

## Signals

| Signal | Description | How to Compute | Weight |
|---|---|---|---|
| **Retrieval relevance** | How semantically close are the retrieved chunks to the query? | Mean cosine similarity between query embedding and top-k chunk embeddings | 35% |
| **Answer-evidence overlap** | Does the generated response say things that are actually in the retrieved chunks? | Semantic similarity between response embedding and top-3 chunk embeddings | 30% |
| **Hallucination penalty** | Are there claims in the response not supported by any retrieved chunk? | Fraction of response sentences that are "unsupported" (max chunk sim < 0.40) | 20% |
| **Retrieval coverage** | How many retrieved chunks actually exceeded the relevance threshold? | `count(chunks where score >= 0.45) / k` | 10% |
| **Emergency uncertainty** | Is this an emergency query with low retrieval coverage? | Boolean: if `is_emergency=True` and `retrieval_coverage < 0.5` → apply penalty | 5% |

## Formula

```python
confidence = (
    0.35 * mean_retrieval_similarity        # float 0.0–1.0
  + 0.30 * answer_evidence_similarity       # float 0.0–1.0
  + 0.20 * (1.0 - hallucination_penalty)   # penalty = fraction unsupported
  + 0.10 * retrieval_coverage_ratio         # float 0.0–1.0
  + 0.05 * (1.0 - emergency_uncertainty)   # 0.0 or 1.0 penalty
)
confidence = round(min(max(confidence, 0.0), 1.0), 2)
```

## Implementation Location

All computed in the Python FastAPI service, in Stage 5 (Trust & Safety Pipeline), after:
- Stage 3 (retrieval) has produced similarity scores
- Stage 4 (Groq) has produced the response text
- Hallucination check has run (needed for the hallucination_penalty signal)

Before: final response assembly (Stage 7).

## Computation Details

### Signal 1 — Retrieval Relevance (35%)

```python
# Already computed by ChromaDB during retrieval
mean_retrieval_sim = mean([chunk["score"] for chunk in retrieved_chunks])
```

ChromaDB returns cosine similarity scores. These are the direct input.

### Signal 2 — Answer-Evidence Overlap (30%)

```python
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("all-MiniLM-L6-v2")

response_embedding = model.encode(response_text)
chunk_embeddings = model.encode([c["text"] for c in retrieved_chunks[:3]])

sims = util.cos_sim(response_embedding, chunk_embeddings)
answer_evidence_sim = float(sims.max())
```

### Signal 3 — Hallucination Penalty (20%)

```python
response_sentences = response_text.split(". ")
sentence_embeddings = model.encode(response_sentences)
chunk_embeddings = model.encode([c["text"] for c in retrieved_chunks])

unsupported_count = 0
for sent_emb in sentence_embeddings:
    max_sim = float(util.cos_sim(sent_emb, chunk_embeddings).max())
    if max_sim < 0.40:
        unsupported_count += 1

hallucination_penalty = unsupported_count / len(response_sentences)
hallucination_flag = hallucination_penalty > 0.20
```

### Signal 4 — Retrieval Coverage (10%)

```python
RELEVANCE_THRESHOLD = 0.45
k = len(retrieved_chunks)
relevant_count = sum(1 for c in retrieved_chunks if c["score"] >= RELEVANCE_THRESHOLD)
retrieval_coverage_ratio = relevant_count / k if k > 0 else 0.0
```

### Signal 5 — Emergency Uncertainty (5%)

```python
emergency_uncertainty = 0.0
if is_emergency and retrieval_coverage_ratio < 0.5:
    emergency_uncertainty = 1.0
```

## Frontend Display

The confidence score maps to a colored badge:

| Score | Color | Label |
|---|---|---|
| ≥ 0.75 | Green | High confidence |
| 0.50–0.74 | Yellow | Moderate confidence |
| < 0.50 | Red | Low confidence — verify with healthcare provider |

The badge appears in the footer of every bot message bubble, next to the copy/thumbs buttons.

## What the Score Tells Users

- **High (≥ 0.75):** Strong retrieval match; response closely tracks retrieved evidence; few unsupported claims.
- **Medium (0.50–0.74):** Retrieval found some relevant content but response may include inference beyond the evidence.
- **Low (< 0.50):** Little relevant evidence found; response is largely from model prior knowledge; consult a professional.

## Caveats

- The score is a proxy for reliability, not medical correctness. It measures alignment between the response and retrieved evidence — not whether the evidence itself is correct.
- Always display: *"Confidence reflects evidence alignment, not medical accuracy. Consult a healthcare professional."*
