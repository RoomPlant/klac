const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createMatte } = require("../matte");
const HeroQuotes = require("../quotes");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");

function boot({ reducedMotion = false, readyState = "complete", canvasWorks = true, quotePicker } = {}) {
  const timers = new Map(), raf = new Map();
  let id = 0;
  function element(classes = []) {
    const names = new Set(classes), listeners = new Map();
    return {
      classList: {
        add: (n) => names.add(n), remove: (n) => names.delete(n),
        contains: (n) => names.has(n),
      },
      attributes: {},
      dataset: {},
      children: [],
      style: { setProperty() {} },
      append(...children) { this.children.push(...children); },
      replaceChildren() { this.children = []; },
      addEventListener(n, fn) {
        if (!listeners.has(n)) listeners.set(n, new Set());
        listeners.get(n).add(fn);
      },
      removeEventListener(n, fn) { listeners.get(n)?.delete(fn); },
      emit(n, event) { return [...(listeners.get(n) || [])].map((fn) => fn(event)); },
      setAttribute(n, v) { this.attributes[n] = v; },
      removeAttribute(n) { delete this.attributes[n]; if (n === "src") delete this.src; },
      focus() { this.focused = true; },
      contains: () => false,
      textContent: "КЛАЦ",
    };
  }
  const scene = element(), loader = element(), klac = element();
  const speech = element();
  const reward = Object.assign(element(), {
    open: false, showModal() { this.open = true; },
    close() { this.open = false; this.emit("close"); },
  });
  const confetti = element(), getStickerpack = element(), rewardClose = element();
  const getVideo = element(), rewardTitle = element(), rewardDescription = element();
  const getPostcard = element();
  const heroes = Array.from({ length: 3 }, () => Object.assign(element(), {
    jumps: [],
    animate(frames, options) {
      const jump = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
      this.jumps.push(jump);
      return jump;
    },
  }));
  const sound = element(), status = element(), poster = element();
  function audio() {
    return {
      currentTime: 0, playCalls: 0, paused: true, reject: false, fail: false,
      pause() { this.paused = true; },
      play() {
        this.playCalls++;
        if (this.fail) throw new Error("Unsupported");
        if (this.reject) return Promise.reject(new Error("Blocked"));
        this.paused = false;
        return Promise.resolve();
      },
    };
  }
  const clickAudio = audio(), milestoneAudio = audio();
  const video = Object.assign(element(), {
    dataset: { src: "assets/loader-dance.mp4" },
    muted: true, paused: true, readyState: 4, playCalls: 0, loadCalls: 0,
    rejectAll: false, rejectAudible: false,
    play() {
      this.playCalls++;
      if (this.rejectAll || (!this.muted && this.rejectAudible)) return Promise.reject(new Error("Blocked"));
      this.paused = false;
      this.emit("playing");
      return Promise.resolve();
    },
    pause() { this.paused = true; this.emit("pause"); },
    load() { this.loadCalls++; },
  });
  const pixels = new Uint8ClampedArray(8 * 12 * 4);
  let paints = 0;
  const canvas = Object.assign(element(["hidden"]), {
    width: 8, height: 12,
    getContext: () => canvasWorks ? {
      drawImage() {}, getImageData: () => ({ data: pixels }),
      putImageData() { paints++; },
    } : null,
  });
  const elements = {
    "#scene": scene, "#loader": loader, "#klac": klac, "#dance-video": video,
    "#dance-canvas": canvas, "#dance-poster": poster, "#sound-toggle": sound,
    "#loader-status": status,
    "#reward": reward, "#confetti": confetti, "#get-stickerpack": getStickerpack,
    "#reward-close": rewardClose,
    "#get-video": getVideo, "#reward-title": rewardTitle, "#reward-description": rewardDescription,
    "#get-postcard": getPostcard,
    "#speech": speech,
    "#click-audio": clickAudio, "#milestone-audio": milestoneAudio,
  };
  const document = Object.assign(element(), {
    readyState, hidden: false, querySelector: (s) => elements[s],
    querySelectorAll: (s) => s === ".pose" ? heroes : [],
    createElement: () => element(),
  });
  const window = Object.assign(element(), {
    DanceMatte: { createMatte },
    HeroQuotes: { createPicker: () => quotePicker || HeroQuotes.createPicker() },
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; },
    clearTimeout: (n) => timers.delete(n),
    requestAnimationFrame(fn) { raf.set(++id, fn); return id; },
    cancelAnimationFrame: (n) => raf.delete(n),
  });
  vm.runInNewContext(source, { document, window });
  return {
    scene, loader, klac, heroes, sound, status, poster, video, canvas, document, window, timers, raf,
    reward, confetti, getStickerpack, rewardClose,
    getVideo, getPostcard, rewardTitle, rewardDescription,
    speech,
    clickAudio, milestoneAudio,
    get paints() { return paints; },
    flush: () => new Promise((resolve) => setImmediate(resolve)),
    timeout(delay = 10000) {
      const [key, timer] = [...timers].find(([, t]) => t.delay === delay);
      timers.delete(key);
      timer.fn();
    },
    frame(time = 50) {
      const [key, fn] = [...raf][0];
      raf.delete(key);
      fn(time);
    },
  };
}

