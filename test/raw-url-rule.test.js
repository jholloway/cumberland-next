const test = require("node:test");
const assert = require("node:assert/strict");
const rawUrlRule = require("../src/rules/raw-url-rule.js");

function findings(text) {
  return rawUrlRule.detect(text);
}

test("flags http and https addresses in any casing", () => {
  assert.deepEqual(findings("See https://example.com/parks today").map((i) => i.original), [
    "https://example.com/parks",
  ]);
  assert.deepEqual(findings("Old link: HTTP://EXAMPLE.COM/Path").map((i) => i.original), [
    "HTTP://EXAMPLE.COM/Path",
  ]);
});

test("trims sentence punctuation out of the reported range", () => {
  const [issue] = findings("Visit https://example.com/page.");
  assert.equal(issue.original, "https://example.com/page");
  const text = "Call (see https://example.com/page?) for help";
  const [paren] = findings(text);
  assert.equal(text.slice(paren.start, paren.end), "https://example.com/page");
});

test("runs to the next whitespace, including query strings", () => {
  const [issue] = findings("Open https://example.com/search?q=park&page=2 now");
  assert.equal(issue.original, "https://example.com/search?q=park&page=2");
});

test("issues request manual review instead of an automatic fix", () => {
  const [issue] = findings("https://example.com");
  assert.equal(issue.canAutoFix, false);
  assert.equal(issue.canManualFix, true);
  assert.equal(issue.replacement, "");
  assert.match(issue.explanation, /describes the destination/);
});

test("does not flag schemes outside the rule scope", () => {
  assert.deepEqual(findings("Browse www.example.com or ftp://files.example.com"), []);
  assert.deepEqual(findings("The xhttp://fake string stays put."), []);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = findings("https://a.example and https://b.example");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("manual resolution removes the issue without changing text", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(rawUrlRule);
  const text = "Details at https://example.com/agenda";
  let state = session.scan(text);

  state = session.markManuallyFixed(text);
  assert.equal(state.text, text);
  assert.equal(state.issues.length, 0);
});
