const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

for (const name of ["heroes-dance.gif", "heroes-moon-dance.gif"]) test(`${name} is 640x640, 80 distinct frames, 5.6 seconds, infinite loop`, () => {
  const gif = fs.readFileSync(path.join(__dirname, "../assets", name));
  assert.equal(gif.subarray(0, 6).toString(), "GIF89a");
  assert.equal(gif.readUInt16LE(6), 640);
  assert.equal(gif.readUInt16LE(8), 640);
  let cursor = 13 + ((gif[10] & 128) ? 3 * (1 << ((gif[10] & 7) + 1)) : 0);
  let delay = null;
  let frames = 0;
  let duration = 0;
  let loops = 0;
  const hashes = new Set();
  function blocks() {
    const result = [];
    while (gif[cursor]) {
      const size = gif[cursor++];
      assert.ok(cursor + size < gif.length, "Data sub-block must be in bounds");
      result.push(gif.subarray(cursor, cursor + size));
      cursor += size;
    }
    cursor++;
    return result;
  }
  while (gif[cursor] !== 0x3b) {
    const marker = gif[cursor++];
    if (marker === 0x21) {
      const label = gif[cursor++];
      const data = blocks();
      if (label === 0xf9) {
        assert.equal(data[0].length, 4);
        delay = data[0].readUInt16LE(1);
        assert.equal(delay, 7, "Each frame must wait 70ms");
      } else if (label === 0xff && data[0].toString() === "NETSCAPE2.0") {
        assert.deepEqual([...data[1]], [1, 0, 0]);
        loops++;
      }
    } else if (marker === 0x2c) {
      assert.equal(gif.readUInt16LE(cursor), 0);
      assert.equal(gif.readUInt16LE(cursor + 2), 0);
      assert.equal(gif.readUInt16LE(cursor + 4), 640);
      assert.equal(gif.readUInt16LE(cursor + 6), 640);
      const packed = gif[cursor + 8];
      cursor += 9;
      const start = cursor;
      if (packed & 128) cursor += 3 * (1 << ((packed & 7) + 1));
      cursor++; // LZW code size.
      blocks();
      hashes.add(createHash("sha256").update(gif.subarray(start, cursor)).digest("hex"));
      assert.notEqual(delay, null, "Every frame needs a graphic control extension");
      duration += delay * 10;
      delay = null;
      frames++;
    } else {
      assert.fail(`Unexpected GIF marker ${marker} at ${cursor - 1}`);
    }
  }
  assert.equal(cursor + 1, gif.length, "GIF ends with its trailer");
  assert.equal(frames, 80);
  assert.equal(duration, 5600);
  assert.equal(loops, 1);
  assert.ok(hashes.size >= 75, "Must contain moving poses, not repeated still images");
});
