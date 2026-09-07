const test = require("node:test");
const assert = require("node:assert/strict");
const timeRule = require("../src/rules/time-rule.js");
const { createReviewSession } = require("../src/review/review-session.js");

test("skips remain highlighted and navigation loops to the beginning", () => {
  const session = createReviewSession(timeRule);
  let state = session.scan("7 PM 8 PM");

  assert.equal(state.currentIssue.original, "7 PM");
  state = session.skip();
  assert.equal(state.currentIssue.original, "8 PM");
  state = session.skip();
  assert.equal(state.currentIssue.original, "7 PM");
  assert.deepEqual(state.issues.map((issue) => issue.status), ["skipped", "skipped"]);
});

test("automatic fixes remove the issue and adjust later locations without rescanning", () => {
  const session = createReviewSession(timeRule);
  let state = session.scan("7 PM / 19:00");
  const originalSecondStart = state.issues[1].start;

  const result = session.applyAutomaticFix("7 PM / 19:00");
  assert.equal(result.text, "7 p.m. / 19:00");
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].original, "19:00");
  assert.equal(result.issues[0].start, originalSecondStart + 2);
  assert.equal(result.scanCount, 1);
});

test("a new scan resets previous review statuses", () => {
  const session = createReviewSession(timeRule);
  session.scan("7 PM");
  session.skip();
  const state = session.scan("7 PM");
  assert.equal(state.scanCount, 2);
  assert.equal(state.issues[0].status, "pending");
  assert.equal(state.currentIndex, 0);
});

test("fixing the final issue leaves an empty active issue list", () => {
  const session = createReviewSession(timeRule);
  session.scan("7 PM");
  const result = session.applyAutomaticFix("7 PM");
  assert.equal(result.text, "7 p.m.");
  assert.equal(result.currentIssue, null);
  assert.deepEqual(result.issues, []);
});

test("manual resolution removes only the current manually resolvable issue", () => {
  const manualRule = {
    id: "R-manual",
    detect: () => [
      { start: 0, end: 3, original: "one", replacement: "", canManualFix: true },
      { start: 4, end: 7, original: "two", replacement: "", canAutoFix: true },
    ],
  };
  const session = createReviewSession(manualRule);
  session.scan("one two");
  const result = session.markManuallyFixed("one two");

  assert.equal(result.text, "one two");
  assert.deepEqual(result.issues.map((issue) => issue.original), ["two"]);
  assert.equal(result.currentIssue.original, "two");
});

test("edits shift later findings without invalidating them", () => {
  const session = createReviewSession(timeRule);
  let state = session.scan("one 7 PM two 8 PM three");

  state = session.adjustForEdit("one 7 PM two 8 PM three", "one 7 PM two-and 8 PM three");
  assert.equal(state.issues[0].stale, false);
  assert.deepEqual([state.issues[1].start, state.issues[1].end], [17, 21]);
});

test("typing inside a finding marks only that finding stale", () => {
  const session = createReviewSession(timeRule);
  let state = session.scan("at 7 PM sharp");

  state = session.adjustForEdit("at 7 PM sharp", "at 7 Px sharp");
  assert.equal(state.issues[0].stale, true);

  // Undoing the edit restores validation without a rescan.
  state = session.adjustForEdit("at 7 Px sharp", "at 7 PM sharp");
  assert.equal(state.issues[0].stale, false);
});

test("deletions slide later findings backwards", () => {
  const session = createReviewSession(timeRule);
  let state = session.scan("keep [this] 8 PM end");

  state = session.adjustForEdit("keep [this] 8 PM end", "keep [] 8 PM end");
  assert.deepEqual([state.issues[0].start, state.issues[0].end], [8, 12]);
  assert.equal(state.issues[0].stale, false);
});

