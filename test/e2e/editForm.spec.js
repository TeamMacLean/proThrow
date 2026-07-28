/**
 * End-to-end tests for the request edit form.
 *
 * These run the real React bundle in a real browser, which is the layer the
 * jest suites cannot reach: the integration tests assert on the response
 * string, and the jsdom tests parse the server's markup but deliberately do not
 * load /js/app.js. Anything that only breaks once the bundle actually executes
 * - a hook mistake, a dead event handler, a control that silently submits the
 * form - is only visible here.
 *
 * Requires RethinkDB, and a current bundle: run `yarn build` before this.
 */

const { test, expect } = require("@playwright/test");

/** Smallest valid PNG, for exercising the upload control. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/**
 * A complete, valid request payload. Values must exist in lib/formOptions.js or
 * the server rejects them.
 */
const validFields = (overrides = {}) => ({
  species: "Homo sapiens",
  secondSpecies: "",
  tissue: "leaves",
  tissueAgeNum: "10",
  tissueAgeType: "day(s)",
  growthConditions: "soil grown",
  analysisType: "Discovery",
  secondaryAnalysisType: "None",
  typeOfPTM: "None",
  quantitativeAnalysisRequired: "None",
  typeOfLabeling: "None",
  labelUsed: "None",
  samplePrep: "IP",
  digestion: "in gel",
  enzyme: "Trypsin",
  projectDescription: "E2E fixture",
  hopedAnalysis: "hopes",
  bufferComposition: "buffer",
  ...overrides,
});

/**
 * Sign in through the real form so the browser context holds the session.
 *
 * @param {import('@playwright/test').Page} page
 */
async function signIn(page) {
  await page.goto("/signin");
  await page.fill("#username", "deeks");
  await page.fill("#password", "devpassword");
  await page.click('button[type="submit"]');
  await expect(page).not.toHaveURL(/signin/);
}

/**
 * Create a request over the API. page.request shares the page's cookie jar, so
 * this runs as the signed-in user.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [overrides]
 * @returns {Promise<{requestID: string, janCode: string}>}
 */
async function createRequest(page, overrides) {
  const response = await page.request.post("/new", {
    multipart: validFields(overrides),
  });
  expect(response.status()).toBe(200);
  return response.json();
}

/**
 * Delete a request so the test leaves nothing behind.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} requestID
 */
async function deleteRequest(page, requestID) {
  await page.request.post(`/request/${requestID}/delete`);
}

/**
 * Open the edit form and wait for React to take over.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} requestID
 */
async function openEditForm(page, requestID) {
  await page.goto(`/request/${requestID}/edit`);
  await page.waitForSelector("#new-form");
  // React removes the server-rendered loader once it has mounted.
  await expect(page.locator("#page-loader")).toHaveCount(0);
}

