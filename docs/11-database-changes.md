# Database Changes — MongoDB Schema Updates

## Current State

The existing schema is solid and does not need to be replaced. It needs to be **extended** with new fields to store the enriched response data produced by the CURA-X pipeline.

---

## Current `Chat` Model Message Subdocument

```javascript
// project/models/Chat.js (current)
messages: [{
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}]
```

---

## Target `Chat` Model Message Subdocument

```javascript
// project/models/Chat.js (target — add new fields to message subdocument)
messages: [{
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },

  // --- NEW FIELDS ---
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  language: {
    type: String,
    default: 'en'
  },
  is_emergency: {
    type: Boolean,
    default: false
  },
  alert_message: {
    type: String,
    default: null
  },
  hallucination_flag: {
    type: Boolean,
    default: false
  },
  explanation: {
    type: String,
    default: null
  },
  evidence: [{
    source: { type: String },
    title: { type: String },
    excerpt: { type: String },
    relevance_score: { type: Number, min: 0, max: 1 },
    url: { type: String, default: null }
  }]
}]
```

---

## Existing Fields That Remain Unchanged

| Field | Status |
|---|---|
| `userId` | Unchanged |
| `sessionId` | Unchanged |
| `title` | Unchanged |
| `isActive` | Unchanged |
| `createdAt` / `updatedAt` | Unchanged (Mongoose timestamps) |
| `messages[].role` | Unchanged |
| `messages[].content` | Unchanged |
| `messages[].timestamp` | Unchanged |

---

## New `KnowledgeSource` Collection (Optional)

Track which documents have been ingested into the RAG vector store. Not required for the system to work — useful for admin/management.

```javascript
// project/models/KnowledgeSource.js (new, optional)
const knowledgeSourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  source_url: { type: String },
  source_type: {
    type: String,
    enum: ['medlineplus', 'guideline', 'pubmed', 'statpearls', 'other'],
    required: true
  },
  ingested_at: { type: Date, default: Date.now },
  chunk_count: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'pending', 'stale'],
    default: 'active'
  }
}, { timestamps: true })
```

---

## How Node Backend Saves the Enriched Message

After the Python AI service returns the full response, the Node `server.js` (or new `routes/chat.js`) saves the enriched assistant message to MongoDB before returning the response to the frontend:

```javascript
// pseudocode — in server.js or new route
const aiResponse = await axios.post('http://localhost:8000/chat', requestBody)
const data = aiResponse.data

// Save assistant message with all new fields
await Chat.findOneAndUpdate(
  { sessionId, userId },
  {
    $push: {
      messages: {
        role: 'assistant',
        content: data.reply,
        confidence: data.confidence,
        language: data.language,
        is_emergency: data.is_emergency,
        alert_message: data.alert_message,
        hallucination_flag: data.hallucination_flag,
        explanation: data.explanation,
        evidence: data.evidence || []
      }
    }
  }
)
```

---

## Backward Compatibility

All new message fields have `default: null` or `default: false`. Existing chat messages in the database that were saved before the migration will not have these fields — Mongoose will return `null`/`false`/`[]` for them, which is safe for the frontend to handle.

---

## Indexes — No Changes Needed

Existing indexes are sufficient:
- `{ userId: 1, createdAt: -1 }` on Chat — covers listing chats per user
- `{ sessionId: 1 }` on Chat — covers fetching a specific session
- `{ username: 1 }`, `{ email: 1 }` on User — cover auth lookups

No new indexes are required for the new message fields.

---

## Summary Table

| Field | Collection | Type | New? |
|---|---|---|---|
| `messages[].role` | Chat | String | No |
| `messages[].content` | Chat | String | No |
| `messages[].timestamp` | Chat | Date | No |
| `messages[].confidence` | Chat | Number | **Yes** |
| `messages[].language` | Chat | String | **Yes** |
| `messages[].is_emergency` | Chat | Boolean | **Yes** |
| `messages[].alert_message` | Chat | String | **Yes** |
| `messages[].hallucination_flag` | Chat | Boolean | **Yes** |
| `messages[].explanation` | Chat | String | **Yes** |
| `messages[].evidence[]` | Chat | Array | **Yes** |
| `KnowledgeSource` | New collection | Document | **Yes (optional)** |
