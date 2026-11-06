const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
let server, base;
before(async () => {
  server = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."), env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server startup timeout")), 5000);
    server.once("error", reject);
    server.stdout.on("data", (data) => {
      const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    });
  });
});
after(() => server?.kill());

test("serves page and the original MP4 with correct MIME and byte length", async () => {
  assert.equal((await fetch(base)).status, 200);
  const res = await fetch(`${base}/assets/loader-dance.mp4`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "video/mp4");
  const original = fs.readFileSync(path.join(__dirname, "../assets/loader-dance.mp4"));
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), original);
});

test("supports MP4 HEAD and byte ranges needed by Safari/mobile playback", async () => {
  const url = `${base}/assets/loader-dance.mp4`;
  const head = await fetch(url, { method: "HEAD" });
  const size = Number(head.headers.get("content-length"));
  assert.equal(head.status, 200);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  for (const [range, length, contentRange] of [
    ["bytes=0-15", 16, `bytes 0-15/${size}`],
    ["bytes=-10", 10, `bytes ${size - 10}-${size - 1}/${size}`],
    [`bytes=${size - 5}-`, 5, `bytes ${size - 5}-${size - 1}/${size}`],
  ]) {
    const res = await fetch(url, { headers: { Range: range } });
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-range"), contentRange);
    assert.equal((await res.arrayBuffer()).byteLength, length);
  }
  for (const range of ["bytes=9-1", "bytes=-0", "bytes=999999999-", "bytes=-", "bytes=0-1,4-8"]) {
    const res = await fetch(url, { headers: { Range: range } });
    assert.equal(res.status, 416);
  }
});

test("serves supplied WAV sounds intact with audio MIME and range support", async () => {
  for (const name of ["click.wav", "milestone-click.wav"]) {
    const res = await fetch(`${base}/assets/${name}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "audio/wav");
    const file = fs.readFileSync(path.join(__dirname, "../assets", name));
    assert.equal(file.toString("ascii", 0, 4), "RIFF");
    assert.equal(file.toString("ascii", 8, 12), "WAVE");
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), file);
    const partial = await fetch(`${base}/assets/${name}`, { headers: { Range: "bytes=0-15" } });
    assert.equal(partial.status, 206);
    assert.equal((await partial.arrayBuffer()).byteLength, 16);
  }
});

test("missing files and malformed URLs fail cleanly", async () => {
  assert.equal((await fetch(`${base}/missing.mp4`)).status, 404);
  assert.equal((await fetch(`${base}/%zz`)).status, 400);
});