test.describe("Edit form", () => {
  let requestID;
  let janCode;

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    const created = await createRequest(page);
    requestID = created.requestID;
    janCode = created.janCode;
  });

  test.afterEach(async ({ page }) => {
    if (requestID) await deleteRequest(page, requestID);
  });

  // The regression that started all of this: a stray closing script tag ended
  // the injected block early, so window.existingRequest was never assigned and
  // every field on this form loaded blank.
  test("pre-fills every field from the stored request", async ({ page }) => {
    await openEditForm(page, requestID);

    await expect(page.locator("#janCode")).toHaveValue(janCode);
    await expect(page.locator("#tissue")).toHaveValue("leaves");
    await expect(page.locator("#tissueAgeNum")).toHaveValue("10");
    await expect(page.locator("#tissueAgeType")).toHaveValue("day(s)");
    await expect(page.locator("#samplePrep")).toHaveValue("IP");
    await expect(page.locator("#digestion")).toHaveValue("in gel");
    await expect(page.locator("#enzyme")).toHaveValue("Trypsin");
    await expect(page.locator("#projectDescription")).toHaveValue("E2E fixture");

    // The species widget is react-select, not a native input; it renders the
    // stored value only because defaultOptions is enabled.
    await expect(page.locator("#species")).toContainText("Homo sapiens");

    // The concurrency check needs the timestamp the page was loaded with.
    await expect(page.locator('input[name="updatedAt"]')).toHaveValue(/\d{4}-/);
  });

  test("pre-ticks the confirmation so an admin need not re-confirm it", async ({
    page,
  }) => {
    await openEditForm(page, requestID);

    await expect(page.locator("#required-readme")).toBeChecked();

    // The whole point: the form is submittable without touching anything.
    const valid = await page.evaluate(
      () => document.querySelector("#new-form").checkValidity() === true
    );
    expect(valid).toBe(true);
  });

  test("saves an edit and redirects to the request", async ({ page }) => {
    await openEditForm(page, requestID);

    await page.fill("#projectDescription", "Corrected by an admin");
    await page.click('#new-form button[type="submit"]');

    await page.waitForURL(new RegExp(`/request/${requestID}$`), {
      timeout: 15000,
    });
    await expect(page.locator("body")).toContainText("Corrected by an admin");
  });

  test("adds and removes sample rows", async ({ page }) => {
    await openEditForm(page, requestID);

    const rows = page.locator("#samples .dragg");
    await expect(rows).toHaveCount(0);

    await page.click('button:has-text("Add Another Sample")');
    await page.click('button:has-text("Add Another Sample")');
    await expect(rows).toHaveCount(2);

    // Each row must own exactly one set of inputs.
    await expect(page.locator('#samples input[name="sampleNumbers[]"]')).toHaveCount(
      2
    );

    await page.locator("#samples button.removeSample").first().click();
    await expect(rows).toHaveCount(1);
  });

  test("persists added samples through a save", async ({ page }) => {
    await openEditForm(page, requestID);

    await page.click('button:has-text("Add Another Sample")');
    await page.fill('#samples input[name="sampleNumbers[]"]', "1");
    await page.fill('#samples input[name="sampleLabels[]"]', "Leaf disc");
    await page.fill('#samples input[name="sampleDescriptions[]"]', "Infected");

    await page.click('#new-form button[type="submit"]');
    await page.waitForURL(new RegExp(`/request/${requestID}$`), {
      timeout: 15000,
    });

    await expect(page.locator("body")).toContainText("Leaf disc");

    // And they survive a second edit that does not touch them.
    await openEditForm(page, requestID);
    await expect(page.locator('#samples input[name="sampleNumbers[]"]')).toHaveValue(
      "1"
    );
  });

  test("adds and removes notes", async ({ page }) => {
    await openEditForm(page, requestID);

    await page.click('button:has-text("Add Note")');
    await page.fill("#notes textarea", "Check the buffer");
    await expect(page.locator("#notes textarea")).toHaveCount(1);

    await page.click('#notes button[title="Remove note"]');
    await expect(page.locator("#notes textarea")).toHaveCount(0);
  });

  // Regression: this button had no type, so inside a form it defaulted to
  // submit and saved the whole request when the user only wanted to drop an
  // image they had just added.
  //
  // The assertion has to watch the network rather than the URL: React's submit
  // handler calls preventDefault, so an unintended submit does not navigate
  // anywhere - it quietly posts and saves, which is precisely what makes the
  // bug easy to miss.
  test("removing a newly added image does not submit the form", async ({
    page,
  }) => {
    await openEditForm(page, requestID);

    const submissions = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && new URL(req.url()).pathname === "/new") {
        submissions.push(req.url());
      }
    });

    // Two images, removing the first. With one image the clicked button takes
    // itself out of the DOM before the browser performs the submit, which masks
    // the bug; with two, React reuses that node for the remaining image so the
    // button is still connected and the submission actually goes through.
    await page.setInputFiles('input[type="file"]', [
      { name: "gel-a.png", mimeType: "image/png", buffer: PNG_1X1 },
      { name: "gel-b.png", mimeType: "image/png", buffer: PNG_1X1 },
    ]);

    const removeButtons = page.locator('button:has-text("Remove")');
    await expect(removeButtons).toHaveCount(2, { timeout: 15000 });

    await removeButtons.first().click();

    await expect(removeButtons).toHaveCount(1);
    // Give any stray submission time to leave the browser before asserting.
    await page.waitForTimeout(750);
    expect(submissions).toEqual([]);
    await expect(page).toHaveURL(new RegExp(`/request/${requestID}/edit$`));
  });

  test("cancel edit returns to the request without saving", async ({ page }) => {
    await openEditForm(page, requestID);

    await page.click('button:has-text("Cancel Edit")');

    // Unsaved edits would prompt; nothing was changed, so this goes straight back.
    await page.waitForURL(new RegExp(`/request/${requestID}$`), {
      timeout: 15000,
    });
    await expect(page.locator("body")).toContainText("E2E fixture");
  });

  test("surfaces a server validation error instead of a generic failure", async ({
    page,
  }) => {
    await openEditForm(page, requestID);

    // A label the server's pattern rejects. The browser blocks the submit on
    // its own pattern first, so that is removed to exercise the server path.
    await page.evaluate(() =>
      document.querySelector("#janCode").removeAttribute("pattern")
    );
    await page.fill("#janCode", "not a valid label");
    await page.click('#new-form button[type="submit"]');

    await expect(page.locator(".toastify")).toContainText(/label/i, {
      timeout: 15000,
    });
    // Nothing was saved, so we are still on the form.
    await expect(page).toHaveURL(new RegExp(`/request/${requestID}/edit$`));
  });
});

test.describe("Clone form", () => {
  let sourceID;

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    const created = await createRequest(page);
    sourceID = created.requestID;
  });

  test.afterEach(async ({ page }) => {
    if (sourceID) await deleteRequest(page, sourceID);
  });

  test("copies the values but still requires its own confirmation", async ({
    page,
  }) => {
    await page.goto(`/request/${sourceID}/clone`);
    await page.waitForSelector("#new-form");

    await expect(page.locator("#tissue")).toHaveValue("leaves");
    await expect(page.locator("#species")).toContainText("Homo sapiens");

    // A clone is a new physical submission, so the sample-prep confirmation
    // has to be made again rather than inherited.
    await expect(page.locator("#required-readme")).not.toBeChecked();

    // And it must post as a new request, not an edit of the original.
    await expect(page.locator('input[name="requestID"]')).toHaveCount(0);
    await expect(page.locator("#janCode")).toHaveCount(0);
  });
});
