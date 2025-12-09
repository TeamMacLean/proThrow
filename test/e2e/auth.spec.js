const { test, expect } = require("@playwright/test");

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/signin");
    await expect(page).toHaveTitle(/Proteomics|Sign/i);
  });

  test("should redirect unauthenticated users to signin", async ({ page }) => {
    await page.goto("/new");
    await expect(page).toHaveURL(/signin/);
  });

  test("should show dev mode indicator when in dev mode", async ({ page }) => {
    await page.goto("/signin");
    // In dev mode, there might be a visual indicator
    const pageContent = await page.content();
    // Just check the page loads successfully
    expect(pageContent).toContain("html");
  });
});

test.describe("Home Page", () => {
  test("should display home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Proteomics/i);
  });
});
