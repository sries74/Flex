# 0004 — OCR: Gemini Vision with on-device fallback
**Status:** Accepted as default (decision D3)

**Decision:** `OcrProvider` interface. Primary: Gemini Vision with schema-constrained JSON, called through the API server (key never in the app). Fallback: on-device recognition (ML Kit / Tesseract) for offline and cost control. All output validated with Zod; user edits low-confidence fields.

**Privacy:** Itinerary images contain customer addresses (PII). Images are processed in memory, not retained server-side; fixtures are synthetic/redacted; disclosed in the privacy policy.

**Consequences:** Accuracy gates in CI (`eval:ocr`); per-user rate limits and budget alerts.
