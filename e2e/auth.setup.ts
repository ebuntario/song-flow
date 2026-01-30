import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

/**
 * Authentication setup that runs before all tests.
 * Creates a test session via the test-only API endpoint.
 */
setup("authenticate", async ({ request, context }) => {
  // Call the test login endpoint to create a session
  const response = await request.post("/api/test-auth/login", {
    data: {
      username: "test_user",
    },
  });

  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.sessionToken).toBeDefined();

  // Save the authentication state
  await context.storageState({ path: authFile });
});
