#!/usr/bin/env bash
set -euo pipefail
LABEL="${1:-bench}"
RUNS="${RUNS:-5}"
BENCH_DIR=".bench"
mkdir -p "$BENCH_DIR"

echo "==> Cold benchmark (label=$LABEL, runs=$RUNS)"
hyperfine \
  --runs "$RUNS" \
  --warmup 0 \
  --prepare 'rm -rf dist .astro node_modules/.vite' \
  --export-json "$BENCH_DIR/${LABEL}-cold.json" \
  --export-markdown "$BENCH_DIR/${LABEL}-cold.md" \
  'bun run build'

echo "==> Warm benchmark (label=$LABEL, runs=$RUNS)"
hyperfine \
  --runs "$RUNS" \
  --warmup 1 \
  --export-json "$BENCH_DIR/${LABEL}-warm.json" \
  --export-markdown "$BENCH_DIR/${LABEL}-warm.md" \
  'bun run build'

echo "==> Capturing single fresh build log"
rm -rf dist .astro node_modules/.vite
bun run build 2>&1 | tee "$BENCH_DIR/${LABEL}-build.log"

echo "==> Done. Results in $BENCH_DIR/${LABEL}-*"
