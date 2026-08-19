import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function load() {
  return import(
    pathToFileURL(
      path.join(__dirname, "../src/lib/legacy-wp-form-post.ts"),
    ).href
  );
}

describe("isLegacyWordpressFormPath", () => {
  it("matches leftover WP / PHP form handlers", async () => {
    const { isLegacyWordpressFormPath } = await load();
    assert.equal(isLegacyWordpressFormPath("/inc/send-dg-enquiry.php"), true);
    assert.equal(isLegacyWordpressFormPath("/inc/send-contact.php"), true);
    assert.equal(isLegacyWordpressFormPath("/wp-admin/admin-ajax.php"), true);
    assert.equal(isLegacyWordpressFormPath("/wp-admin/admin-post.php"), true);
    assert.equal(
      isLegacyWordpressFormPath("/wp-json/contact-form-7/v1/contact-forms/12/feedback"),
      true,
    );
    assert.equal(isLegacyWordpressFormPath("/xmlrpc.php"), false);
    assert.equal(isLegacyWordpressFormPath("/contact"), false);
  });
});

describe("shouldCaptureHtmlForm", () => {
  it("captures POST and empty-action forms, not GET navigation", async () => {
    const { shouldCaptureHtmlForm } = await load();
    assert.equal(
      shouldCaptureHtmlForm({
        method: "POST",
        action: "/inc/send-contact.php",
      }),
      true,
    );
    assert.equal(
      shouldCaptureHtmlForm({ method: null, action: null, formId: "contact" }),
      true,
    );
    assert.equal(
      shouldCaptureHtmlForm({
        method: "get",
        action: "https://digitalgate.com.au/contact",
      }),
      false,
    );
    assert.equal(
      shouldCaptureHtmlForm({ method: "post", action: "/api/public/dg-enquiry" }),
      false,
    );
    assert.equal(
      shouldCaptureHtmlForm({ formId: "rr-address-form", method: "post" }),
      false,
    );
  });
});
