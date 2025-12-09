# Testing

This project uses Jest for unit and integration testing, and Playwright for end-to-end testing.

## Prerequisites

1. Copy `config-example.json` to `config.json` and configure as needed
2. Ensure RethinkDB is running (for integration tests)
3. Install dependencies: `yarn install`

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

```bash
yarn test:e2e
```

### E2E Tests with UI

```bash
yarn test:e2e:ui
```

## Test Structure

```
test/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests (API endpoints, etc.)
├── e2e/           # End-to-end Playwright tests
├── setup.js       # Jest setup file
└── README.md      # This file
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions in isolation. Mock external dependencies as needed.

### Integration Tests

Integration tests verify that different parts of the application work together. These may require RethinkDB to be running.

### E2E Tests

End-to-end tests simulate real user interactions. These require the full application to be running.

## Configuration

- `jest.config.js` - Jest configuration
- `playwright.config.js` - Playwright configuration
