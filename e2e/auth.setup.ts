import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

/**
 * Authentication setup that runs before all tests.
 * Creates a test session via the test-only API endpoint.
 */
setup("authenticate", async ({ page }) => {
  // Need to visit a page first to establish context
  await page.goto("/");
  
  // Call the test login endpoint using page.request
  const response = await page.request.post("/api/test-auth/login", {
    data: {
      username: "test_user",
    },
  });

  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.sessionToken).toBeDefined();

  // Extract cookie from response and add to context
  const setCookie = response.headers()["set-cookie"];
  if (setCookie) {
    // Parse set-cookie header
    const cookieMatch = setCookie.match(/authjs\.session-token=([^;]+)/);
    if (cookieMatch) {
      await page.context().addCookies([{
        name: "authjs.session-token",
        value: cookieMatch[1],
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        expires: Math.floor(Date.now() / 1000) + 86400,
      }]);
    }
  }

  // Save the authentication state
  await page.context().storageState({ path: authFile });
});

