/**
 * Render the email templates.
 *
 * In dev mode the mailer short-circuits to a console log and never touches
 * these files, so a broken template stays invisible until it reaches
 * production - where the failure surfaces as a notification that silently never
 * arrives. Rendering them here is the only place they get exercised.
 */

const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

const TEMPLATE_ROOT = path.resolve(__dirname, "../../views/email");
const TEMPLATES = ["new-request", "updated-request", "request-complete"];

/** A request shaped the way the mailer passes it. */
const sampleRequest = {
  id: "abc-123",
  janCode: "gd260729",
  status: "samples received",
  createdBy: "scientist",
};

/**
 * @param {string} template
 * @param {string} file
 * @param {object} locals
 * @returns {string}
 */
function render(template, file, locals) {
  const filename = path.join(TEMPLATE_ROOT, template, file);
  return ejs.render(fs.readFileSync(filename, "utf8"), locals, { filename });
}

describe.each(TEMPLATES)("%s email", (template) => {
  const locals = { request: sampleRequest, baseURL: "https://example.test" };

  it("renders the HTML part", () => {
    const html = render(template, "html.ejs", locals);
    expect(html).toContain(sampleRequest.janCode);
    expect(html).toContain("https://example.test");
  });

  it("renders the text part", () => {
    const text = render(template, "text.ejs", locals);
    expect(text).toContain(sampleRequest.janCode);
  });

  it("escapes a JAN code containing markup", () => {
    const html = render(template, "html.ejs", {
      ...locals,
      request: { ...sampleRequest, janCode: "<script>alert(1)</script>" },
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("updated-request specifics", () => {
  const locals = { request: sampleRequest, baseURL: "https://example.test" };

  // Regression: this mail is sent for edits, notes and assignments alike, but
  // always announced a status change - so adding a note told the submitter
  // their status had changed when it had not.
  it("states the actual reason when one is given", () => {
    const html = render("updated-request", "html.ejs", {
      ...locals,
      reason: "A note was added to the request.",
    });
    expect(html).toContain("A note was added to the request.");

    const text = render("updated-request", "text.ejs", {
      ...locals,
      reason: "A note was added to the request.",
    });
    expect(text).toContain("A note was added to the request.");
  });

  it("falls back to a neutral sentence with no reason", () => {
    const html = render("updated-request", "html.ejs", locals);
    expect(html).toContain("The request details were updated.");
  });

  // The VPN banner tells an admin who the mail was really addressed to. It was
  // being computed and then never rendered by any template.
  it("shows the VPN-mode banner when present", () => {
    const banner = "[VPN MODE] This email would have been sent to: a@b.test";
    expect(
      render("updated-request", "html.ejs", { ...locals, vpnModeHeader: banner })
    ).toContain(banner);
    expect(
      render("updated-request", "text.ejs", { ...locals, vpnModeHeader: banner })
    ).toContain(banner);
  });

  it("omits the banner when not in VPN mode", () => {
    expect(render("updated-request", "html.ejs", locals)).not.toContain(
      "VPN MODE"
    );
  });
});
