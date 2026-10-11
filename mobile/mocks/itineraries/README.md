# Itinerary fixtures

**All data here is synthetic.** Addresses are invented (example street names, `555` style numbers); no real customer names or addresses. Never commit real itinerary screenshots — redact first (see ADR 0004, T-410).

- `*.response.json` — what the OCR provider returns _before_ validation (snake_case, may be messy).
- `*.expected.json` — the normalized `Stop[]` + issues our parser must produce.

These are hand-written, not recorded from the live Gemini API. Re-record real (redacted) responses at T-425.
