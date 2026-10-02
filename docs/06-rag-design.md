# RAG Design — Precision Medical Knowledge Retrieval

## Current State

**RAG does not exist in the current codebase.**

There is no:
- Knowledge base
- Vector store
- Embedding model
- Retrieval logic
- Document chunking

Everything in this document must be built from scratch.

## Knowledge Sources

Recommended sources for the project (open access, no commercial licensing issues):

| Source | Content | Format | Priority |
|---|---|---|---|
| **MedlinePlus (NIH)** | Patient-facing medical articles, conditions, medications | JSON API | High — use first |
| **StatPearls (NCBI)** | Clinical reference articles | Free text download | High |
| **WHO Guidelines** | International clinical guidelines | PDF/HTML | Medium |
| **PubMed Abstracts** | Research paper abstracts | XML via API (free key) | Medium |
| **OpenMedQA datasets** | Medical QA pairs from board exams | JSON | Medium |
| **DrugBank Open Data** | Drug information, interactions | CSV | Low |

**For initial implementation:** Start with MedlinePlus (structured JSON, easy to parse) + a curated set of 20–30 clinical guideline PDFs covering common conditions.

## Directory Structure

```
project/rag/
├── data/                    # Raw source documents
│   ├── medlineplus/         # Downloaded MedlinePlus articles
│   ├── guidelines/          # PDF/text clinical guidelines
│   └── medqa/               # OpenMedQA dataset files
├── chroma_db/               # Persisted ChromaDB vector store (gitignored)
├── ingest.py                # One-time ingestion script
├── embedder.py              # Embedding model wrapper
├── retriever.py             # Query ChromaDB, return top-k chunks
├── verifier.py              # Hallucination verification
├── translator.py            # Language detection + translation
└── emergency_detector.py    # Emergency keyword + LLM classification
```

## Chunking Strategy

```
Chunk size:       512 tokens
Overlap:          128 tokens
Chunker:          RecursiveCharacterTextSplitter
  separators:     ["\n\n", "\n", ". ", " "]
```

Each chunk carries metadata:
```python
{
  "source": "MedlinePlus",
  "title": "Type 2 Diabetes",
  "url": "https://medlineplus.gov/...",
  "date_ingested": "2025-01-15",
  "chunk_id": "medlineplus_diabetes_3"
}
```

## Embedding Model

**Primary:** `sentence-transformers/all-MiniLM-L6-v2`
- Size: ~80 MB
- Dimension: 384
- Fast on CPU (~50ms per query embed)
- Good general + medical performance

**Upgrade path:** `pritamdeka/S-PubMedBert-MS-MARCO`
- Trained on PubMed text
- Better for clinical/biomedical queries
- Larger and slower

The embedding model is loaded **once at FastAPI startup** and reused for all requests.

## Vector Store — ChromaDB

```python
import chromadb

client = chromadb.PersistentClient(path="./rag/chroma_db")
collection = client.get_or_create_collection(
    name="medical_knowledge",
    metadata={"hnsw:space": "cosine"}
)
```

ChromaDB stores:
- Chunk text
- Embeddings (384-dim vectors)
- Metadata (source, title, url, chunk_id)

## Retrieval Pipeline

### Step 1 — Embed Query

```python
query_embedding = embedder.encode(normalized_query)
```

### Step 2 — Vector Search (top-10)

```python
results = collection.query(
    query_embeddings=[query_embedding.tolist()],
    n_results=10,
    include=["documents", "metadatas", "distances"]
)
```

### Step 3 — Reranking (top-5)

Use cross-encoder `cross-encoder/ms-marco-MiniLM-L-6-v2` to rerank the top-10 by relevance to the query. Return top-5.

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
pairs = [(normalized_query, chunk["text"]) for chunk in top_10]
scores = reranker.predict(pairs)
top_5 = sorted(zip(scores, top_10), reverse=True)[:5]
```

### Step 4 — Threshold Filter

Discard any chunk with cosine similarity < 0.35 (too irrelevant to be useful).

### Output

```python
[
  {
    "text": "Chunk content...",
    "source": "MedlinePlus",
    "title": "Hypertension",
    "url": "https://...",
    "score": 0.87
  },
  ...  # up to 5 chunks
]
```

## Groq Prompt Construction

Retrieved chunks are injected as a context block:

```
SYSTEM:
You are CURA-X, a trustworthy AI medical assistant. 
Your answers must be grounded in the provided medical evidence.
If the evidence does not fully support an answer, say so clearly.
Before answering, briefly reason step by step (chain-of-thought).
Never fabricate medical facts. Always recommend professional consultation.

CONTEXT (retrieved medical knowledge):
[1] {chunk_1_text}
    Source: {source_1} — {title_1}

[2] {chunk_2_text}
    Source: {source_2} — {title_2}

[3] {chunk_3_text}
    Source: {source_3} — {title_3}

USER:
{normalized_query}
```

## Returning Evidence to Frontend

The API response includes an `evidence[]` array:

```json
"evidence": [
  {
    "source": "MedlinePlus",
    "title": "Type 2 Diabetes",
    "excerpt": "Type 2 diabetes is a chronic condition that affects the way the body processes blood sugar...",
    "relevance_score": 0.89,
    "url": "https://medlineplus.gov/diabetes.html"
  }
]
```

The frontend renders this in a collapsible `EvidenceAccordion` component below each bot response.

## Ingestion Script (`rag/ingest.py`)

Run once (and re-run when knowledge base is updated):

```
1. Load source documents from rag/data/
2. Parse each document (JSON parser for MedlinePlus, PDF parser for guidelines)
3. Chunk with RecursiveCharacterTextSplitter
4. Embed each chunk with sentence-transformers
5. Upsert into ChromaDB with metadata
6. Print: total chunks ingested, time taken
```

## Performance Estimates

| Step | Estimated time |
|---|---|
| Query embedding | ~20–50ms |
| ChromaDB vector search (10k chunks) | ~10–30ms |
| Reranking top-10 | ~50–100ms |
| Total retrieval stage | ~100–200ms |

Total retrieval adds ~100–200ms to each request. Well within acceptable latency.

## Knowledge Base Size Estimates

| Source | Articles | Chunks (estimated) |
|---|---|---|
| MedlinePlus (1000 articles) | 1,000 | ~8,000 |
| Clinical guidelines (30 PDFs) | 30 | ~3,000 |
| StatPearls (500 articles) | 500 | ~5,000 |
| **Total** | ~1,530 | ~16,000 |

16,000 chunks × 384 dimensions = ~24 MB of vector data. ChromaDB handles this trivially on local disk.
