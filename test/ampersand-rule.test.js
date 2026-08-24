const test = require("node:test");
const assert = require("node:assert/strict");
const ampersandRule = require("../src/rules/ampersand-rule.js");

function replacements(text) {
  return ampersandRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("replaces standalone ampersands between words", () => {
  assert.deepEqual(replacements("Tom & Jerry"), [["&", "and"]]);
  assert.equal(
    (() => {
      const text = "Tom & Jerry";
      const [issue] = ampersandRule.detect(text);
      return `${text.slice(0, issue.start)}${issue.replacement}${text.slice(issue.end)}`;
    })(),
    "Tom and Jerry"
  );
});

test("keeps attached forms such as brands and initials", () => {
  assert.deepEqual(replacements("AT&T R&D B&B Q&A S&P 500 A&W"), []);
});

test("keeps URL query separators and HTML entities untouched", () => {
  assert.deepEqual(replacements("https://example.com/search?q=parks&page=2&sort=asc"), []);
  assert.deepEqual(replacements("Fish &amp; Chips &nbsp; menu"), []);
});

test("does not flag adjacent ampersands or code artifacts", () => {
  assert.deepEqual(replacements("a && b"), []);
});

test("flags ampersands next to punctuation or text edges", () => {
  assert.deepEqual(replacements("(Tom & Jerry)"), [["&", "and"]]);
  assert.deepEqual(replacements("& Co. presents"), [["&", "and"]]);
  assert.deepEqual(replacements("Salt &"), [["&", "and"]]);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = ampersandRule.detect("A & B & C");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(ampersandRule);
  const text = "Parks & Rec";
  let state = session.scan(text);

  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "Parks and Rec");
});
