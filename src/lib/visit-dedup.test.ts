import { test } from "node:test";
import assert from "node:assert/strict";
import { VISIT_KEY, visitDecision, type VisitStorage } from "@/lib/visit-dedup";

/**
 * Phase 00.6, AC-3.2/3.3: the visit-dedup decision is deliberate on BOTH
 * paths — session storage available (dedupe) and unavailable (documented
 * per-impression degradation), never a silent no-op.
 */

class MemoryStorage implements VisitStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key) ?? null : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  get size() {
    return this.map.size;
  }
  dump() {
    return [...this.map.entries()];
  }
}

class ThrowingStorage implements VisitStorage {
  getItem(): string | null {
    throw new Error("SecurityError: access denied");
  }
  setItem(): void {
    throw new Error("SecurityError: access denied");
  }
}

test("first impression records + writes the session marker", () => {
  const storage = new MemoryStorage();
  assert.equal(visitDecision("foundersbid", storage), "record");
  const raw = storage.dump().find(([k]) => k === VISIT_KEY)?.[1];
  assert.equal(raw, JSON.stringify(["foundersbid"]));
});

test("the same product later in the session is deduped", () => {
  const storage = new MemoryStorage();
  assert.equal(visitDecision("foundersbid", storage), "record");
  assert.equal(visitDecision("foundersbid", storage), "deduped");
  assert.equal(visitDecision("foundersbid", storage), "deduped");
});

test("different products in the same session each record once", () => {
  const storage = new MemoryStorage();
  assert.equal(visitDecision("bidthrone", storage), "record");
  assert.equal(visitDecision("culturebid", storage), "record");
  assert.equal(visitDecision("bidthrone", storage), "deduped");
  assert.equal(visitDecision("culturebid", storage), "deduped");
  // the marker accumulates, it does not replace
  const raw = storage.dump().find(([k]) => k === VISIT_KEY)?.[1];
  assert.equal(raw, JSON.stringify(["bidthrone", "culturebid"]));
});

test("corrupt stored JSON degrades to record (per-impression), not crash", () => {
  const storage = new MemoryStorage();
  storage.setItem(VISIT_KEY, "{not json");
  assert.equal(visitDecision("bidthrone", storage), "record");
  // the corrupt value was repaired into a valid list containing the site
  const raw = storage.dump().find(([k]) => k === VISIT_KEY)?.[1];
  assert.equal(JSON.parse(raw as string)[0], "bidthrone");
});

test("storage unavailable (null) deliberately records — the documented degradation", () => {
  assert.equal(visitDecision("bidthrone", null), "record");
  assert.equal(visitDecision("bidthrone", null), "record");
});

test("storage that throws (private mode) deliberately records — the documented degradation", () => {
  const storage = new ThrowingStorage();
  assert.equal(visitDecision("bidthrone", storage), "record");
});