// The intro is over: media released, heroes stay in the final scene and the
// button floats in. Nothing is scheduled afterwards.
function assertFinished(s) {
  assert.equal(s.loader.classList.contains("hidden"), true);
  assert.equal(s.loader.attributes["aria-busy"], "false");
  assert.equal(s.scene.classList.contains("scene--rest"), true, "heroes and button stay on screen");
  assert.equal(s.video.paused, true);
  assert.equal(s.video.muted, true);
  assert.equal(s.video.src, undefined);
  assert.equal(s.raf.size, 0);
  assert.equal(s.timers.size, 0);
  assert.equal(s.scene.classList.contains("scene--lean"), false, "arm and neck do not move");
}

test("starts original video muted, paints characters and finishes after one clip", async () => {
  const s = boot();
  await s.flush();
  assert.equal(s.video.src, "assets/loader-dance.mp4");
  assert.equal(s.video.muted, true);
  assert.equal(s.scene.classList.contains("scene--rest"), false);
  s.frame();
  assert.equal(s.paints, 1);
  assert.equal(s.canvas.classList.contains("hidden"), false);
  assert.equal(s.poster.classList.contains("hidden"), true);
  s.video.emit("ended");
  assertFinished(s);
  for (let i = 0; i < 100; i++) s.klac.emit("click");
  assert.equal(s.klac.textContent, "100");
});

test("sound is opt-in, toggles without resetting the media clock, stops when dance ends", async () => {
  const s = boot();
  s.video.currentTime = 2.5;
  await Promise.all(s.sound.emit("click"));
  assert.equal(s.video.muted, false);
  assert.equal(s.sound.attributes["aria-pressed"], "true");
  assert.equal(s.video.currentTime, 2.5);
  await Promise.all(s.sound.emit("click"));
  assert.equal(s.video.muted, true);
  assert.equal(s.sound.attributes["aria-pressed"], "false");
  await Promise.all(s.sound.emit("click"));
  s.loader.contains = () => true;
  s.video.emit("ended");
  assertFinished(s);
  assert.equal(s.klac.focused, true);
});

test("an ended clip repeats only while page is loading", async () => {
  const s = boot({ readyState: "loading" });
  await s.flush();
  const plays = s.video.playCalls;
  s.video.emit("ended");
  assert.equal(s.video.playCalls, plays + 1);
  assert.equal(s.video.currentTime, 0);
  assert.equal(s.scene.classList.contains("scene--rest"), false);
  s.window.emit("load");
  assertFinished(s);
});

test("reduced motion downloads no video and skips dance/music", () => {
  const s = boot({ reducedMotion: true });
  assertFinished(s);
  assert.equal(s.video.playCalls, 0);
});

test("deadline exits a stalled or autoplay-blocked intro", async () => {
  const s = boot({ readyState: "loading" });
  s.video.rejectAll = true;
  await Promise.all(s.sound.emit("click"));
  assert.equal(s.video.muted, true);
  s.timeout();
  assertFinished(s);
});

