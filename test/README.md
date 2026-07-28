# Testing

This project uses Jest for unit and integration testing, and Playwright for end-to-end testing.

## Prerequisites

1. Copy `config-example.json` to `config.json` and configure as needed
2. Ensure RethinkDB is running (for integration tests)
3. Install dependencies: `yarn install`
4. For end-to-end tests only, install the browser Playwright drives:

   ```bash
   npx playwright install chromium
   ```

   `yarn install` does not do this, and without it `yarn test:e2e` cannot run at
   all. That is worth checking on any new machine and in CI.

## Running Tests

### Unit Tests

```bash
yarn test
```

### Watch Mode

```bash
yarn test:watch
```

### Coverage Report

```bash
yarn test:coverage
```

### End-to-End Tests

Build the front-end bundle first: these drive the real compiled app, so a stale
`public/js/app.js` means you are testing yesterday's code.

```bash
yarn build && yarn test:e2e
```

### E2E Tests with UI

```bash
yarn test:e2e:ui
```

## Test Structure

```
test/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests (API endpoints, rendered pages)
├── e2e/            # End-to-end Playwright tests
├── helpers/        # Shared test utilities
├── globalSetup.js  # Creates the database schema once, before the workers start
├── setup.js        # Jest setup file
└── README.md       # This file
```

## Running against an empty database

CI gets a brand new RethinkDB every run, and so does anyone setting the project
up for the first time. Two things make that work:

- `globalSetup.js` creates the database, tables and indexes once in the main
  process. Without it, jest's parallel workers each try to create the same
  tables, and because the exists-then-create check is not atomic they can
  produce genuine duplicates — after which every query fails with
  `Table \`x\` is ambiguous`.
- The integration suites fail rather than skip when the database is missing and
  `CI` is set. Locally a missing database just skips the suite; in CI it must be
  an error, or the build goes green having asserted nothing.

To reproduce a first-run locally, point `dbName` in `config.json` at a name that
does not exist yet and run the suite.

## Writing Tests

### Unit Tests

Unit tests should test individual functions in isolation. Mock external dependencies as needed.

### Integration Tests

Integration tests verify that different parts of the application work together. These may require RethinkDB to be running.

**Prefer parsing over substring matching.** `expect(res.text).toContain(...)` is a
weaker claim than it looks: a page can contain exactly the right bytes and still
be broken once a browser parses it. A stray closing script tag inside a code
comment once ended the injected `<script>` early, so `window.existingRequest` was
never assigned and the whole edit form loaded blank — while every substring
assertion kept passing.

`integration/pageRendering.test.js` exists for this. It parses each rendered page
with jsdom, runs its inline scripts, and asserts on the resulting `window`. Put
view-layer regressions there.

### E2E Tests

End-to-end tests run the real compiled bundle in a real browser, which is the only
layer that catches problems appearing once the React app actually executes: a
broken hook, a dead handler, or a control that silently submits the form.

`e2e/editForm.spec.js` covers the submission form in edit and clone mode.

## Choosing a layer

| Question | Layer |
|---|---|
| Does this function return the right value? | `unit/` |
| Does this endpoint accept/reject/store the right thing? | `integration/` |
| Does the rendered page actually work when parsed? | `integration/pageRendering.test.js` |
| Does the UI behave when the bundle runs? | `e2e/` |

When adding a regression test, confirm it fails against the bug before you fix it
— several tests here were written, verified to fail, and only then made to pass.

## Configuration

- `jest.config.js` - Jest configuration
- `playwright.config.js` - Playwright configuration
