# Contributing

This repository is a published profile and a small validator. Contributions are welcome
when they make the profile easier to implement correctly.

## Good contributions

- A bug in the validator, with a minimal CBOM that reproduces it.
- An ambiguity in `PROFILE.md`, with the two readings you think are possible.
- A new example from a tool other than QuantumReady, if you have the right to publish it.
- A mapping to another standard (CycloneDX, SPDX, SARIF) that does not change the profile.

## What this repository will not accept

- Scanner source code. The scanner is proprietary.
- Claims that a CBOM or a score is a compliance certificate.
- Changes that make a finding look more certain than its evidence.
- Marketing copy in the profile.

## Process

1. Open an issue describing the problem.
2. For a validator change, include a test.
3. For a profile change, state whether it is additive or breaking.
4. Run `node --test validator/test.mjs` and `node validator/index.mjs examples/repository-scan.cbom.json`.

A breaking change increments the profile minor version and is documented in `PROFILE.md`.
