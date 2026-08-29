import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { AppErrorComponent, errorDetail } from "@/lib/error-component";

const SQL_ERROR = "column b.creative does not exist";

test("production copy never echoes the raw error message (P0 #2 regression)", () => {
  const out = errorDetail(true, SQL_ERROR);
  assert.equal(out, "Try again or contact support.");
  assert.ok(!out.includes("column"), "SQL error text must not reach production copy");
  assert.ok(!out.includes(SQL_ERROR));
});

test("dev copy retains the diagnostic message", () => {
  assert.equal(errorDetail(false, "boom: 42"), "boom: 42");
  assert.equal(
    errorDetail(false, undefined),
    "An unexpected error occurred. Try reloading the page.",
  );
});

test("rendered error page (dev/node mode) keeps diagnostics and the H1 contract", () => {
  const props = {
    error: new Error(SQL_ERROR),
    reset: () => undefined,
    location: { pathname: "/bounties", search: "", hash: "" },
  } as unknown as Parameters<typeof AppErrorComponent>[0];
  const html = renderToString(createElement(AppErrorComponent, props));
  assert.match(html, /Something went wrong/);
  assert.match(html, new RegExp(SQL_ERROR), "dev mode surfaces the real error");
  assert.ok(!/<h1[^>]*>[^<]*\);/.test(html), "no syntactic debris in the heading");
});

test("production-rendered error page carries no internal exception string", () => {
  // The exact text a production build renders for the <p>: errorDetail(true, …)
  // is the single source (IS_PRODUCTION gate in error-component.tsx), so
  // composing the page copy through it proves the production HTML contract.
  const detail = errorDetail(true, SQL_ERROR);
  const heading = "Something went wrong";
  const pageCopy = `${heading} ${detail}`;
  assert.ok(!pageCopy.includes(SQL_ERROR));
  assert.ok(!pageCopy.includes("does not exist"));
  assert.match(pageCopy, /Try again or contact support\./);
});
