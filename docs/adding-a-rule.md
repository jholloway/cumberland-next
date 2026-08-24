# Adding a rule

This guide is the shortest safe path from an approved style requirement to an enabled Cumberland Next rule.

Before writing code, read the similar entries in the [rule catalog](rules.md). A new rule should solve a distinct problem and must not silently change an existing rule's approved behavior.

## Before you start

Write down:

- the unwanted form and desired result;
- examples that should be detected;
- examples that must be left alone;
- whether the correction is safe to automate or requires a person;
- any likely overlap with an existing rule.

Use the next unused, zero-padded rule ID. The next ID after the current catalog is `R-019`. Never reuse the ID of a removed rule.

Name the module after its purpose using lowercase kebab case, such as `src/rules/percentage-rule.js`. Give its test the same base name: `test/percentage-rule.test.js`.

## 1. Create the rule module

Every rule uses the same small wrapper so its actual implementation can run as a classic browser script and as a CommonJS module in Node tests.

### Automatic rule template

Use this when code can always produce a safe replacement. Replace the example ID, names, pattern, and explanation.

```js
(function attachExampleRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.exampleRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createExampleRule() {
  const UNWANTED_FORM = /\bexample\b/g;

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(UNWANTED_FORM)) {
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: "preferred form",
        explanation: 'Use "preferred form" instead of "example".',
        canAutoFix: true,
      });
    }

    return issues;
  }

  return {
    id: "R-019",
    name: "Replace example wording",
    priority: 100,
    detect,
  };
});
```

An automatic replacement may be an empty string when the safe action is deletion. To offer secondary choices, add an `options` array:

```js
options: [
  { label: "Short form", value: "short replacement" },
  { label: "Long form", value: "long replacement" },
]
```

### Manual rule finding

Use manual resolution when the tool can identify a problem but cannot choose the correct wording. The wrapper and returned rule object stay the same; the finding changes to:

```js
issues.push({
  start: match.index,
  end: match.index + match[0].length,
  original: match[0],
  explanation: "Rewrite this text so it describes the destination.",
  canManualFix: true,
});
```

Do not provide a replacement for a manual finding. Do not set both capabilities unless the product requirement genuinely calls for both choices.

There is no informational-only rule type. Every finding must offer automatic or manual resolution; every finding can also be skipped through the shared review workflow.

## 2. Follow the rule contract

A rule returns this object:

```js
{
  id: "R-019",       // Required, unique, and stable.
  name: "Rule name", // Optional in code, but required by project convention.
  priority: 100,      // Optional; defaults to 100.
  detect(text) {      // Required; returns one finding per occurrence.
    return [];
  },
}
```

Every finding returned by `detect(text)` must contain:

| Field | Meaning |
| --- | --- |
| `start` | Inclusive JavaScript string offset where the match begins. |
| `end` | Exclusive JavaScript string offset where the match ends. |
| `original` | The exact text between `start` and `end`. |
| `explanation` | A short, plain-language reason shown to the user. |
| `canAutoFix` | `true` when `replacement` is safe to apply. |
| `canManualFix` | `true` when a person must edit and confirm the result. |
| `replacement` | Required string for an automatic finding; omitted for a manual finding. |
| `options` | Optional labeled replacement choices for an automatic finding. |

Rules must not change the input text or access the page. Return a separate finding for each occurrence, including adjacent or repeated matches. The registry adds the rule ID, rule name, and normalized priority to each finding.

The registry rejects malformed rules and findings during analysis. Its error identifies the rule and finding that violated the contract.

## 3. Choose a priority

Use priority `100` unless the new rule must own text that another rule can also detect.

Use priority `200` only when the broader or safer finding should suppress a competing finding. For example, a raw URL has priority 200 so date-like or number-like fragments inside it do not become separate findings.

Higher priority wins an overlap. Equal priorities are resolved by rule ID. Non-overlapping findings are reviewed in their position order in the document.

Document every intentional overlap in the new rule's catalog entry and add a test proving which rule wins. Do not use script position to control review or overlap order.

## 4. Enable the rule

Add one script tag in the rule block near the end of `index.html`:

```html
<script src="src/rules/percentage-rule.js"></script>
```

Place it with the other rule modules and before:

```html
<script src="src/rules/enabled-rules.js"></script>
```

The rule script tags are the production enablement manifest. Their order controls loading only; the registry controls overlap selection and final review order. Do not add a second rule list to `src/app.js` or `enabled-rules.js`.

## 5. Add focused tests

Create the matching test file. This example is intentionally small enough to copy:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const exampleRule = require("../src/rules/percentage-rule.js");

function replacements(text) {
  return exampleRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("detects the unwanted form and proposes the exact replacement", () => {
  assert.deepEqual(replacements("An example appears."), [
    ["example", "preferred form"],
  ]);
});

test("ignores compliant and unrelated text", () => {
  assert.deepEqual(replacements("The preferred form appears."), []);
});

test("reports repeated occurrences independently", () => {
  assert.equal(exampleRule.detect("example example").length, 2);
});
```

Add cases for:

- every approved input and exact output;
- already-compliant and unrelated text;
- ambiguous or explicitly ignored cases;
- punctuation, line breaks, and surrounding text;
- adjacent and repeated occurrences;
- intentional overlaps;
- the declared automatic or manual capability.

Update `test/enabled-rules.test.js` so its expected manifest count and contiguous ID list include the new rule. Add review-session tests only if the rule introduces behavior not already covered by the existing automatic or manual workflows.

Run the complete suite:

```bash
npm test
```

## 6. Document the rule

Add one row to the summary table and one section to [rules.md](rules.md). Use this compact format:

```markdown
## R-019: Rule name

Plain-language description of the problem and correction.

| Input | Result |
| --- | --- |
| `unwanted example` | `preferred result` |

**Leaves unchanged:** List compliant, ambiguous, and unsupported cases.

**Developer notes:** State unusual context checks, overlaps, or limitations. Omit this line when there are none.
```

Common behavior—independent findings, minimal edits, skipping, and automatic versus manual actions—is documented once at the top of the catalog and should not be repeated in every rule.

Update [decisions.md](decisions.md) only if the change creates a cross-cutting, surprising, or difficult-to-reverse choice. Ordinary detection details belong in the rule catalog and tests.

## 7. Check the browser when appropriate

For a rule-only change, serve the app, analyze one positive and one ignored example in the primary browser, and confirm the finding text and action are correct.

Use the broader manual checklist in [testing.md](testing.md) when changing page behavior, scrolling, focus, themes, clipboard handling, highlights, or accessibility.

## Definition of done

- The requirement, examples, exceptions, and resolution type are approved.
- The rule has a unique ID and follows the complete contract.
- Priority 100 is used unless a documented overlap requires otherwise.
- The script tag appears before `enabled-rules.js`.
- The rule catalog and manifest test are updated.
- Focused tests cover positive, ignored, repeated, preservation, and overlap cases.
- `npm test` passes.
- The proportional browser check passes.
- No rule-specific behavior was added to `src/app.js` unnecessarily.
