# Architecture

This document explains the current implementation. Product behavior belongs in [product.md](product.md), and rule-specific behavior belongs in [rules.md](rules.md).

## Runtime model

Cumberland Next is a dependency-free client-side application built with static HTML, CSS, and JavaScript. It has no backend, database, framework, build step, or production package installation.

Rule and review logic can run in Node for tests without a browser. Browser-specific behavior remains in `src/app.js`.

## Data flow

```text
rule script tags in index.html
            ↓
    enabledRules manifest
            ↓
 rule registry validation
   and overlap selection
            ↓
       review session
            ↓
    src/app.js and the UI
```

The separation is intentional: a normal new rule should not require changes to the review session, page controller, or editor rendering.

## Components

### Rule modules

Files in `src/rules/*-rule.js` detect independent occurrences and describe how each can be resolved. A rule receives text and returns exact source ranges; it does not access the page or change the input.

Each module uses a small wrapper that exposes the same implementation as:

- a classic browser script attached to `globalThis.CumberlandNext`; and
- a CommonJS export consumed by Node tests.

The complete pattern is in [Adding a rule](adding-a-rule.md).

### Production rule manifest

The ordered rule script tags in `index.html` are the only production enablement manifest. `src/rules/enabled-rules.js` collects rule-shaped values from the shared namespace after those scripts load and freezes the resulting list.

Script position controls loading and enablement only. It does not control the order in which findings appear to the user.

### Rule registry

`src/rules/rule-registry.js` snapshots the enabled definitions and validates each rule and finding before review begins. Validation covers:

- unique rule IDs and valid priorities;
- detector return values;
- non-empty ranges within the analyzed text;
- exact agreement between a range and its recorded source text;
- plain-language explanations;
- automatic or manual resolution capability;
- automatic replacements and optional alternate choices.

When findings overlap, higher priority wins. Equal priority is resolved by rule ID. Suppressed findings do not enter that scan's review queue. Accepted findings are then sorted by their position in the document.

### Review session

`src/review/review-session.js` owns the current scan. It tracks finding order, the current finding, skips, resolutions, automatic replacements, and live source positions.

An automatic fix replaces the recorded range, removes that finding, shifts later ranges by the length difference, and advances. A manual confirmation removes the finding without changing text. A skip keeps the finding in the queue for the next cycle.

A new analysis creates a fresh session from the editor's current text.

### Page controller

`src/app.js` connects the registry and session to the page. It owns browser concerns including rendering, textarea events, focus, scrolling, theme preference, and clipboard access. It should not contain rule-specific branches.

## Direct edits and source positions

JavaScript string positions are UTF-16 offsets. `start` is inclusive and `end` is exclusive.

Before a textarea edit, the page records the selected prior-text range and input type. The session verifies that evidence against the unchanged prefix and suffix, shifts later findings by the edit's length difference, and compares every finding's recorded source with the live text. Detectors run for validation only: an existing finding must still match its rule, range, replacement, and alternate options. This catches changed boundaries and surrounding context without adding new findings or resetting review decisions.

Unaffected findings remain active. A finding whose source or matching context changed becomes stale: it is dimmed, no longer highlighted, and cannot be changed automatically. Manual confirmation remains available because it does not apply a recorded replacement. If the browser cannot describe one contiguous edit, the session falls back to a shared-prefix/shared-suffix comparison.

These checks preserve the identity of adjacent or repeated findings and prevent an automatic fix from modifying the wrong text.

## Editor and highlight layer

The native `<textarea>` is the editable and accessible source of truth. A decorative synchronized layer behind it renders finding highlights while the textarea text is visually transparent.

Both layers must keep the same font, padding, line height, wrapping, and scroll position. The highlight layer is `aria-hidden` and must never take over editing or accessibility responsibilities.

Changes to layout, text metrics, or scrolling require the manual browser checks in [testing.md](testing.md).

## Stable boundaries

- Core use does not require a network request or server-side service.
- Rules are independently testable and developer-maintained.
- The registry is the only application-level consumer of enabled rules.
- The review interface responds to declared capabilities, never hardcoded rule IDs.
- Text transformations target the smallest safe source range.
- Authentication, persistence, imports, publishing integrations, and rich text are outside the current architecture.
