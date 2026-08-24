(function attachRuleRegistry(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.createRuleRegistry = factory().createRuleRegistry;
  }
})(typeof globalThis === "object" ? globalThis : this, function createRuleRegistryModule() {
  function comparePriority(left, right) {
    if (left.priority !== right.priority) return right.priority - left.priority;
    return left.ruleId.localeCompare(right.ruleId);
  }

  function documentOrder(left, right) {
    if (left.start !== right.start) return left.start - right.start;
    if (left.end !== right.end) return left.end - right.end;
    return comparePriority(left, right);
  }

  function chooseNonOverlappingIssues(issues) {
    // Select by priority first, then restore document order for review. This
    // makes overlap handling deterministic without coupling rules together.
    const byPriority = [...issues].sort(comparePriority);
    // Accepted issues are pairwise non-overlapping and kept sorted by start,
    // so their ends are sorted too and only the insertion neighbors can
    // overlap a candidate.
    const selected = [];

    byPriority.forEach((issue) => {
      let low = 0;
      let high = selected.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (selected[mid].start < issue.start) low = mid + 1;
        else high = mid;
      }

      const successor = selected[low];
      const predecessor = selected[low - 1];
      const overlapsSelected =
        (successor !== undefined && successor.start < issue.end) ||
        (predecessor !== undefined && predecessor.end > issue.start);

      if (!overlapsSelected) selected.splice(low, 0, issue);
    });

    return selected.sort(documentOrder);
  }

  function issueError(rule, index, message) {
    return new TypeError(`${rule.id} finding ${index + 1}: ${message}`);
  }

  function validateIssue(rule, text, issue, index) {
    if (!issue || typeof issue !== "object" || Array.isArray(issue)) {
      throw issueError(rule, index, "must be an issue object.");
    }
    if (
      !Number.isInteger(issue.start) ||
      !Number.isInteger(issue.end) ||
      issue.start < 0 ||
      issue.end <= issue.start ||
      issue.end > text.length
    ) {
      throw issueError(rule, index, "must provide a non-empty range within the analyzed text.");
    }
    if (typeof issue.original !== "string") {
      throw issueError(rule, index, "must provide original as a string.");
    }
    if (text.slice(issue.start, issue.end) !== issue.original) {
      throw issueError(rule, index, "original must exactly match its source range.");
    }
    if (typeof issue.explanation !== "string" || !issue.explanation.trim()) {
      throw issueError(rule, index, "must provide a non-empty explanation.");
    }
    if (issue.canAutoFix !== undefined && typeof issue.canAutoFix !== "boolean") {
      throw issueError(rule, index, "canAutoFix must be a boolean when provided.");
    }
    if (issue.canManualFix !== undefined && typeof issue.canManualFix !== "boolean") {
      throw issueError(rule, index, "canManualFix must be a boolean when provided.");
    }
    if (!issue.canAutoFix && !issue.canManualFix) {
      throw issueError(rule, index, "must declare an automatic or manual resolution capability.");
    }
    if (issue.canAutoFix && typeof issue.replacement !== "string") {
      throw issueError(rule, index, "automatic findings must provide replacement as a string.");
    }
    if (issue.options !== undefined) {
      if (!issue.canAutoFix || !Array.isArray(issue.options)) {
        throw issueError(rule, index, "options must be an array on an automatic finding.");
      }
      issue.options.forEach((option, optionIndex) => {
        if (
          !option ||
          typeof option !== "object" ||
          typeof option.label !== "string" ||
          !option.label.trim() ||
          typeof option.value !== "string"
        ) {
          throw issueError(
            rule,
            index,
            `option ${optionIndex + 1} must provide a non-empty label and string value.`
          );
        }
      });
    }
  }

  function validateRule(rule) {
    if (!rule || typeof rule !== "object" || typeof rule.id !== "string" || !rule.id.trim()) {
      throw new TypeError("Every rule must provide a non-empty id.");
    }
    if (typeof rule.detect !== "function") {
      throw new TypeError(`Rule ${rule.id} must provide a detect(text) function.`);
    }
    if (rule.name !== undefined && (typeof rule.name !== "string" || !rule.name.trim())) {
      throw new TypeError(`Rule ${rule.id} name must be a non-empty string when provided.`);
    }
    if (rule.priority !== undefined && !Number.isFinite(rule.priority)) {
      throw new TypeError(`Rule ${rule.id} priority must be a finite number when provided.`);
    }
  }

  function createRuleRegistry(rules) {
    // Fail during application startup rather than silently accepting a rule
    // that cannot participate in detection or has an unstable identity.
    if (!Array.isArray(rules)) throw new TypeError("Rules must be provided as an array.");
    const registeredRules = Object.freeze(rules.map((rule) => Object.freeze({ ...rule })));
    const ruleIds = new Set();
    registeredRules.forEach((rule) => {
      validateRule(rule);
      if (ruleIds.has(rule.id)) throw new Error(`Duplicate rule id: ${rule.id}`);
      ruleIds.add(rule.id);
    });

    function detect(text) {
      if (typeof text !== "string") throw new TypeError("Analyzed text must be a string.");
      const issues = registeredRules.flatMap((rule) => {
        const detected = rule.detect(text);
        if (!Array.isArray(detected)) {
          throw new TypeError(`Rule ${rule.id} detect(text) must return an array.`);
        }

        return detected.map((issue, index) => {
          validateIssue(rule, text, issue, index);
          return {
            ...issue,
            ruleId: rule.id,
            ruleName: rule.name || rule.id,
            priority: rule.priority === undefined ? 100 : rule.priority,
          };
        });
      });

      return chooseNonOverlappingIssues(issues);
    }

    return {
      detect,
      rules: registeredRules,
    };
  }

  return { createRuleRegistry };
});
