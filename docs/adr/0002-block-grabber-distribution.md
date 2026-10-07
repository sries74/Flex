# 0002 — Block Grabber: sideload-only, opt-in
**Status:** Accepted as default (decision D1; revisit if owner decides otherwise)

**Context:** Auto-accepting blocks via AccessibilityService likely violates Amazon Flex terms (account deactivation risk for users) and Google Play's AccessibilityService policy.

**Decision:** Block Grabber ships only in a `sideload` build variant (`FLEX_VARIANT=sideload`), distributed as a signed APK from `flexcop.ackgent.com` with checksum and a risk-disclosure/consent screen. Store builds exclude the module; CI asserts the store manifest has no AccessibilityService. Includes remote kill-switch and daily accept cap.

**Consequences:** Store release is independent of this feature; extra build profile; legal exposure reviewed quarterly; feature may be retired.