test("an explicit edit range preserves identical occurrence identities", () => {
  const session = createReviewSession(timeRule);
  let state = session.scan("7 PM 7 PM");
  state = session.skip();

  state = session.adjustForEdit("7 PM 7 PM", "7 PM", { start: 0, end: 5 });

  assert.equal(state.issues[0].status, "skipped");
  assert.equal(state.issues[0].stale, true);
  assert.deepEqual([state.issues[1].start, state.issues[1].end], [0, 4]);
  assert.equal(state.issues[1].status, "pending");
  assert.equal(state.issues[1].stale, false);
  assert.deepEqual(state.currentIssue, state.issues[1]);

  state = session.adjustForEdit("7 PM", "7 PM 7 PM", { start: 0, end: 0 });
  assert.deepEqual(state.issues.map((issue) => [issue.start, issue.stale]), [
    [0, false],
    [5, false],
  ]);
  assert.equal(state.issues[0].status, "skipped");
  assert.equal(state.currentIssue.status, "pending");
});

test("invalid supplied edit ranges safely fall back to text comparison", () => {
  const session = createReviewSession(timeRule);
  session.scan("before 7 PM");

  const state = session.adjustForEdit("before 7 PM", "longer before 7 PM", { start: 99, end: 100 });

  assert.deepEqual([state.currentIssue.start, state.currentIssue.end], [14, 18]);
  assert.equal(state.currentIssue.stale, false);
});

test("automatic fixes are refused for stale findings", () => {
  const session = createReviewSession(timeRule);
  const text = "at 7 PM sharp";
  session.scan(text);
  session.adjustForEdit(text, "at 7 Px sharp");

  const result = session.applyAutomaticFix("at 7 Px sharp");
  assert.equal(result.text, "at 7 Px sharp");
  assert.equal(result.issues.length, 1);
});

test("automatic fixes honor an alternative replacement and its offset math", () => {
  const optionRule = {
    id: "R-opt",
    detect: () => [
      { start: 0, end: 3, original: "abc", replacement: "x", canAutoFix: true, options: [{ label: "Long", value: "longer" }] },
      { start: 6, end: 7, original: "z", replacement: "y", canAutoFix: true },
    ],
  };
  const session = createReviewSession(optionRule);
  let state = session.scan("abc d z");

  // The chosen value is longer than the default, so the later finding
  // shifts by the applied length, not the default length.
  state = session.applyAutomaticFix("abc d z", "longer");
  assert.equal(state.text, "longer d z");
  assert.deepEqual([state.issues[0].start, state.issues[0].end], [9, 10]);
});

test("automatic fixes fall back to the default without a choice", () => {
  const optionRule = {
    id: "R-opt",
    detect: () => [{ start: 0, end: 3, original: "abc", replacement: "x", canAutoFix: true }],
  };
  const session = createReviewSession(optionRule);
  session.scan("abc tail");

  const result = session.applyAutomaticFix("abc tail");
  assert.equal(result.text, "x tail");
});

test("boundary edits invalidate automatic fixes without discarding unrelated findings", () => {
  const expansionRule = require("../src/rules/expansion-rule.js");
  for (const [after, range] of [
    ["TNT and TN", { start: 2, end: 2 }],
    ["ATN and TN", { start: 0, end: 0 }],
  ]) {
    const session = createReviewSession(expansionRule);
    session.scan("TN and TN");
    const state = session.adjustForEdit("TN and TN", after, range);
    assert.deepEqual(state.issues.map(issue => issue.stale), [true, false]);
    assert.equal(session.applyAutomaticFix(after).text, after);
    session.skip();
    assert.equal(session.applyAutomaticFix(after).text, after.replace(/TN$/, "Tennessee"));
  }
});

test("context changes outside a finding invalidate its automatic replacement", () => {
  const measurementRule = require("../src/rules/measurement-rule.js");
  const session = createReviewSession(measurementRule);
  session.scan("10 ft tall");
  const state = session.adjustForEdit("10 ft tall", "ten ft tall", { start: 0, end: 2 });
  assert.equal(state.currentIssue.stale, true);
  assert.equal(session.applyAutomaticFix("ten ft tall").text, "ten ft tall");
});
