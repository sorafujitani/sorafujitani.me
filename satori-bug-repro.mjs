/**
 * Minimal reproduction: Satori fails to render "constructor" and "__proto__" as text
 *
 * Root cause: `graphemeImages` is a plain object ({}), so bracket-notation lookup
 * like `graphemeImages["constructor"]` returns Object.prototype.constructor
 * instead of undefined, causing the text to be treated as an image.
 *
 * Affected files in satori source:
 *   - src/satori.ts:49     → `const graphemeImages = { ...options.graphemeImages }`
 *   - src/text/index.ts:110 → `function isImage(s) { return !!(graphemeImages && graphemeImages[s]) }`
 *   - src/text/index.ts:614 → `const image = graphemeImages ? graphemeImages[text] : null`
 *
 * Fix: Use `Object.create(null)` instead of `{}` for graphemeImages,
 *       or use `Object.hasOwn(graphemeImages, s)` / `Object.prototype.hasOwnProperty.call(graphemeImages, s)` for lookups.
 *
 * Run: node satori-bug-repro.mjs
 */

import satori from "satori";

const fontData = await fetch(
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff",
).then((r) => r.arrayBuffer());

const fonts = [
  { name: "Inter", data: fontData, weight: 700, style: "normal" },
];
const opts = { width: 600, height: 100, fonts };

const testCases = [
  { label: "normal word", text: "hello world" },
  { label: '"constructor"', text: "constructor" },
  { label: '"__proto__"', text: "__proto__" },
  { label: '"Constructor" (cap)', text: "Constructor" },
  { label: '"constructors"', text: "constructors" },
  { label: '"prototype"', text: "prototype" },
  { label: '"toString"', text: "toString" },
  { label: '"valueOf"', text: "valueOf" },
  { label: '"hasOwnProperty"', text: "hasOwnProperty" },
];

console.log("satori version:", (await import("satori/package.json", { with: { type: "json" } })).default.version);
console.log("");

for (const { label, text } of testCases) {
  const svg = await satori(
    { type: "div", props: { children: text } },
    opts,
  );

  const pathCount = (svg.match(/<path /g) || []).length;
  const hasImage = svg.includes("<image ");
  const imageHref = svg.match(/href="([^"]+)"/)?.[1];

  if (hasImage) {
    console.log(`❌ ${label.padEnd(25)} → rendered as <image href="${imageHref}">`);
  } else if (pathCount > 0) {
    console.log(`✅ ${label.padEnd(25)} → rendered as ${pathCount} path(s)`);
  } else {
    console.log(`⚠️  ${label.padEnd(25)} → empty SVG`);
  }
}

console.log("");
console.log("--- Explanation ---");
console.log('graphemeImages is initialized as: { ...options.graphemeImages } (a plain object)');
console.log('When checking: graphemeImages["constructor"]');
console.log("  Expected: undefined");
console.log("  Actual:  ", {}["constructor"]);
console.log('When checking: graphemeImages["__proto__"]');
console.log("  Expected: undefined");
console.log("  Actual:  ", {}["__proto__"]);
