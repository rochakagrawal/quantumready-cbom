import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "./index.mjs";

const valid = {
  bomFormat: "CycloneDX",
  specVersion: "1.7",
  serialNumber: "urn:uuid:00000000-0000-4000-8000-000000000000",
  version: 1,
  metadata: {
    tools: { components: [{ type: "application", name: "QuantumReady Discovery Engine" }] },
    properties: [
      { name: "quantumready:engine.name", value: "QuantumReady Discovery Engine" },
      { name: "quantumready:engine.version", value: "0.10.14" },
      { name: "quantumready:report.id", value: "sample" },
      { name: "quantumready:scope", value: "repository" },
      { name: "quantumready:scan.kind", value: "repo" },
      { name: "quantumready:target.ref", value: "main" },
      { name: "quantumready:score.method", value: "Our own index; not the CSA Quantum Readiness Index." },
      { name: "quantumready:coverage.complete", value: "true" }
    ]
  },
  components: [
    {
      type: "cryptographic-asset",
      "bom-ref": "crypto:payments:md5:128:any:any:production",
      name: "MD5",
      cryptoProperties: { assetType: "algorithm" },
      evidence: {
        occurrences: [{ "bom-ref": "occ:1", location: "security.js", line: 2 }]
      },
      properties: [
        { name: "quantumready:risk", value: "deprecated-or-weak" },
        { name: "quantumready:owner", value: "you" },
        { name: "quantumready:action", value: "fix-now" },
        { name: "quantumready:environment", value: "production" }
      ]
    }
  ]
};

test("accepts a conforming document", () => {
  const result = validate(valid);
  assert.deepEqual(result.errors, []);
});

test("rejects a missing required metadata property", () => {
  const doc = structuredClone(valid);
  doc.metadata.properties = doc.metadata.properties.filter(
    (p) => p.name !== "quantumready:score.method"
  );
  const result = validate(doc);
  assert.ok(result.errors.some((e) => e.includes("quantumready:score.method")));
});

test("rejects a duplicate bom-ref", () => {
  const doc = structuredClone(valid);
  doc.components.push(structuredClone(valid.components[0]));
  const result = validate(doc);
  assert.ok(result.errors.some((e) => e.includes("repeats bom-ref")));
});

test("rejects an unknown risk value", () => {
  const doc = structuredClone(valid);
  doc.components[0].properties.find((p) => p.name === "quantumready:risk").value = "bad";
  const result = validate(doc);
  assert.ok(result.errors.some((e) => e.includes("quantumready:risk")));
});

test("warns when the score method does not distinguish the CSA index", () => {
  const doc = structuredClone(valid);
  doc.metadata.properties.find((p) => p.name === "quantumready:score.method").value = "Weighted score.";
  const result = validate(doc);
  assert.ok(result.warnings.some((w) => w.includes("CSA")));
});