test("audible playback rejection falls back to muted dancing", async () => {
  const s = boot();
  s.video.rejectAudible = true;
  await Promise.all(s.sound.emit("click"));
  assert.equal(s.video.muted, true);
  assert.equal(s.video.paused, false);
  assert.equal(s.sound.attributes["aria-pressed"], "false");
  assert.match(s.status.textContent, /Звук недоступен/);
  s.video.emit("ended");
  assertFinished(s);
});

test("media errors and unavailable canvas never block the clicker", () => {
  const s = boot();
  s.video.emit("error");
  assertFinished(s);
  assertFinished(boot({ canvasWorks: false }));
});

test("background tab pauses music and painting; pagehide fully stops both", async () => {
  const s = boot();
  await Promise.all(s.sound.emit("click"));
  s.document.hidden = true;
  s.document.emit("visibilitychange");
  assert.equal(s.video.paused, true);
  assert.equal(s.raf.size, 0);
  s.document.hidden = false;
  s.document.emit("visibilitychange");
  assert.equal(s.video.paused, false);
  assert.equal(s.video.muted, false);
  s.window.emit("pagehide");
  assertFinished(s);
});

test("late play promises cannot restart audio after the dance ends", async () => {
  const s = boot();
  let resolvePlay;
  s.video.play = () => new Promise((resolve) => { resolvePlay = resolve; });
  const pending = s.sound.emit("click");
  s.video.emit("ended");
  resolvePlay();
  await Promise.all(pending);
  assertFinished(s);
});

test("page uses local video with original audio and a transparent poster, not GIFs", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(html, /\.gif["']|<svg|autoplay/);
  assert.doesNotMatch(html, /skip-intro|Пропустить/);
  assert.match(html, /muted playsinline/);
  assert.match(html, /data-src="assets\/loader-dance\.mp4"/);
  const mp4 = fs.readFileSync(path.join(root, "assets/loader-dance.mp4"));
  assert.ok(mp4.includes(Buffer.from("soun")), "original soundtrack is present");
  assert.ok(mp4.includes(Buffer.from("vide")), "original dance is present");
  const png = fs.readFileSync(path.join(root, "assets/loader-dance.poster.png"));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png[25], 6, "poster must support transparency");
});

test("after the dance the heroes stay frozen while the button floats in", async () => {
  const s = boot();
  await s.flush();
  s.video.emit("ended");
  assertFinished(s);
  s.klac.emit("transitionend", { target: s.klac, propertyName: "transform" });
  assert.equal(s.scene.classList.contains("scene--lean"), false);
  s.klac.emit("click");
  assert.equal(s.klac.textContent, "1");
});

test("each click jumps all hero layers and rapid clicks restart the jump", () => {
  const s = boot();
  s.video.emit("ended");
  s.klac.emit("click");
  for (const hero of s.heroes) {
    assert.equal(hero.jumps.length, 1);
    const jump = hero.jumps[0];
    assert.equal(jump.options.duration, 420);
    assert.equal(jump.frames[1].transform, "translateY(-6%)");
    assert.equal(jump.frames[2].transform, "translateY(0)");
  }
  s.klac.emit("click");
  assert.equal(s.klac.textContent, "2");
  for (const hero of s.heroes) {
    assert.equal(hero.jumps[0].cancelled, true);
    assert.equal(hero.jumps.length, 2);
    assert.equal(hero.jumps[1].cancelled, false);
  }
});

test("reduced motion keeps heroes still while clicks continue counting", () => {
  const s = boot({ reducedMotion: true });
  s.klac.emit("click");
  assert.equal(s.klac.textContent, "1");
  assert.ok(s.heroes.every((hero) => hero.jumps.length === 0));
});

