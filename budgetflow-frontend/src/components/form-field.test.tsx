import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormField } from "./form-field";

describe("FormField", () => {
  it("renders a label and child control", () => {
    const html = renderToStaticMarkup(
      <FormField label="프로젝트명">
        <input name="name" />
      </FormField>,
    );

    expect(html).toContain("프로젝트명");
    expect(html).toContain("name=\"name\"");
  });

  it("renders error text only when provided", () => {
    const withError = renderToStaticMarkup(
      <FormField label="금액" error="금액을 입력하세요.">
        <input name="amount" />
      </FormField>,
    );
    const withoutError = renderToStaticMarkup(
      <FormField label="금액">
        <input name="amount" />
      </FormField>,
    );

    expect(withError).toContain("금액을 입력하세요.");
    expect(withoutError).not.toContain("금액을 입력하세요.");
  });

  it("links field errors to controls for assistive technology", () => {
    const html = renderToStaticMarkup(
      <FormField label="금액" error="금액을 입력하세요.">
        <input name="amount" />
      </FormField>,
    );

    expect(html).toContain("aria-invalid=\"true\"");
    expect(html).toContain("aria-describedby=");
    expect(html).toContain("id=\"");
  });
});
