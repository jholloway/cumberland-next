# Testing

Cumberland Next uses dependency-free Node tests for rule and review logic, plus a short manual browser check for behavior that requires a real page.

Automated browser tests are intentionally out of scope for this small personal application. This avoids adding browser drivers, downloaded browser binaries, test servers, and related maintenance. Reconsider that choice only if the interface grows significantly or browser regressions become common.

## Run the automated suite

Use Node.js 18 or newer. No package installation is required.

```bash
npm test
```

The command runs Node's built-in test runner across `test/*.test.js`.

## What is automated

### Rule tests

Each rule test should cover:

- approved matches and exact replacements;
- already-compliant and unrelated text;
- ambiguous and explicitly ignored cases;
- repeated and adjacent occurrences;
- surrounding punctuation, spacing, indentation, and line breaks;
- overlap behavior when relevant;
- the declared automatic or manual capability.

Rule tests use the same module implementation as the browser. The accepted examples and exceptions are documented in [rules.md](rules.md).

### Registry and manifest tests

The registry tests cover malformed rule definitions and findings, duplicate IDs, exact source ranges, capabilities, replacement options, and deterministic overlap selection.

The enabled-rule test reads the production script tags from `index.html`, verifies the expected IDs, and confirms that `src/app.js` consumes the shared manifest. Update its expected count and ID sequence whenever a rule is added or retired.

### Review-session tests

The review-session suite covers scanning, current-finding movement, skipping, automatic and manual resolution, offset changes, direct edits, stale findings, and fresh analysis state.

These tests verify state and text transformations. They do not render the page or test browser APIs.

## Manual browser checks

Start the application:

```bash
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173) in the browser being checked.

### Rule-only change

For a rule that does not change shared workflow or presentation:

1. Analyze one documented positive example.
2. Confirm the highlight, explanation, and action are correct.
3. Apply or confirm the fix and verify the resulting text.
4. Analyze one ignored example and confirm it has no finding.

A check in the primary browser is sufficient for an isolated rule change.

### Browser-facing change

For changes to the DOM, styles, editor, scrolling, focus, themes, clipboard, or accessibility, check the affected behavior and the following shared workflow:

- Empty and compliant text show “No issues found.”
- Every finding is highlighted and the current finding is distinct.
- Automatic and manual findings show the correct actions.
- Applying, confirming, and skipping move to the next finding.
- Keyboard focus moves to the next available action.
- The active editor highlight and queue card scroll into view only when needed.
- Direct edits stale only affected findings; unrelated findings remain usable.
- Stale automatic findings do not offer any automatic replacement, including after boundary edits such as `TN` becoming `TNT`.
- Editing previously clean text prompts a new analysis instead of continuing to report no issues.
- Long URL findings wrap inside the queue and current-action panel; action buttons remain reachable.
- Skipped findings remain available when the queue cycles.
- A fresh analysis rebuilds the queue from the current text.
- Copy text copies the exact editor contents.
- Light and dark themes remain readable and the theme button has an accessible name.
- Long text, line wrapping, indentation, vertical scrolling, and horizontal scrolling keep the textarea and highlight layer aligned.

Chrome is the primary target. Check current Firefox and Safari releases when browser-facing code changes or before a meaningful release; a rule-only change does not require repeating the same smoke test in all three.

## Completion standard

A change is ready when its documentation and tests agree, `npm test` passes, and the proportional browser check above succeeds. Do not describe a browser or behavior as verified unless that check was actually performed for the change.
