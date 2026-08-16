# Lab 1 — AI Use and Reflection

**LLM/agent used:** ChatGPT (GPT-5.6 Luna)

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Explain the Git branch workflow for Lab 1, including feature branches, `lab1-staging`, and `main`. | I followed the workflow by creating and working on separate feature branches and merging them into `lab1-staging` before merging to `main`. |
| 2 | Explain how to implement Issue 3: the Prisma Category model and database seed. | I added the `Category` model, created the Prisma migration, and implemented an idempotent seed using `upsert`. |
| 3 | Help troubleshoot the Prisma shadow database permission error when running the migration. | I investigated my local PostgreSQL setup and granted the `toktickit` database user the required `CREATEDB` permission. |
| 4 | Implement the `GET /api/categories` endpoint using Prisma and return categories in predictable ID order. | I added the Express route using `findMany`, selected `id` and `name`, and ordered the results by ID. |
| 5 | Complete the Supertest test for `GET /api/categories`. | I implemented the test and ran the backend test suite to verify that the four seeded categories were returned correctly. |
| 6 | Update the React API function to retrieve categories from the backend instead of returning an empty list. | I updated `checkSystem()` to make the categories request and return the API response. |
| 7 | Update the React UI to display the categories with loading and error states. | I added category state and updated the UI to display the returned categories after a successful request. |
| 8 | Complete the Vitest tests for the category-list UI success and API failure cases. | I mocked the API responses and verified that both the successful category list and Offline error state worked. |

## Reflection

My prompts became better when I included the exact assignment requirements, existing code, error messages, and expected behavior instead of asking general questions. I also verified the generated solutions by running the migration, seed, backend tests, frontend tests, and the application itself. One example where I had to correct the result was when the initial category-list implementation did not actually fetch the categories, so I updated the API and UI implementation and then verified it with tests.
