# Answer Part 2: Tests

## Lab 1 Automated Test Results

All required Lab 1 automated tests passed successfully.

| Test ID | Tool | Test File | Description | Result |
|---|---|---|---|---|
| API-01 | Supertest | `server/tests/lab-01/health.test.ts` | Health endpoint returns HTTP 200 and expected JSON | PASS |
| API-02 | Supertest | `server/tests/lab-01/categories.test.ts` | Categories endpoint returns the four seeded categories in ID order | PASS |
| UI-01 | Vitest | `client/tests/lab-01/App.test.tsx` | TokTickIT heading renders | PASS |
| UI-02 | Vitest | `client/tests/lab-01/App.test.tsx` | Successful API response displays Online status and categories | PASS |
| UI-03 | Vitest | `client/tests/lab-01/App.test.tsx` | API failure displays an Offline error message | PASS |

## Backend Test Evidence

The backend test suite was executed from the `toktickit/server` directory using `npm test`.

The test result was:

Test Files  2 passed (2)  
Tests       2 passed (2)

**Figure 1:** Screenshot of the backend `npm test` output.

The backend tests verify that:

1. `GET /api/health` returns HTTP 200 with the expected JSON response.
2. `GET /api/categories` returns the four seeded categories in predictable ID order.

## Frontend Test Evidence

The frontend test suite was executed from the `toktickit/client` directory using `npm test`.

The test result was:

Test Files  1 passed (1)  
Tests       3 passed (3)

**Figure 2:** Screenshot of the frontend `npm test` output.

The frontend tests verify that:

1. The TokTickIT heading is rendered.
2. A successful API response displays the Online status and the seeded categories.
3. An API failure displays an Offline error message.

## Test Documentation

The complete test descriptions are documented in `docs/lab-01/tests.md`.

| Test ID | Test File | Tool | Test Description |
|---|---|---|---|
| API-01 | `tests/lab-01/health.test.ts` | Supertest | Health endpoint returns 200 and expected JSON |
| API-02 | `tests/lab-01/categories.test.ts` | Supertest | Categories endpoint returns the four seeded categories |
| UI-01 | `tests/lab-01/App.test.tsx` | Vitest | TokTickIT heading renders |
| UI-02 | `tests/lab-01/App.test.tsx` | Vitest | Loading state changes to the category list after a successful API response |
| UI-03 | `tests/lab-01/App.test.tsx` | Vitest | API failure displays a useful Offline error message |

## Test Summary

All five required Lab 1 automated tests passed successfully.

- Backend: 2/2 tests passed
- Frontend: 3/3 tests passed
- Total: 5/5 tests passed