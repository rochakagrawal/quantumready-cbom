#!/usr/bin/env node
// QuantumReady CBOM profile validator, version 0.1.
// Zero dependencies. Validates the profile's required fields, not the whole
// CycloneDX schema. Exit code 1 on error, 0 on success (warnings allowed).

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_META = [
  "quantumready:engine.name",
  "quantumready:engine.version",
  "quantumready:report.id",
  "quantumready:scope",
  "quantumready:scan.kind",
  "quantumready:target.ref",
  "quantumready:score.method",
  "quantumready:coverage.complete",
];

const REQUIRED_COMPONENT = [
  "quantumready:risk",
  "quantumready:owner",
  "quantumready:action",
  "quantumready:environment",
];

const RISK = new Set([
  "quantum-vulnerable",
  "deprecated-or-weak",
  "adequate",
  "quantum-resistant",
  "post-quantum",
]);
const OWNER = new Set(["you", "dependency", "platform", "vendor"]);
const ACTION = new Set(["fix-now", "plan", "monitor", "none"]);
const ENVIRONMENT = new Set(["production", "test", "build", "unknown"]);

function propsToMap(properties = []) {
  const map = new Map();
  for (const p of properties) {
    if (!p || typeof p.name !== "string") continue;
    if (!map.has(p.name)) map.set(p.name, []);
    map.get(p.name).push(p.value);
  }
  return map;
}

function toolNames(metadata = {}) {
  const tools = metadata.tools;
  if (!tools) return [];
  if (Array.isArray(tools)) return tools.map((t) => t?.name).filter(Boolean);
  if (Array.isArray(tools.components)) return tools.components.map((t) => t?.name).filter(Boolean);
  return [];
}

export function validate(doc, source = "input") {
  const errors = [];
  const warnings = [];

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { source, errors: ["document is not a JSON object"], warnings, stats: {} };
  }

  if (doc.bomFormat !== "CycloneDX") errors.push('bomFormat must be "CycloneDX"');
  if (typeof doc.specVersion !== "string" || !doc.specVersion.startsWith("1.7")) {
    errors.push(`specVersion must start with "1.7" (found ${JSON.stringify(doc.specVersion)})`);
  }
  if (typeof doc.serialNumber !== "string" || !doc.serialNumber.startsWith("urn:uuid:")) {
    errors.push('serialNumber must be a "urn:uuid:" URN');
  }

  const names = toolNames(doc.metadata);
  if (names.length === 0) warnings.push("metadata.tools.components[] is empty; the producing tool is unnamed");

  const meta = propsToMap(doc.metadata?.properties);
  for (const key of REQUIRED_META) {
    if (!meta.has(key)) errors.push(`missing required metadata property: ${key}`);
  }
  if (meta.has("quantumready:coverage.complete")) {
    const value = String(meta.get("quantumready:coverage.complete")[0]);
    if (value !== "true" && value !== "false") {
      errors.push("quantumready:coverage.complete must be true or false");
    }
  }
  if (meta.has("quantumready:score.method")) {
    const method = String(meta.get("quantumready:score.method")[0]).toLowerCase();
    if (!method.includes("not the csa")) {
      warnings.push('quantumready:score.method should state that the score is not the CSA Quantum Readiness Index');
    }
  }

  const components = Array.isArray(doc.components) ? doc.components : [];
  if (components.length === 0) errors.push("components[] is empty");
  const crypto = components.filter((c) => c?.type === "cryptographic-asset");
  if (components.length > 0 && crypto.length === 0) {
    errors.push('components[] contains no "cryptographic-asset"');
  }

  const refs = new Set();
  components.forEach((component, index) => {
    const label = component?.name ? `component ${JSON.stringify(component.name)}` : `components[${index}]`;
    if (!component || typeof component !== "object") {
      errors.push(`${label} is not an object`);
      return;
    }
    if (typeof component["bom-ref"] !== "string" || component["bom-ref"].length === 0) {
      errors.push(`${label} has no bom-ref`);
    } else if (refs.has(component["bom-ref"])) {
      errors.push(`${label} repeats bom-ref ${JSON.stringify(component["bom-ref"])}`);
    } else {
      refs.add(component["bom-ref"]);
    }
    if (typeof component.name !== "string" || component.name.length === 0) {
      errors.push(`${label} has no name`);
    }
    if (component.type === "cryptographic-asset" && !component.cryptoProperties) {
      warnings.push(`${label} is a cryptographic-asset without cryptoProperties`);
    }

    const props = propsToMap(component.properties);
    for (const key of REQUIRED_COMPONENT) {
      if (!props.has(key)) errors.push(`${label} is missing ${key}`);
    }
    const checks = [
      ["quantumready:risk", RISK],
      ["quantumready:owner", OWNER],
      ["quantumready:action", ACTION],
      ["quantumready:environment", ENVIRONMENT],
    ];
    for (const [key, allowed] of checks) {
      if (!props.has(key)) continue;
      const value = String(props.get(key)[0]);
      if (!allowed.has(value)) {
        errors.push(`${label} has ${key}=${JSON.stringify(value)}; expected one of ${[...allowed].join(", ")}`);
      }
    }
    const occurrences = component.evidence?.occurrences;
    if (!Array.isArray(occurrences) || occurrences.length === 0) {
      warnings.push(`${label} has no evidence.occurrences[]; the finding has no location`);
    }
  });

  return {
    source,
    errors,
    warnings,
    stats: {
      specVersion: doc.specVersion,
      components: components.length,
      cryptoComponents: crypto.length,
      metadataProperties: doc.metadata?.properties?.length ?? 0,
    },
  };
}

function main(argv) {
  const file = argv[2];
  if (!file) {
    console.error("usage: node validator/index.mjs <file.cbom.json>");
    process.exit(2);
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`FAIL ${file}\n  ${error.message}`);
    process.exit(1);
  }
  const result = validate(doc, file);
  if (result.errors.length) {
    console.error(`FAIL ${basename(file)}`);
    for (const error of result.errors) console.error(`  error: ${error}`);
    for (const warning of result.warnings) console.error(`  warning: ${warning}`);
    process.exit(1);
  }
  console.log(`OK  ${file}`);
  console.log(
    `    CycloneDX ${result.stats.specVersion} · ${result.stats.components} component(s) · ${result.stats.metadataProperties} metadata properties`
  );
  for (const warning of result.warnings) console.log(`    warning: ${warning}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv);
