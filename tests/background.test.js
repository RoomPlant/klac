const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("dark emblem stays a decorative watermark over the original pink base", () => {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(css, /--pink: #ff9ac2;/);
  assert.match(css, /\.scene \{[^}]*isolation: isolate;/s);
  assert.match(css, /\.scene::before \{[^}]*z-index: -1;[^}]*url\("assets\/emblem.svg"\)[^}]*no-repeat;[^}]*brightness\(0.45\)[^}]*opacity: 0.18;[^}]*pointer-events: none;/s);
  const svg = fs.readFileSync(path.join(root, "assets/emblem.svg"), "utf8");
  assert.match(svg, /viewBox="0 0 803 499"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|href=/);
});
