/**
 * RC3, S-10.1: session-resolution failure policy.
 *
 * Before this release, `getSession()` caught EVERY exception and returned
 * null — a database outage or auth-stack fault masqueraded as "anonymous
 * user". Now: no/invalid session resolves to null (Better Auth's documented
 * behavior); an unexpected rejection fails visibly as `auth_unavailable`.
 * The tests pin the exact branch logic in `resolveSession` (the seam
 * `getSession` delegates to), so the contract cannot drift back.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSession, AuthzError } from "@/lib/authz";

const fakeRequest = () => new Request("http://foundersbid.lol/dashboard");

test("resolveSession: no request context is anonymous (null), no error", async () => {
  let called = false;
  const out = await resolveSession(null, () => {
    called = true;
    return Promise.resolve(null);
  });
  assert.equal(out, null);
  assert.equal(called, false, "no session lookup happens without a request");
});

test("resolveSession: a resolved null session stays anonymous", async () => {
  const out = await resolveSession(fakeRequest(), async () => null);
  assert.equal(out, null);
});

test("resolveSession: a resolved session passes through untouched", async () => {
  const session = { user: { id: "usr_1" } } as never;
  const out = await resolveSession(fakeRequest(), async () => session);
  assert.equal(out, session);
});

test("resolveSession: an internal rejection fails visibly, never as anonymous", async () => {
  const logSpy = { calls: [] as unknown[] };
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logSpy.calls.push(args);
  };
  try {
    await assert.rejects(
      resolveSession(fakeRequest(), () => Promise.reject(new Error("pglite exploded: relation not found"))),
      (err: unknown) => {
        assert.ok(err instanceof AuthzError, "must be an AuthzError, not a raw error");
        const authz = err as AuthzError;
        assert.equal(authz.status, 500);
        assert.equal(authz.code, "auth_unavailable");
        assert.equal(authz.message, "We couldn't confirm your session. Please try again.");
        return true;
      },
    );
  } finally {
    console.error = original;
  }
  assert.equal(logSpy.calls.length, 1, "the failure is logged exactly once");
  const logged = logSpy.calls[0] as unknown[];
  const text = logged.map(String).join(" ");
  assert.match(text, /\[authz\] session resolution failed on GET http:\/\/foundersbid\.lol\/dashboard/);
  assert.match(text, /pglite exploded/, "internal details are logged server-side");
  // ...and the client-facing message never leaks them:
  await assert.rejects(
    resolveSession(fakeRequest(), () => Promise.reject(new Error("secret stack detail"))),
    (err: unknown) => {
      assert.equal((err as AuthzError).message, "We couldn't confirm your session. Please try again.");
      assert.ok(!String((err as AuthzError).message).includes("secret stack detail"));
      return true;
    },
  );
});
