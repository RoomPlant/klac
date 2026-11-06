// Colour matte for this particular illustrated clip, not a general AI segmenter.
// Only colours connected to the pink characters survive: navy sky, Earth,
// yellow stars and lunar ground are discarded. Ink, skin and white details stay.
(function (root) {
  // options.edgeFeather: fade alpha over this many pixels at the frame edges,
  // where the original video itself cuts off a swinging cape or hand.
  function createMatte(width, height, options = {}) {
    const feather = Math.max(0, Math.floor(options.edgeFeather || 0));
    const edgeAlpha = new Uint8Array(width * height).fill(255);
    if (feather) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const d = Math.min(x, y, width - 1 - x, height - 1 - y);
          if (d < feather) edgeAlpha[y * width + x] = Math.round(255 * (d + 1) / (feather + 1));
        }
      }
    }
    const size = width * height;
    const allowed = new Uint8Array(size);
    const keep = new Uint8Array(size);
    const queue = new Int32Array(size);
    const nearColour = new Uint8Array(size);
    const contour = new Uint8Array(size);
    return function apply(data) {
      keep.fill(0);
      nearColour.fill(0);
      let head = 0;
      let tail = 0;
      for (let i = 0; i < size; i++) {
        const p = i * 4;
        const r = data[p], g = data[p + 1], b = data[p + 2];
        const pink = r > 105 && b > 70 && r > g * 1.18 && b > g * 1.05;
        const ink = Math.max(r, g, b) < 100 && b - r < 25 && b - g < 28;
        const skin = r > 140 && g > 95 && b > 60 && r - g > 17 && g - b > 18;
        const white = Math.min(r, g, b) > 165 && Math.max(r, g, b) - Math.min(r, g, b) < 38;
        allowed[i] = (pink || skin || white) ? 2 : ink ? 1 : 0;
        if (pink) {
          keep[i] = 1;
          queue[tail++] = i;
        }
      }
      // Below the lunar horizon, retain ink only near character colours.
      // Otherwise a shoe touching its shadow would pull in entire crater lines.
      const horizon = Math.floor(height * 0.60) * width;
      const radius = Math.max(2, Math.round(width / 150));
      for (let i = horizon; i < size; i++) {
        if (allowed[i] !== 2) continue;
        const x = i % width;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const n = i + dy * width + dx;
            if (x + dx >= 0 && x + dx < width && n >= 0 && n < size) nearColour[n] = 1;
          }
        }
      }
      while (head < tail) {
        const i = queue[head++];
        const x = i % width;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx < 0 || x + dx >= width) continue;
            const n = i + dy * width + dx;
            if (n < 0 || n >= size || keep[n] || !allowed[n]) continue;
            if (n >= horizon && allowed[n] === 1 && !nearColour[n]) continue;
            keep[n] = 1;
            queue[tail++] = n;
          }
        }
      }
      // Close single-pixel compression gaps without spreading a silhouette
      // through the background. This keeps fine comic outlines less speckled.
      contour.set(keep);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = y * width + x;
          if (keep[i]) continue;
          let neighbours = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) neighbours += keep[i + dy * width + dx];
          }
          if (neighbours >= 5) contour[i] = 1;
        }
      }
      for (let i = 0; i < size; i++) data[i * 4 + 3] = contour[i] ? edgeAlpha[i] : 0;
      return data;
    };
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { createMatte };
  else root.DanceMatte = { createMatte };
})(typeof window === "undefined" ? globalThis : window);
