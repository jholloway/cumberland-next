# Current decisions

This file records current choices that are cross-cutting, surprising, or difficult to reverse. Rule inputs, outputs, and exceptions belong in [rules.md](rules.md), not here. Superseded behavior is removed so a new maintainer can treat this document as current truth; repository history remains available when earlier reasoning is needed.

Add a decision only when its rationale would not be clear from the product, architecture, rule catalog, or tests.

## Keep delivery static and dependency-free

**Decision:** The core application runs entirely in the browser as static HTML, CSS, and JavaScript. It has no framework, build pipeline, backend, database, or production dependency.

**Why:** The product does not need accounts, persistence, integrations, or server-side processing. Static delivery keeps local use, inspection, and hosting simple.

## Keep people in control of each finding

**Decision:** Findings are reviewed one at a time. There is no bulk acceptance. Rules explicitly declare automatic or manual resolution, and every finding can be skipped.

**Why:** The interface should distinguish safe transformations from judgment calls without hiding any content decision from the user.

## Treat each analysis as a fresh review

**Decision:** **Analyze** rebuilds findings from the editor's current text. Previous skips and review states do not persist, and the application does not automatically rescan after every fix.

**Why:** Session-local decisions and user-requested rescanning keep the review sequence predictable and prevent hidden permanent exceptions.

## Preserve unaffected findings after edits

**Decision:** A direct edit shifts later finding positions and revalidates every finding against the live text. Only a finding whose source changed becomes stale. Automatic fixes are disabled for stale findings; manual confirmation remains available.

The page uses the textarea's pre-edit selection when possible so adjacent or identical findings retain their identity. The session refuses an automatic replacement if its target no longer matches.

**Why:** This protects text from stale automatic edits without discarding unrelated review work or interrupting the edit-then-confirm workflow of manual findings.

## Enforce the rule contract at the registry boundary

**Decision:** The registry snapshots enabled rules and rejects invalid rules or findings before overlap selection or rendering. It validates IDs, priorities, detector results, exact source ranges, explanations, capabilities, replacements, and alternate options.

**Why:** Independently authored rules should fail close to their source with a useful error instead of sending unsafe offsets or incomplete behavior into the interface.

## Resolve overlaps by priority, then rule ID

**Decision:** A higher-priority finding suppresses a lower-priority overlapping finding for that scan. Equal-priority overlaps are resolved by rule ID. Accepted findings are then reviewed in document order.

Priority 100 is the default. Priority 200 is used when a broader or safer finding intentionally shields its contents.

**Why:** Two actions must never target the same characters, and the result must be deterministic without coupling rules together.

## Use the script tags as the production rule manifest

**Decision:** Rule script tags in `index.html` are the only production enablement list. `enabled-rules.js` collects those loaded rules, and `src/app.js` consumes the resulting frozen array through the registry.

Script position controls loading, not user review order.

**Why:** Maintaining a duplicate rule list in JavaScript would create an avoidable drift risk in an otherwise explicit static application.

## Keep rule changes documented and tested

**Decision:** Every added or changed rule includes a matching catalog update and focused automated tests. Browser-facing changes also receive a proportional manual browser check.

**Why:** The rule set is the product's core domain knowledge. Behavior must remain understandable to content owners and independently verifiable by developers.

## Do not add automated browser infrastructure yet

**Decision:** DOM, layout, focus, scrolling, clipboard, theme, and accessibility behavior are checked manually. The project does not install a browser automation framework or managed browser binaries.

**Why:** For this small personal application, the infrastructure and maintenance cost currently outweigh the expected benefit. The decision should be revisited if the interface or contributor base grows, or if browser regressions become frequent.
