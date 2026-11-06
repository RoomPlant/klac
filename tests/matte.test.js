const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createMatte } = require("../matte");

test("removes navy/yellow background while retaining connected pink, skin, whites and ink", () => {
  const w = 40, h = 60, data = new Uint8ClampedArray(w * h * 4);
  const pixel = (x, y, rgb) => data.set([...rgb, 255], (y * w + x) * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pixel(x, y,
    y < 38 ? [55, 54, 98] : [249, 247, 164]);
  pixel(20, 25, [245, 128, 183]); // pink seed
  pixel(21, 25, [255, 222, 164]); // skin
  pixel(22, 25, [235, 234, 231]); // white shirt
  pixel(23, 25, [20, 19, 30]);   // black outline
  pixel(2, 25, [235, 234, 231]); // isolated star
  pixel(2, 24, [20, 19, 30]);   // isolated ink
  pixel(20, 4, [245, 128, 183]); // jumping character reaches the top of the frame
  const original = data.slice();
  createMatte(w, h)(data);
  const alpha = (x, y) => data[(y * w + x) * 4 + 3];
  for (const x of [20, 21, 22, 23]) assert.equal(alpha(x, 25), 255);
  assert.equal(alpha(20, 4), 255, "raised hands/heads must not be cropped on jumps");
  for (const [x, y] of [[0, 0], [2, 24], [2, 25], [10, 40]]) assert.equal(alpha(x, y), 0);
  for (let i = 0; i < data.length; i++) if (i % 4 !== 3) assert.equal(data[i], original[i]);
});

test("lunar ink cannot flood from a pink foot into a long horizon or crater", () => {
  const w = 40, h = 60, data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([55, 54, 98, 255], i * 4);
  for (let x = 0; x < w; x++) data.set([20, 19, 30, 255], (45 * w + x) * 4);
  data.set([245, 128, 183, 255], (44 * w + 20) * 4);
  const apply = createMatte(w, h);
  apply(data);
  assert.equal(data[(45 * w + 20) * 4 + 3], 255);
  assert.equal(data[(45 * w + 3) * 4 + 3], 0);
  // Buffers are reusable without leaving a previous silhouette behind.
  for (let i = 0; i < w * h; i++) data.set([55, 54, 98, 255], i * 4);
  apply(data);
  assert.ok(data.every((v, i) => i % 4 !== 3 || v === 0));
});

test("optional edge feather softens only the frame border of kept pixels", () => {
  const w = 20, h = 20, data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([245, 128, 183, 255], i * 4);
  createMatte(w, h, { edgeFeather: 4 })(data);
  const alpha = (x, y) => data[(y * w + x) * 4 + 3];
  assert.equal(alpha(10, 10), 255);
  assert.ok(alpha(0, 10) > 0 && alpha(0, 10) < alpha(2, 10) && alpha(2, 10) < 255);
  assert.equal(alpha(0, 10), alpha(19, 10));
});