test("100th click opens reward and rains confetti; closing cleans up and counting continues", () => {
  const s = boot();
  s.video.emit("ended");
  for (let i = 0; i < 99; i++) s.klac.emit("click");
  assert.equal(s.reward.open, false);
  s.klac.emit("click");
  assert.equal(s.klac.textContent, "100");
  assert.equal(s.reward.open, true);
  assert.equal(s.getStickerpack.focused, true);
  assert.equal(s.getStickerpack.hidden, false);
  assert.equal(s.getVideo.hidden, true);
  assert.equal(s.getPostcard.hidden, true);
  assert.equal(s.rewardTitle.textContent, "ТЫ МОЛОДЕЦ!");
  assert.equal(s.rewardDescription.textContent, "Держи стикерпак с твоими любимыми героями by KsVs");
  assert.equal(s.confetti.children.length, 90);
  s.klac.emit("click");
  assert.equal(s.klac.textContent, "100", "modal blocks background clicks");
  s.timeout(7000);
  assert.equal(s.confetti.children.length, 0);
  s.rewardClose.emit("click");
  assert.equal(s.reward.open, false);
  assert.equal(s.klac.focused, true);
  for (let i = 0; i < 99; i++) s.klac.emit("click");
  assert.equal(s.klac.textContent, "199");
  assert.equal(s.reward.open, false);
  s.klac.emit("click");
  assert.equal(s.klac.textContent, "200");
  assert.equal(s.reward.open, true);
  assert.equal(s.rewardTitle.textContent, "Ты молодец!");
  assert.equal(s.rewardDescription.textContent, "Держи еще один танец от твоих любимых персонажей by KsVS.");
  assert.equal(s.getStickerpack.hidden, true);
  assert.equal(s.getVideo.hidden, false);
  assert.equal(s.getPostcard.hidden, true);
  assert.equal(s.getVideo.focused, true);
  assert.equal(s.confetti.children.length, 90);
  s.rewardClose.emit("click");
  assert.equal(s.confetti.children.length, 0);
  assert.equal(s.timers.size, 0);
  for (let i = 0; i < 99; i++) s.klac.emit("click");
  assert.equal(s.klac.textContent, "299");
  assert.equal(s.reward.open, false);
  s.klac.emit("click");
  assert.equal(s.klac.textContent, "300");
  assert.equal(s.reward.open, true);
  assert.equal(s.rewardTitle.textContent, "Ты заслужил открытку!");
  assert.equal(s.rewardDescription.textContent, "Порадуй близких открыткой от любимых персонажей by KsVs.");
  assert.equal(s.getStickerpack.hidden, true);
  assert.equal(s.getVideo.hidden, true);
  assert.equal(s.getPostcard.hidden, false);
  assert.equal(s.getPostcard.focused, true);
  assert.equal(s.confetti.children.length, 90);
  assert.equal(s.speech.children.length, 0);
  s.getPostcard.emit("click");
  assert.equal(s.reward.open, true, "placeholder button does not navigate or dismiss the gift");
  s.rewardClose.emit("click");
  assert.equal(s.confetti.children.length, 0);
  assert.equal(s.timers.size, 0);
  assert.equal(s.klac.focused, true);
  for (let i = 0; i < 100; i++) s.klac.emit("click");
  assert.equal(s.klac.textContent, "400");
  assert.equal(s.reward.open, false, "only the three requested milestones show rewards");
});

test("reduced motion still shows reward without confetti; early close releases confetti", () => {
  for (const reducedMotion of [true, false]) {
    const s = boot({ reducedMotion });
    s.video.emit("ended");
    for (let i = 0; i < 100; i++) s.klac.emit("click");
    assert.equal(s.reward.open, true);
    assert.equal(s.confetti.children.length, reducedMotion ? 0 : 90);
    s.reward.close(); // Native Escape uses the same close event.
    assert.equal(s.confetti.children.length, 0);
    assert.equal(s.timers.size, 0);
    for (let i = 0; i < 100; i++) s.klac.emit("click");
    assert.equal(s.reward.open, true);
    assert.equal(s.getVideo.hidden, false);
    assert.equal(s.confetti.children.length, reducedMotion ? 0 : 90);
    s.reward.close();
    assert.equal(s.timers.size, 0);
    for (let i = 0; i < 100; i++) s.klac.emit("click");
    assert.equal(s.reward.open, true);
    assert.equal(s.getPostcard.hidden, false);
    assert.equal(s.getPostcard.focused, true);
    assert.equal(s.confetti.children.length, reducedMotion ? 0 : 90);
    s.reward.close();
    assert.equal(s.timers.size, 0);
  }
});

test("postcard link opens the supplied PNG in a new tab safely", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /<a id="get-postcard" class="reward__get" href="assets\/postcard\.png" target="_blank" rel="noopener noreferrer" hidden>Получить открытку<\/a>/);
});

