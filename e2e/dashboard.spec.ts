import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("should load dashboard when authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);
    
    // Should show dashboard content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display user information", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Should show user name or test user info - check for any header content
    await expect(page.locator("header")).toBeVisible();
  });

  test("should show Spotify connection UI", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Should show either "Connect Spotify" button or session controls
    const spotifyButton = page.getByRole("button", { name: /Connect Spotify|Start Session/i });
    await expect(spotifyButton.first()).toBeVisible();
  });

  test("should have logout button", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Should have logout button
    const logoutButton = page.getByRole("button", { name: /log out/i });
    await expect(logoutButton).toBeVisible();
  });
});

test.describe("Login Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Clear auth for this test

  test("should show login page when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should display TikTok login button", async ({ page }) => {
    await page.goto("/login");
    
    // Should show TikTok login button
    const loginButton = page.getByRole("button", { name: /continue with tiktok/i });
    await expect(loginButton).toBeVisible();
  });

  test("should show welcome message", async ({ page }) => {
    await page.goto("/login");
    
    // Should show welcome text
    await expect(page.getByText(/Welcome to SongFlow/i)).toBeVisible();
  });
});
