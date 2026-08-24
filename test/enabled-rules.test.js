const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { collectEnabledRules } = require("../src/rules/enabled-rules.js");
const { createRuleRegistry } = require("../src/rules/rule-registry.js");

const root = path.resolve(__dirname, "..");

function productionRulesFromIndex() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sources = [...html.matchAll(/<script src="(src\/rules\/[^\"]+-rule\.js)"><\/script>/g)]
    .map((match) => match[1]);
  const api = {};

  sources.forEach((source, index) => {
    api[`rule${index}`] = require(path.join(root, source));
  });
  return { sources, rules: collectEnabledRules(api) };
}

test("collects rule objects in namespace insertion order and ignores helpers", () => {
  const first = { id: "R-001", detect: () => [] };
  const second = { id: "R-002", detect: () => [] };
  const api = { first, helper: () => {}, metadata: { version: 1 }, second };

  const enabled = collectEnabledRules(api);

  assert.deepEqual(enabled, [first, second]);
  assert.equal(Object.isFrozen(enabled), true);
});

test("index.html is the single production rule manifest consumed by app.js", () => {
  const appSource = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
  const { sources, rules } = productionRulesFromIndex();

  assert.equal(sources.length, 18);
  assert.deepEqual(
    rules.map((rule) => rule.id).sort(),
    Array.from({ length: 18 }, (_, index) => `R-${String(index + 1).padStart(3, "0")}`)
  );
  assert.match(appSource, /createRuleRegistry\(api\.enabledRules\)/);
  assert.doesNotMatch(appSource, /api\.timeRule/);
});

test("the production manifest satisfies the strict registry contract together", () => {
  const { rules } = productionRulesFromIndex();
  const registry = createRuleRegistry(rules);
  const findings = registry.detect(
    "Meet at 7 PM on 2/29/2024. Click here. Call 615.555.0123."
  );

  assert.deepEqual(findings.map((finding) => finding.ruleId), [
    "R-001",
    "R-002",
    "R-011",
    "R-007",
  ]);
});