test("stickerpack link opens the supplied Telegram pack in a new tab safely", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /<h2 id="reward-title">ТЫ МОЛОДЕЦ!<\/h2>/);
  assert.match(html, /Держи стикерпак с твоими любимыми героями by KsVs/);
  assert.match(html, /<a id="get-stickerpack"[^>]*href="https:\/\/t\.me\/addstickers\/KsVsebudethorosho"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>Получить стикерпак<\/a>/);
  assert.doesNotMatch(source, /window\.location\.assign|Ссылка на стикерпак ещё не добавлена/);
});

test("second reward opens the attached MP4 in a new tab without changing the intro", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /<a id="get-video"[^>]*href="assets\/reward-dance\.mp4"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*hidden>Получить видео<\/a>/);
  assert.match(html, /data-src="assets\/loader-dance\.mp4"/);
  const mp4 = fs.readFileSync(path.join(root, "assets/reward-dance.mp4"));
  const { createHash } = require("node:crypto");
  assert.equal(createHash("sha256").update(mp4).digest("hex"),
    "8ee10da5404fed38bffb17c392ee011fcc5801d1159765f453f7d44ff6a07e47");
  assert.match(fs.readFileSync(path.join(root, "styles.css"), "utf8"), /\.reward__get\[hidden\] \{ display: none; \}/);
});

test("speech appears on each ninth click, replaces old clouds and cleans up", () => {
  const s = boot({ quotePicker: () => [{ speaker: "flamingo", text: "Крылья есть. Планов нет." }] });
  s.video.emit("ended");
  for (let i = 0; i < 8; i++) s.klac.emit("click");
  assert.equal(s.speech.children.length, 0);
  s.klac.emit("click");
  assert.equal(s.speech.children.length, 1);
  const bubble = s.speech.children[0];
  assert.match(bubble.className, /speech__bubble--flamingo/);
  assert.equal(bubble.textContent, "Крылья есть. Планов нет.");
  assert.equal(bubble.children.length, 0, "only the phrase, without a speaker heading");
  for (let i = 0; i < 8; i++) s.klac.emit("click");
  assert.equal(s.speech.children[0], bubble);
  s.klac.emit("click");
  assert.notEqual(s.speech.children[0], bubble);
  assert.equal(s.speech.children.length, 1);
  assert.equal([...s.timers.values()].filter((t) => t.delay === 6200).length, 1);
  s.timeout(6200);
  assert.equal(s.speech.children.length, 0);
});

test("dialogues originate from both speakers in order, including reduced motion", () => {
  for (const reducedMotion of [false, true]) {
    const s = boot({ reducedMotion, quotePicker: () => HeroQuotes.dialogues[1] });
    s.video.emit("ended");
    for (let i = 0; i < 9; i++) s.klac.emit("click");
    assert.equal(s.speech.children.length, 2);
    assert.match(s.speech.children[0].className, /--flamingo/);
    assert.match(s.speech.children[1].className, /--batman/);
    assert.equal(s.speech.children[0].textContent, "Нас опять нажали.");
    assert.equal(s.speech.children[1].textContent, "Улыбайся. Это работа.");
    assert.equal(s.speech.children[1].style.animationDelay, "0.65s");
    s.timeout(6200);
    assert.equal(s.speech.children.length, 0);
  }
});

