const test = require("node:test");
const assert = require("node:assert/strict");
const linkTextRule = require("../src/rules/link-text-rule.js");

function findings(text) {
  return linkTextRule.detect(text);
}

function originals(text) {
  return findings(text).map((issue) => issue.original);
}

test("flags both phrases in any casing", () => {
  assert.deepEqual(originals("Click Here for details"), ["Click Here"]);
  assert.deepEqual(originals("Follow THIS LINK to register"), ["THIS LINK"]);
  assert.deepEqual(originals("click here and this link"), ["click here", "this link"]);
});

test("word boundaries keep partial overlaps out of scope", () => {
  assert.deepEqual(findings("See this linked page"), []);
  assert.deepEqual(findings("They clicked here once"), []);
  assert.deepEqual(findings("The click hereby ended."), []);
});

test("issues request manual review instead of an automatic fix", () => {
  const [issue] = findings("Click here to pay");
  assert.equal(issue.canAutoFix, false);
  assert.equal(issue.canManualFix, true);
  assert.equal(issue.replacement, "");
  assert.match(issue.explanation, /Rewrite/);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = findings("Click here, then this link, then click here again");
  assert.equal(issues.length, 3);
  assert.ok(issues[0] !== issues[1]);
});

test("manual resolution removes the issue without changing text", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(linkTextRule);
  const text = "Click here to view the agenda";
  let state = session.scan(text);

  state = session.markManuallyFixed(text);
  assert.equal(state.text, text);
  assert.equal(state.issues.length, 0);
});
