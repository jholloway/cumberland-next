# Cumberland Next

Cumberland Next is a small web application that helps Nashville.gov content editors find and correct common style problems before publishing plain text.

The application runs entirely in the browser. It has no backend, database, framework, build step, or production dependencies.

## Run the application

You need a current web browser and Python 3, or another basic static file server.

From the project directory, run:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Run the tests

Tests require Node.js 18 or newer. There is nothing to install because the suite uses Node's built-in test runner.

```bash
npm test
```

## Add or change a rule

Start with [Adding a rule](docs/adding-a-rule.md). It contains the complete module pattern, testing steps, documentation format, and completion checklist.

Use the [rule catalog](docs/rules.md) to understand current behavior and choose the next rule ID.

## Documentation

- [Product](docs/product.md) — what the application does, who uses it, and what is outside its scope.
- [Adding a rule](docs/adding-a-rule.md) — the task-oriented guide for implementing a rule safely.
- [Rule catalog](docs/rules.md) — current behavior, examples, and exceptions for every enabled rule.
- [Architecture](docs/architecture.md) — how rule detection, review state, editing, and the browser interface fit together.
- [Testing](docs/testing.md) — automated coverage and the proportional manual browser checklist.
- [Decisions](docs/decisions.md) — current cross-cutting choices that are not obvious from the code.

## Project map

- `index.html` — page structure and the production rule manifest.
- `styles.css` — layout, themes, editor highlights, and responsive styling.
- `src/rules/` — independent rule modules, the enabled-rule collector, and registry.
- `src/review/` — review-session state and text-position updates.
- `src/app.js` — browser behavior and page rendering.
- `test/` — dependency-free Node tests.
- `docs/` — product, rule, architecture, and maintenance documentation.
