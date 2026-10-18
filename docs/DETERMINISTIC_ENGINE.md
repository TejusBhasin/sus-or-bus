# Sus or Bus — Deterministic Scan Engine

## What it is

The scan engine is entirely **AI-free**: no LLMs, no AI APIs, no runtime
prompt generation. Every verdict, finding, explanation, recommendation and
error message is produced by:

1. a **central knowledge base** of finding definitions, messages, scoring
   parameters and domain datasets, and
2. a **deterministic rule engine** that evaluates observations collected
   from the input, and renders every result through validated templates.

The system works offline; all data is bundled in the repository.

## Architecture

```
base44/shared/
  knowledgeBase.ts   the single source of truth:
                     - FINDING_DEFS  (~50 stable finding IDs: severity,
                       category, title/description templates, recommendations)
                     - ERRORS / STATUS_MESSAGES (stable message IDs)
                     - SCORING model (documented weights, caps, threshold)
                     - SERVICES (known domain/service database, ~48 records)
                     - BRANDS (impersonation reference list)
                     - POLICY_RULES / TEXT_RULES / CODE_RULES (declarative
                       regex datasets, incl. negation handling)
                     - renderTemplate() — the deterministic template renderer
                     - hostMatchesDomain() — boundary-safe domain matching
  collectors.ts      observation extraction only (no scoring, no text):
                     HTML page observations, policy link discovery,
                     policy text extraction + negation-aware clause matching,
                     text/email link parsing
  ruleEngine.ts      rules: observations -> { ruleId, findingId, vars }
                     matches; buildReport() dedupes, resolves definitions
                     from the knowledge base, renders text, scores
  urlSafety.ts       SSRF guard + safe fetching (validated manual redirects,
                     timeouts, byte caps); error text from the catalog
  engineTests.ts     self-test suite + knowledge-base validation

base44/functions/
  analyzeContent/    scan orchestration (cache, VIPAuth, fetch, rules, save)
  findAlternatives/  built-in catalog of reputable alternatives
  runEngineTests/    runs engineTests.runEngineTests() — the diagnostic endpoint
```

## Scoring model (v1.0.0)

- Score starts at **85**.
- Each **bad** finding: −18 (at most 3 counted)
- Each **warning** finding: −7 (at most 5 counted)
- Each **good** finding: +2 (at most 4 counted)
- Clamped to 0–100. **60 or above = BUS**, below = SUS.
- Findings are deduplicated by finding ID so one underlying issue is never
  penalized twice. Same observations + same knowledge-base version always
  produce the same score.

## Rule format

Rules emit `{ ruleId, findingId, vars }`. A finding is only emitted when its
rule actually matched, and every `findingId` must resolve to a definition in
the knowledge base — unknown IDs throw loudly instead of shipping broken
text. The template renderer throws on missing variables.

To add coverage: add a record to `knowledgeBase.ts` (finding definition +
rule if needed), add a test in `engineTests.ts`, and bump `KB_VERSION`.

## Domain matching

Hostnames are parsed and matched with suffix rules (`host === domain` or
`host ends with "." + domain`). A deceptive host like
`notgoogle-analytics.com.evil.io` does **not** match `google-analytics.com`.
Brand lookalikes require the brand token to **start** a hostname label
(`paypal-secure-login.top` matches; `notpaypal.com` does not).

## Validation and tests

Invoke the `runEngineTests` backend function (from the dashboard function
tester). It runs:

- knowledge-base validation: unique IDs, valid severities/categories,
  referential integrity of every rule, complete records;
- rule tests: legitimate site, phishing-shaped page, tracker
  classification incl. false-positive cases, brand matching, policy
  negation ("we do not sell" is a denial, not an admission), template
  rendering, deduplication, deterministic scoring, verdict thresholds.

It returns `{ total, passed, failed, failures, validation }` and a 500
status when anything fails.

## Known limitations (honest, by design)

- Static analysis only: the scanner never executes a target's JavaScript,
  so behavior only visible at runtime is out of scope.
- No DNS resolution in the runtime: hostnames are validated by name and
  IP-literal form; a private address behind DNS cannot be caught by a
  lookup. Redirects are still re-validated on every hop.
- Binary documents (PDF, images, office files) cannot be read without an
  AI reader; they are reported as **unverified**, never guessed about.
- No finite database covers every threat: absence of a match is never
  treated as proof of safety, and every finding states what it does not
  prove.
- Policy analysis is keyword-level and negation-aware, but it is not legal
  advice; ambiguous wording is reported as such.