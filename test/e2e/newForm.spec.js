/**
 * End-to-end coverage for a brand-new request.
 *
 * These tests intentionally submit through the React form. API-seeded edit
 * fixtures cannot catch a dead async species control or omissions while the
 * browser builds multipart FormData.
 */

const { test, expect } = require("@playwright/test");

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function signIn(page) {
  await page.goto("/signin");
  await page.fill("#username", "deeks");
  await page.fill("#password", "devpassword");
  await page.click('button[type="submit"]');
  await expect(page).not.toHaveURL(/signin/);
}

async function openNewForm(page) {
  await page.goto("/new");
  await page.waitForSelector("#new-form");
  await expect(page.locator("#page-loader")).toHaveCount(0);
}

async function selectSpecies(page, field, search, option) {
  await page.locator(`#${field} input[role="combobox"]`).fill(search);
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function submitAndReadResponse(page) {
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "POST" && url.pathname === "/new";
  });

  await page.click('#new-form button[type="submit"]');
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  return response.json();
}

async function deleteRequest(page, requestID) {
  if (requestID) await page.request.post(`/request/${requestID}/delete`);
}

test.describe("New request form", () => {
  test("still accepts a required species when taxonomy lookup is unavailable", async ({
    page,
  }) => {
    let requestID;
    let taxonomyRequests = 0;
    await page.route("**/api/taxonomy?**", (route) => {
      taxonomyRequests += 1;
      return route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          options: [],
          error: "Species lookup failed.",
        }),
      });
    });

    try {
      await signIn(page);
      await openNewForm(page);

      const speciesInput = page.locator('#species input[role="combobox"]');
      const oversizedLookup = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/taxonomy" &&
          response.status() === 502
      );
      await speciesInput.fill("x".repeat(201));
      await oversizedLookup;
      await expect(page.locator("#species [role=option]")).toHaveCount(0);

      await speciesInput.fill("Uncatalogued test species");
      await page
        .getByRole("option", {
          name: 'Use "Uncatalogued test species"',
          exact: true,
        })
        .click();
      expect(taxonomyRequests).toBe(2);

      await page.fill("#tissueAgeNum", "1");
      await page.check("#required-readme");
      await expect(page.locator("#species")).toContainText(
        "Uncatalogued test species"
      );
      expect(
        await page.evaluate(() =>
          document.querySelector("#new-form").checkValidity()
        )
      ).toBe(true);

      const created = await submitAndReadResponse(page);
      requestID = created.requestID;
      expect(created.warnings).toEqual([]);

      await page.waitForURL(new RegExp(`/request/${requestID}$`), {
        timeout: 15000,
      });
      await expect(page.locator("body")).toContainText(
        "Uncatalogued test species"
      );
    } finally {
      await deleteRequest(page, requestID);
    }
  });

  test("submits and reloads every field and optional section", async ({
    page,
  }) => {
    let requestID;
    const taxonomyOptions = {
      arabidopsis: {
        label: "Arabidopsis thaliana",
        value: "Arabidopsis thaliana",
        taxId: "3702",
      },
      pseudomonas: {
        label: "Pseudomonas syringae",
        value: "Pseudomonas syringae",
        taxId: "317",
      },
    };

    await page.route("**/api/taxonomy?**", (route) => {
      const term = new URL(route.request().url()).searchParams.get("term");
      const option = taxonomyOptions[(term || "").toLowerCase()];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ options: option ? [option] : [] }),
      });
    });

    try {
      await signIn(page);
      await openNewForm(page);

      await selectSpecies(
        page,
        "species",
        "arabidopsis",
        "Arabidopsis thaliana"
      );
      await selectSpecies(
        page,
        "secondSpecies",
        "pseudomonas",
        "Pseudomonas syringae"
      );

      await page.selectOption("#tissue", "flower");
      await page.fill("#tissueAgeNum", "12");
      await page.selectOption("#tissueAgeType", "week(s)");
      await page.selectOption("#growthConditions", "hydrophonics");
      await page.selectOption("#analysisType", "DIA");
      await page.selectOption("#secondaryAnalysisType", "PRM");
      await page.selectOption("#typeOfPTM", "Glycosylation");
      await page.selectOption("#quantitativeAnalysisRequired", "Absolute");
      await page.selectOption("#typeOfLabeling", "Metabolic");
      await page.selectOption("#labelUsed", "15N");
      await page.selectOption("#samplePrep", "FPLC purified");
      await page.selectOption("#digestion", "in solution");
      await page.selectOption("#enzyme", "Trypsin LysC");
      await page.fill("#projectDescription", "Complete browser project");
      await page.fill("#hopedAnalysis", "Complete browser analysis");
      await page.fill("#bufferComposition", "50 mM complete browser buffer");

      await page.click('button:has-text("Add Another Sample")');
      await page.click('button:has-text("Add Another Sample")');
      const sampleNumbers = page.locator(
        '#samples input[name="sampleNumbers[]"]'
      );
      const sampleLabels = page.locator(
        '#samples input[name="sampleLabels[]"]'
      );
      const sampleDescriptions = page.locator(
        '#samples input[name="sampleDescriptions[]"]'
      );
      await sampleNumbers.nth(0).fill("1");
      await sampleLabels.nth(0).fill("Infected leaf");
      await sampleDescriptions.nth(0).fill("First complete sample");
      await sampleNumbers.nth(1).fill("2");
      await sampleLabels.nth(1).fill("Control leaf");
      await sampleDescriptions.nth(1).fill("Second complete sample");

      await page.click('button:has-text("Add Another Construct")');
      await page.click('button:has-text("Add Another Construct")');
      const accessions = page.locator('#constructs input[name="accessions[]"]');
      const sequences = page.locator(
        '#constructs textarea[name="sequenceInfos[]"]'
      );
      const dbEntries = page.locator('#constructs input[name="dbEntries[]"]');
      await accessions.nth(0).fill("At1g01010");
      await sequences.nth(0).fill("MPEPTIDEONE");
      await dbEntries.nth(0).fill("DB-COMPLETE-1");
      await accessions.nth(1).fill("At2g02020");
      await sequences.nth(1).fill("MPEPTIDETWO");
      await dbEntries.nth(1).fill("DB-COMPLETE-2");

      await page.click('button:has-text("Add Note")');
      await page.click('button:has-text("Add Note")');
      await page.locator("#notes textarea").nth(0).fill("First complete note");
      await page.locator("#notes textarea").nth(1).fill("Second complete note");

      const imageDescriptions = [
        "First complete image",
        "Second complete image",
        "Third complete image",
        "Fourth complete image",
        "Fifth complete image",
      ];
      await page.setInputFiles(
        'input[type="file"]',
        imageDescriptions.map((_, index) => ({
          name: `complete-${index + 1}.png`,
          mimeType: "image/png",
          buffer: PNG_1X1,
        }))
      );
      await expect(page.locator('img[alt^="preview "]')).toHaveCount(5, {
        timeout: 15000,
      });
      for (const [index, description] of imageDescriptions.entries()) {
        await page.getByPlaceholder("Description").nth(index).fill(description);
      }

      await page.check("#required-readme");
      expect(
        await page.evaluate(() =>
          document.querySelector("#new-form").checkValidity()
        )
      ).toBe(true);

      const created = await submitAndReadResponse(page);
      requestID = created.requestID;
      expect(created.warnings).toEqual([]);

      await page.waitForURL(new RegExp(`/request/${requestID}$`), {
        timeout: 15000,
      });
      const body = page.locator("body");
      for (const expected of [
        "Arabidopsis thaliana",
        "Pseudomonas syringae",
        "Complete browser project",
        "Complete browser analysis",
        "50 mM complete browser buffer",
        "Infected leaf",
        "Control leaf",
        "At1g01010",
        "At2g02020",
        "First complete note",
        "Second complete note",
        "First complete image",
        "Second complete image",
        "Third complete image",
        "Fourth complete image",
        "Fifth complete image",
      ]) {
        await expect(body).toContainText(expected);
      }

      await page.goto(`/request/${requestID}/edit`);
      await page.waitForSelector("#new-form");
      await expect(page.locator("#species")).toContainText(
        "Arabidopsis thaliana"
      );
      await expect(page.locator("#secondSpecies")).toContainText(
        "Pseudomonas syringae"
      );
      await expect(page.locator("#analysisType")).toHaveValue("DIA");
      await expect(page.locator("#secondaryAnalysisType")).toHaveValue("PRM");
      for (const [selector, value] of [
        ["#tissue", "flower"],
        ["#tissueAgeNum", "12"],
        ["#tissueAgeType", "week(s)"],
        ["#growthConditions", "hydrophonics"],
        ["#typeOfPTM", "Glycosylation"],
        ["#quantitativeAnalysisRequired", "Absolute"],
        ["#typeOfLabeling", "Metabolic"],
        ["#labelUsed", "15N"],
        ["#samplePrep", "FPLC purified"],
        ["#digestion", "in solution"],
        ["#enzyme", "Trypsin LysC"],
        ["#projectDescription", "Complete browser project"],
        ["#hopedAnalysis", "Complete browser analysis"],
        ["#bufferComposition", "50 mM complete browser buffer"],
      ]) {
        await expect(page.locator(selector)).toHaveValue(value);
      }
      await expect(sampleNumbers.nth(0)).toHaveValue("1");
      await expect(sampleLabels.nth(0)).toHaveValue("Infected leaf");
      await expect(sampleDescriptions.nth(0)).toHaveValue(
        "First complete sample"
      );
      await expect(sampleNumbers.nth(1)).toHaveValue("2");
      await expect(sampleLabels.nth(1)).toHaveValue("Control leaf");
      await expect(sampleDescriptions.nth(1)).toHaveValue(
        "Second complete sample"
      );
      const savedConstructs = await page
        .locator("#constructs > div")
        .evaluateAll((rows) =>
          rows
            .map((row) => ({
              accession: row.querySelector('input[name="accessions[]"]').value,
              sequence: row.querySelector('textarea[name="sequenceInfos[]"]')
                .value,
              dbEntry: row.querySelector('input[name="dbEntries[]"]').value,
            }))
            .sort((left, right) =>
              left.accession.localeCompare(right.accession)
            )
        );
      expect(savedConstructs).toEqual([
        {
          accession: "At1g01010",
          sequence: "MPEPTIDEONE",
          dbEntry: "DB-COMPLETE-1",
        },
        {
          accession: "At2g02020",
          sequence: "MPEPTIDETWO",
          dbEntry: "DB-COMPLETE-2",
        },
      ]);
      await expect(page.locator("#notes textarea").nth(0)).toHaveValue(
        "First complete note"
      );
      await expect(page.locator("#notes textarea").nth(1)).toHaveValue(
        "Second complete note"
      );
      const savedImageDescriptions = await page
        .getByPlaceholder("Enter image description")
        .evaluateAll((inputs) => inputs.map((input) => input.value).sort());
      expect(savedImageDescriptions).toEqual([...imageDescriptions].sort());

      const taxIds = await page.evaluate(() => ({
        speciesTaxId: window.existingRequest.speciesTaxId,
        secondSpeciesTaxId: window.existingRequest.secondSpeciesTaxId,
      }));
      expect(taxIds).toEqual({
        speciesTaxId: "3702",
        secondSpeciesTaxId: "317",
      });
    } finally {
      await deleteRequest(page, requestID);
    }
  });
});
