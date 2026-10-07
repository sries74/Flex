# 06 — Reddit Workflow

The source spec has no Reddit section; this is a proposed workflow (assumption A1: Reddit is used for **market research, beta recruitment, feedback intake and launch**). Decision D5: **owner's personal Reddit account** (no brand/alt accounts).

## 1. Principles

1. **Human posts; agents draft.** The Community agent never posts, comments, votes or DMs. API use is read-only.
2. **Disclose.** Every post by the owner states "I'm the developer of FlexCompanion."
3. **Rules first.** Each subreddit's rules are checked and recorded before any post; mods are asked for permission when self-promotion is restricted.
4. **No astroturfing**: no alt accounts, no fake testimonials, no vote manipulation, no ban evasion.
5. **Lead with the safe features** (itinerary OCR, label sorting, route optimization). Don't market or request users for the Block Grabber in communities where automation is against the rules; Block Grabber info lives on the sideload landing page with its risk disclosure (R1).
6. **Give before asking.** Contribute genuinely useful content (tips, free tool, answers) before any announcement.
7. **No scraping of personal data**; don't store usernames/content beyond what's needed for triage; comply with Reddit's Data API Terms (verify current terms, rate limits, and any commercial-use requirements before building tooling).

## 2. Target communities (verify each at T-950)

| Community type | Examples to evaluate | Use |
|---|---|---|
| Flex/gig driver subs | r/AmazonFlexDrivers, r/Flexdrivers (check existence/size), r/couriersofreddit, r/DeliveryDrivers | Research, beta, feedback |
| Indie/dev subs | r/SideProject, r/reactnative, r/expo, r/androiddev, r/AppIdeas | Build-in-public, technical feedback |
| Tool/productivity | r/androidapps, r/iosapps (if rules allow) | Launch |

`community/reddit-rules-matrix.md` columns: sub · subscribers · self-promo rule · flair required · link/screenshot rules · automation/bot rules · mod contact · permission obtained (date) · allowed post types.

## 3. Roles

| Role | Who | Does |
|---|---|---|
| Community agent | Claude | Research, rules matrix, drafts, FAQ, sentiment summaries, issue triage drafts |
| Owner | Human | Approves, posts, replies, DMs mods |
| Orchestrator | Claude | Turns feedback into GitHub issues/roadmap |
| Security | Claude | Reviews drafts for PII/legal/ToS claims |

## 4. Stages

### Stage R0 — Setup (T-950)
1. Use the owner's **personal account** (the only account — no alts). Check its age/karma/history against each sub's minimums. Because it's personal: always disclose "I'm the developer" on promo posts, keep promo posts a small share of activity, keep personal/unrelated content out of the project's story, and review post history for anything you wouldn't want tied to the app. Start participating normally ≥ 2–4 weeks before any promo.
2. Register a **read-only** OAuth script app (local `.env`); build `community/tools/` fetch scripts (rate-limited, no PII persisted).
3. Fill rules matrix; flag subs requiring mod pre-approval; draft mod-permission messages (owner sends).
4. Define tone guide + "do not say" list: no earnings claims, no "guaranteed blocks", no implication of Amazon endorsement, no promise of ToS-safe automation.

### Stage R1 — Discovery research (week 1–2)
1. Agent pulls top/hot posts (read-only) on pain points: missing itinerary tools, sorting pain, route order, app complaints.
2. Output `community/research/YYYY-MM.md`: themes, quotes (short, attributed to nothing/anonymized), competing tools, feature requests ranked.
3. Feed into roadmap and Reddit copy. Orchestrator links findings to tasks.

### Stage R2 — Value-first participation (ongoing, owner)
- Weekly: answer questions, share tips. Agent supplies suggested answers from research; owner edits and posts.
- Target ratio: far more helpful non-promotional contributions than promotional ones.

### Stage R3 — Pre-launch teaser (T-955)
1. Content kit (agent drafts, Security reviews, owner approves): problem-statement post, 30–60 s demo GIFs (screenshot→route), FAQ, privacy FAQ ("what happens to my itinerary screenshot?").
2. Waitlist/beta form (Google Form or landing page) — collects email only; consent text; no Flex credentials ever requested.
3. Owner posts where allowed with disclosure and flair; mod permission where needed.

### Stage R4 — Closed beta (T-960)
1. Invite 20–50 testers via TestFlight / Play internal testing links (DM'd by owner).
2. Beta welcome message + feedback channels (in-app "Send feedback", form, a dedicated post/thread).
3. Weekly beta changelog thread (owner posts, agent drafts).

### Stage R5 — Feedback intake loop (T-965)
```
Reddit comment/DM/form ─► (owner pastes or agent reads public thread, read-only)
   ─► Community agent drafts issue (title, repro, device, severity, quote paraphrased)
   ─► label `src:reddit`, `type:bug|feature|question`
   ─► Orchestrator triages within 48 h ─► owner replies with status/thanks
   ─► on release: owner posts "fixed in vX" to original thread
```
Metrics: time-to-first-reply ≤ 24 h, time-to-triage ≤ 48 h, % issues closed with user informed.

### Stage R6 — Public launch (T-970)
1. Choose one primary sub + one dev sub; stagger posts (don't cross-post identical text on one day).
2. Post template: what it is · who it's for · what's free · screenshots · privacy summary · honest limitations · what feedback is wanted · "I'm the developer." Include store links (and **not** the sideload APK unless sub rules and R1 disclosure allow).
3. Owner stays online first 4–6 h to answer; agent prepares replies to FAQ-type questions for owner to post.
4. Day 3 and day 14 follow-ups with changelog.

### Stage R7 — Ongoing (T-980+)
Monthly "what's new" post, quarterly research refresh, crisis protocol (below).

## 5. Draft/approval workflow

1. Agent writes draft to `community/drafts/<sub>-<slug>.md` with front-matter: sub, flair, rule-check ✔, disclosure ✔, claims-check ✔.
2. Security agent checklist: no PII, no unverifiable claims, no ToS-encouraging language.
3. Owner edits → status `approved` → owner posts → records URL + date in `community/log.md`.
4. Removed/mod-warned posts: log, don't repost, don't argue; adjust matrix.

## 6. Crisis protocol

| Event | Action |
|---|---|
| Post removed / warning | Stop posting in that sub; read modmail; update matrix; owner replies politely once |
| Negative thread / bug report storm | Acknowledge within 4 h, link issue, no defensiveness, hotfix plan ([08](08-post-production.md)) |
| Claim that app caused account deactivation | Don't dispute publicly; collect details privately; review Block Grabber exposure; consider kill-switch |
| Privacy concern | Security agent responds with policy facts; verify claim; fix and disclose |
| Amazon/Reddit legal contact | Stop, preserve evidence, escalate to owner immediately |

## 7. KPIs

Waitlist signups · beta activation (imported ≥ 1 itinerary) · D7 retention · feedback items/week · issues closed from Reddit · store rating · post sentiment (manual) · bans/removals (target 0).

## 8. Files

```
community/
├── reddit-playbook.md      # this doc's operational form
├── reddit-rules-matrix.md
├── research/
├── drafts/
├── faq.md
├── tools/                  # read-only fetchers
└── log.md                  # what was posted where, when
```
