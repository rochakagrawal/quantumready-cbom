# The `quantumready:` CBOM profile, version 0.1

This profile extends a [CycloneDX 1.7](https://cyclonedx.org/specification/overview/)
CBOM. The base document is standard CycloneDX. The migration evidence lives in a
documented property namespace so that a consumer can read it without a private schema.

The key words **MUST**, **SHOULD** and **MAY** are used as in RFC 2119.

---

## 1. Document shape

A conforming document:

- `bomFormat` MUST be `"CycloneDX"`.
- `specVersion` MUST begin with `"1.7"`.
- `serialNumber` MUST be a `urn:uuid:` URN.
- `metadata.tools.components[]` MUST name the producing tool.
- `components[]` MUST contain at least one `cryptographic-asset`.
- Every component MUST have a stable `bom-ref`.
- Findings SHOULD carry `evidence.occurrences[]` with a location and, where available, a line.

## 2. Metadata properties

These properties sit in `metadata.properties[]`. The first eight are required for a
report that claims a readiness score.

| Property | Type | Required | Meaning |
|---|---|---|---|
| `quantumready:engine.name` | string | yes | Producing engine, e.g. `QuantumReady Discovery Engine` |
| `quantumready:engine.version` | string | yes | Engine version, e.g. `0.10.14` |
| `quantumready:report.id` | string | yes | Stable report identifier |
| `quantumready:scope` | string | yes | `project`, `repository`, `image`, `endpoint`, `cloud` |
| `quantumready:scan.kind` | string | yes | `local`, `repo`, `artifact`, `image`, `endpoint` |
| `quantumready:target.ref` | string | yes | Commit, digest, path or host |
| `quantumready:score.method` | string | yes | Plain-language scoring method |
| `quantumready:coverage.complete` | boolean | yes | `false` when a limit was reached |
| `quantumready:coverage.filesScanned` | integer | no | Files read |
| `quantumready:coverage.filesConsidered` | integer | no | Files considered |
| `quantumready:coverage.bytesScanned` | integer | no | Bytes read |
| `quantumready:limit.files` | integer | no | File budget |
| `quantumready:limit.bytes` | integer | no | Byte budget |
| `quantumready:limit.fileBytes` | integer | no | Per-file budget |
| `quantumready:limit.findings` | integer | no | Finding budget |
| `quantumready:limit.milliseconds` | integer | no | Time budget |
| `quantumready:verification.checked` | integer | no | Findings sent to the second pass |
| `quantumready:verification.confirmed` | integer | no | Confirmed by the second pass |
| `quantumready:verification.adjusted` | integer | no | Adjusted by the second pass |
| `quantumready:verification.dropped` | integer | no | Removed by the second pass |
| `quantumready:limitation` | string, repeatable | no | A stated limit; repeat for each |

### The score is not the CSA index

`quantumready:score.method` MUST state that the score is the producer's own index and is
**not** the CSA Quantum Readiness Index. A CBOM MUST NOT imply that a score is a
regulatory assessment or a compliance certificate.

## 3. Component properties

These properties sit in each `cryptographic-asset` component's `properties[]`.

| Property | Type | Required | Values |
|---|---|---|---|
| `quantumready:risk` | string | yes | `quantum-vulnerable`, `deprecated-or-weak`, `adequate`, `quantum-resistant`, `post-quantum` |
| `quantumready:riskLabel` | string | no | Human-readable label |
| `quantumready:owner` | string | yes | `you`, `dependency`, `platform`, `vendor` |
| `quantumready:action` | string | yes | `fix-now`, `plan`, `monitor`, `none` |
| `quantumready:environment` | string | yes | `production`, `test`, `build`, `unknown` |
| `quantumready:family` | string | no | Algorithm family, e.g. `MD5`, `RSA`, `ML-KEM` |
| `quantumready:replacement` | string | no | Named replacement or migration target |

### Stable identity

`bom-ref` SHOULD be stable across scans of the same asset and environment. A suggested
form is:

```
crypto:<asset>:<algorithm-slug>:<parameter>:<mode>:<padding>:<environment>
```

Consumers MUST NOT use the display name alone as identity. Two RSA key sizes are two
components.

## 4. Evidence

Use the base CycloneDX `evidence` object. The profile recognises five evidence levels,
carried by the producing tool's own finding record; when a CBOM carries a level, it
SHOULD use one of:

| Level | Meaning |
|---|---|
| `detected` | A pattern matched |
| `likely-used` | The match is in code and the context implies use |
| `build-confirmed` | The code is present in a build artifact |
| `deployment-confirmed` | The artifact is deployed |
| `runtime-confirmed` | Observed at runtime |

A CBOM MUST NOT promote a finding to a higher level than the evidence supports.

## 5. Example

A minimal conforming component:

```json
{
  "type": "cryptographic-asset",
  "bom-ref": "crypto:payments:md5:128:any:any:production",
  "name": "MD5",
  "cryptoProperties": {
    "assetType": "algorithm",
    "algorithmProperties": {
      "primitive": "hash",
      "algorithmFamily": "MD5",
      "parameterSetIdentifier": "128",
      "cryptoFunctions": ["digest"]
    }
  },
  "evidence": {
    "occurrences": [
      {
        "bom-ref": "occ:crypto:payments:md5:128:any:any:production:security.js:2:createhash",
        "location": "security.js",
        "line": 2
      }
    ]
  },
  "properties": [
    { "name": "quantumready:risk", "value": "deprecated-or-weak" },
    { "name": "quantumready:riskLabel", "value": "Deprecated or weak" },
    { "name": "quantumready:owner", "value": "you" },
    { "name": "quantumready:action", "value": "fix-now" },
    { "name": "quantumready:environment", "value": "production" },
    { "name": "quantumready:family", "value": "MD5" },
    { "name": "quantumready:replacement", "value": "SHA-256 or SHA-3" }
  ]
}
```

A full example is in [`examples/repository-scan.cbom.json`](examples/repository-scan.cbom.json).

## 6. Versioning

- **0.1** — first public profile; engine 0.10.x; CycloneDX 1.7.
- Additive properties do not change the profile version.
- A rename, a removal, or a change of meaning increments the minor version.

## 7. What this profile does not do

- It does not define a scanner, a rule set or a scoring algorithm.
- It does not certify compliance with CSA, MAS, IMDA or any regulator.
- It does not make a CBOM complete. Coverage is a property of the scan, and every scan
  has limits. A consumer SHOULD read `quantumready:coverage.complete` and every
  `quantumready:limitation` before treating a CBOM as an inventory of the estate.
