import { test } from "node:test";
import assert from "node:assert/strict";
import { orchestrate } from "../src/orchestrator.mjs";
import { verify } from "../src/verifier.mjs";
import { requestAccess } from "../src/vault.mjs";

test("orchestrator produces 3 events", () => {
  const { events, denials } = orchestrate();
  assert.equal(events.length, 3);
  assert.equal(denials.length, 0);
});

test("produced stream passes verifier (all 3 invariants + chain)", () => {
  const { events } = orchestrate();
  const r = verify(events);
  assert.ok(r.ok, JSON.stringify(r.errors, null, 2));
});

test("chain is hash-linked (event 1's prev_hash = event 0's hash)", () => {
  const { events } = orchestrate();
  assert.equal(events[1].prev_hash, events[0].hash);
  assert.equal(events[2].prev_hash, events[1].hash);
});

test("vault blocks generate on CUI-Specified-NoForn", () => {
  const r = requestAccess({
    cuiTier: "CUI-SPECIFIED-NOFORN", exportTier: "ITAR", foreignTier: "US-PERSON-ONLY",
    action: "generate", agentUserStatus: "us-person-verified"
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /generate.*not in resolved allowed_actions/);
});

test("vault blocks read on CLASSIFIED-SECRET when user lacks secret-clearance", () => {
  const r = requestAccess({
    cuiTier: "CLASSIFIED-SECRET", exportTier: "NOT-EXPORT-CONTROLLED", foreignTier: "US-PERSON-ONLY",
    action: "read", agentUserStatus: "us-person-verified"
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /does not meet resolved minimum/);
});

test("vault permits read on CUI-Basic for us-person-verified user", () => {
  const r = requestAccess({
    cuiTier: "CUI-BASIC", exportTier: "NOT-EXPORT-CONTROLLED", foreignTier: "US-PERSON-ONLY",
    action: "read", agentUserStatus: "us-person-verified"
  });
  assert.equal(r.allowed, true);
});

test("verifier catches tampered hash", () => {
  const { events } = orchestrate();
  const tampered = JSON.parse(JSON.stringify(events));
  tampered[1].hash = "0".repeat(64);
  const r = verify(tampered);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("hash")));
});

test("verifier catches missing distribution_statement on CUI-Specified", () => {
  const { events } = orchestrate();
  const tampered = JSON.parse(JSON.stringify(events));
  delete tampered[1].distribution_statement;
  const r = verify(tampered);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("invariant#1")));
});

test("verifier catches missed 72-hour window", () => {
  const { events } = orchestrate();
  const tampered = JSON.parse(JSON.stringify(events));
  tampered[2].dfars_cyber_incident_report_ref.filed_at = "2026-11-10T18:00:00Z";  // ~7 days late
  const r = verify(tampered);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("72-hour")));
});
