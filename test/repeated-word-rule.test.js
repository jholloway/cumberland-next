const test = require("node:test");
const assert = require("node:assert/strict");
const repeatedWordRule = require("../src/rules/repeated-word-rule.js");

function findings(text) {
  return repeatedWordRule.detect(text);
}

test("flags repeated words including casing and contractions", () => {
  assert.deepEqual(findings("the the end").map((i) => i.original), ["the the"]);
  assert.deepEqual(findings("The the fact remains").map((i) => i.original), ["The the"]);
  assert.deepEqual(findings("don't don't do that").map((i) => i.original), ["don't don't"]);
});

test("tolerates multiple spaces between the words", () => {
  assert.deepEqual(findings("so  much  much  fun").map((i) => i.original), ["much  much"]);
});

test("flags legitimate-looking repetitions for human judgment", () => {
  assert.deepEqual(findings("I know that that word").map((i) => i.original), ["that that"]);
});

test("does not flag different, inflected, or partial words", () => {
  assert.deepEqual(findings("the cat saw the dog"), []);
  assert.deepEqual(findings("a dog dogs owner"), []);
  assert.deepEqual(findings("the theory of everything"), []);
});

test("does not flag repetitions across a line break or digits", () => {
  assert.deepEqual(findings("first line ends\nfirst begins"), []);
  assert.deepEqual(findings("5 5 phones"), []);
});

test("issues request manual review instead of an automatic fix", () => {
  const [issue] = findings("the the end");
  assert.equal(issue.canAutoFix, false);
  assert.equal(issue.canManualFix, true);
  assert.equal(issue.replacement, "");
  assert.match(issue.explanation, /Delete one/);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = findings("and and then but but");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("reports exact ranges covering both occurrences", () => {
  const text = "say hello hello there";
  const [issue] = findings(text);
  assert.equal(text.slice(issue.start, issue.end), "hello hello");
});

test("manual resolution removes the issue without changing text", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(repeatedWordRule);
  const text = "the the end";
  let state = session.scan(text);

  state = session.markManuallyFixed(text);
  assert.equal(state.text, text);
  assert.equal(state.issues.length, 0);
});
