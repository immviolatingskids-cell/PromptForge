# Repository Guidelines

## Project Structure & Module Organization

PersonaForge combines a browser studio with a Python data-management CLI.

- `src/` contains the JavaScript generation pipeline, coherence/dependency logic, persona storage, and output writers.
- `index.html` and `styles.css` are the browser UI; `start.py` serves the repository locally.
- `data/` contains the JSON catalogues consumed by the generator. `schemas/` contains structural schemas.
- `populator/` contains the Python CLI for importing, validating, inspecting, and expanding catalogue data; `populate.py` is its launcher.
- `test/` contains JavaScript tests, while `tests/` contains Python `unittest` tests.
- `backups/` stores generated data backups; do not edit archives directly.

Keep new data in the appropriate `data/<domain>/` directory and preserve the existing readable-ID and schema conventions.

## Build, Test, and Development Commands

This project has no compilation step. Run the studio with:

```text
python start.py
```

Then open `http://127.0.0.1:8765`. Useful validation and test commands are:

```text
npm test                                  # Run JavaScript tests with node:test
python -m unittest discover -s tests -v  # Run Python tests
python -m populator.main validate         # Validate the data tree
python populate.py health                 # Inspect catalogue health
python populate.py coverage               # Inspect coverage
```

Use `python -m populator.main --help` for the full CLI.

## Coding Style & Naming Conventions

Use two spaces in JavaScript and four spaces in Python. JavaScript uses ES modules, camelCase functions/variables, and descriptive kebab-case filenames such as `candidate-ranker.js`; Python uses snake_case names. Keep JSON keys and IDs readable and consistent with neighboring entries. Prefer focused modules and preserve deterministic seeded generation. No formatter or linter is configured, so match nearby code and avoid unrelated reformatting.

## Testing Guidelines

Add JavaScript tests under `test/` using `node:test`; name files `*.test.js` and cover seeds, variance modes, or anchors when relevant. Add Python tests under `tests/` using `unittest`, naming files `test_*.py`. Run both suites plus data validation before submitting changes.

## Commit & Pull Request Guidelines

No Git history is present in this checkout, so use concise imperative commit subjects (for example, `Add occupation coverage validation`). Keep commits focused. Pull requests should explain the change, list validation commands, identify schema/data-version changes, and include UI screenshots when relevant. Call out generated backups or migrations.

## Data and Configuration Safety

Treat JSON catalogue edits as behavior changes: validate them before sharing. Preserve `data/data_version.json` and `data/schema_version.json` semantics, and never commit secrets or local-storage exports. Prefer the populator CLI for bulk changes so backups and validation are applied consistently.
