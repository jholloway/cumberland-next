const test = require("node:test");
const assert = require("node:assert/strict");
const { createRuleRegistry } = require("../src/rules/rule-registry.js");

function issue(text, start, end, overrides = {}) {
  return {
    start,
    end,
    original: text.slice(start, end),
    replacement: "replacement",
    explanation: "Test explanation.",
    canAutoFix: true,
    ...overrides,
  };
}

test("combines findings from independently registered rules", () => {
  const registry = createRuleRegistry([
    { id: "R-002", name: "Second rule", priority: 100, detect: (text) => [issue(text, 0, 2)] },
    { id: "R-003", name: "Third rule", priority: 100, detect: (text) => [issue(text, 4, 6)] },
  ]);

  assert.deepEqual(registry.detect("sample").map((finding) => finding.ruleId), ["R-002", "R-003"]);
});

test("higher-priority findings own overlapping text", () => {
  const registry = createRuleRegistry([
    { id: "R-low", priority: 10, detect: (text) => [issue(text, 1, 5)] },
    { id: "R-high", priority: 20, detect: (text) => [issue(text, 3, 7)] },
  ]);

  const findings = registry.detect("sample text");
  assert.deepEqual(findings.map((finding) => finding.ruleId), ["R-high"]);
});

test("ties between overlapping rules resolve by rule id", () => {
  const registry = createRuleRegistry([
    { id: "R-Z", priority: 100, detect: (text) => [issue(text, 0, 3)] },
    { id: "R-A", priority: 100, detect: (text) => [issue(text, 0, 3)] },
  ]);

  assert.deepEqual(registry.detect("sample").map((finding) => finding.ruleId), ["R-A"]);
});

test("rejects duplicate rule ids", () => {
  assert.throws(
    () => createRuleRegistry([
      { id: "R-001", detect: () => [] },
      { id: "R-001", detect: () => [] },
    ]),
    /Duplicate rule id/
  );
});

test("rejects malformed rule definitions", () => {
  assert.throws(() => createRuleRegistry(null), /Rules must be provided as an array/);
  assert.throws(() => createRuleRegistry([{ id: "", detect: () => [] }]), /non-empty id/);
  assert.throws(() => createRuleRegistry([{ id: "R-bad" }]), /detect\(text\) function/);
  assert.throws(
    () => createRuleRegistry([{ id: "R-bad", priority: "high", detect: () => [] }]),
    /priority must be a finite number/
  );
});

test("rejects malformed detector output and issue contracts", () => {
  assert.throws(
    () => createRuleRegistry([{ id: "R-bad", detect: () => null }]).detect("sample"),
    /must return an array/
  );
  assert.throws(
    () => createRuleRegistry([{ id: "R-bad", detect: (text) => [issue(text, 0, 99)] }]).detect("sample"),
    /range within the analyzed text/
  );
  assert.throws(
    () => createRuleRegistry([{
      id: "R-bad",
      detect: (text) => [issue(text, 0, 2, { original: "wrong" })],
    }]).detect("sample"),
    /original must exactly match/
  );
  assert.throws(
    () => createRuleRegistry([{
      id: "R-bad",
      detect: (text) => [issue(text, 0, 2, { explanation: "" })],
    }]).detect("sample"),
    /non-empty explanation/
  );
  assert.throws(
    () => createRuleRegistry([{
      id: "R-bad",
      detect: (text) => [issue(text, 0, 2, { canAutoFix: false })],
    }]).detect("sample"),
    /must declare an automatic or manual resolution capability/
  );
  assert.throws(
    () => createRuleRegistry([{
      id: "R-bad",
      detect: (text) => [issue(text, 0, 2, { replacement: undefined })],
    }]).detect("sample"),
    /automatic findings must provide replacement as a string/
  );
  assert.throws(
    () => createRuleRegistry([{
      id: "R-bad",
      detect: (text) => [issue(text, 0, 2, { options: [{ label: "", value: 1 }] })],
    }]).detect("sample"),
    /option 1 must provide a non-empty label and string value/
  );
});

test("copies rule definitions so caller mutations cannot bypass validation", () => {
  const rules = [{ id: "R-safe", detect: () => [] }];
  const registry = createRuleRegistry(rules);
  rules.push({ id: "R-late", detect: () => null });
  rules[0].detect = () => null;

  assert.deepEqual(registry.detect("sample"), []);
  assert.deepEqual(registry.rules.map((rule) => rule.id), ["R-safe"]);
  assert.equal(Object.isFrozen(registry.rules), true);
});