test("speech grows from each head centre and has no speaker headings", () => {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(css, /--head-x: 34\.82%;\s*--head-y: 27\.98%;/);
  assert.match(css, /\.speech__bubble--flamingo \{ --head-x: 77\.68%; --head-y: 31\.70%;/);
  assert.match(css, /left: var\(--head-x\);\s*bottom: calc\(100% - var\(--head-y\) \+ 9px\);/);
  assert.match(css, /transform-origin: 50% calc\(100% \+ 9px\);/);
  assert.doesNotMatch(source + css, /speech__speaker/);
});

test("every click sounds, each hundredth uses milestone audio including 400", () => {
  const s = boot({ reducedMotion: true });
  assert.equal(s.clickAudio.playCalls, 0, "no audible autoplay");
  assert.equal(s.milestoneAudio.playCalls, 0);
  for (let i = 1; i <= 400; i++) {
    s.clickAudio.currentTime = 0.2;
    s.milestoneAudio.currentTime = 0.5;
    s.klac.emit("click");
    const milestone = i % 100 === 0;
    const selected = milestone ? s.milestoneAudio : s.clickAudio;
    const other = milestone ? s.clickAudio : s.milestoneAudio;
    assert.equal(selected.currentTime, 0);
    assert.equal(selected.paused, false);
    assert.equal(other.paused, true);
    if (s.reward.open) {
      const plays = s.milestoneAudio.playCalls;
      s.klac.emit("click");
      assert.equal(s.milestoneAudio.playCalls, plays, "background clicks through modal are silent");
      s.reward.close();
    }
  }
  assert.equal(s.clickAudio.playCalls, 396);
  assert.equal(s.milestoneAudio.playCalls, 4);
});

test("sound rejection/errors do not block counting and sounds stop in background", async () => {
  const s = boot();
  s.video.emit("ended");
  s.clickAudio.reject = true;
  s.klac.emit("click");
  await s.flush();
  s.clickAudio.fail = true;
  s.klac.emit("click");
  assert.equal(s.klac.textContent, "2");
  s.clickAudio.reject = false;
  s.clickAudio.fail = false;
  s.klac.emit("click");
  s.document.hidden = true;
  s.document.emit("visibilitychange");
  assert.equal(s.clickAudio.paused, true);
  s.document.hidden = false;
  s.klac.emit("click");
  s.window.emit("pagehide");
  assert.equal(s.clickAudio.paused, true);
  assert.equal(s.milestoneAudio.paused, true);
});

test("styles have no arm or neck lean animation", () => {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.doesNotMatch(css, /scene--lean|\.pose[^}]*rotate/);
  assert.match(css, /\.scene--rest \.klac \{ visibility: visible; transform: none; \}/);
});

test("dance frame reserves screen margins and space for loader controls", () => {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(css, /top: calc\(50% - 44px\)/);
  assert.match(css, /width: min\(calc\(100vw - 48px\), calc\(\(100svh - 144px\) \/ 1.5\)\)/);
  assert.match(css, /\.scene--rest \.stage \{\s*top: 50%;/);
  for (const [vw, vh] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
    const w = Math.min(vw - 48, (vh - 144) / 1.5);
    const h = w * 1.5;
    const x = (vw - w) / 2;
    const y = vh / 2 - 44 - h / 2;
    assert.ok(x >= 24 && x + w <= vw - 24, `${vw}x${vh}: side margins`);
    assert.ok(y >= 28 && y + h <= vh - 116, `${vw}x${vh}: vertical margins`);
  }
});

test("gift title descends with the button and stops above the heroes", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(html, /<h1 class="gift-title"><span>Клацай 100 раз<\/span> <span>и получи подарок<\/span><\/h1>/);
  assert.match(css, /\.gift-title \{[^}]*bottom: 85%;[^}]*color: #ffe644;[^}]*-webkit-text-stroke: 1.5px #111;[^}]*text-shadow:[^}]*visibility: hidden;[^}]*translateY\(-100svh\);[^}]*transition: transform var\(--slide\)/s);
  assert.match(css, /\.scene--rest \.gift-title \{ visibility: visible; transform: none; \}/);
  assert.match(css, /prefers-reduced-motion: reduce[^}]*\.gift-title \{ transition: none; \}/s);
});

test("final scene uses transparent 0-second pose layers and no music hint", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(html, /включится по нажатию|loader__hint/);
  for (const name of ["pose-body", "pose-arm", "pose-neck"]) {
    assert.match(html, new RegExp(`src="assets/${name}\\.png"`));
    const png = fs.readFileSync(path.join(root, `assets/${name}.png`));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 448);
    assert.equal(png.readUInt32BE(20), 672);
    assert.equal(png[25], 6, `${name} must be transparent`);
  }
  // The button sits inside the stage so the heroes can overlap it.
  assert.ok(html.indexOf('id="klac"') > html.indexOf('id="stage"'));
  assert.ok(html.indexOf('id="klac"') < html.indexOf('id="loader"'));
});
