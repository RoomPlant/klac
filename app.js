const scene = document.querySelector("#scene");
const loader = document.querySelector("#loader");
const klac = document.querySelector("#klac");
const video = document.querySelector("#dance-video");
const canvas = document.querySelector("#dance-canvas");
const poster = document.querySelector("#dance-poster");
const sound = document.querySelector("#sound-toggle");
const status = document.querySelector("#loader-status");
const heroes = document.querySelectorAll(".pose");
const reward = document.querySelector("#reward");
const confetti = document.querySelector("#confetti");
const getStickerpack = document.querySelector("#get-stickerpack");
const getVideo = document.querySelector("#get-video");
const getPostcard = document.querySelector("#get-postcard");
const rewardTitle = document.querySelector("#reward-title");
const rewardDescription = document.querySelector("#reward-description");
const speech = document.querySelector("#speech");
const pickQuote = window.HeroQuotes.createPicker();
const clickAudio = document.querySelector("#click-audio");
const milestoneAudio = document.querySelector("#milestone-audio");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let clicks = 0;
let finished = false;
let pageLoaded = document.readyState === "complete";
let introEnded = false;
let deadline;
let animation;
let lastFrame = -Infinity;
let context;
let matte;
const mediaEvents = [];
let jumps = [];
let confettiTimer;
let speechTimer;

klac.addEventListener("click", () => {
  if (reward.open) return;
  klac.textContent = String(++clicks);
  playClickSound();
  if (clicks === 100 || clicks === 200 || clicks === 300) celebrate();
  if (finished && clicks % 9 === 0) showSpeech();
  if (!finished || reducedMotion) return;
  // Restart all three cut-out layers together, without moving the button/title.
  jumps.forEach((jump) => jump.cancel());
  jumps = [...heroes].map((hero) => hero.animate([
    { transform: "translateY(0)" },
    { transform: "translateY(-6%)", offset: 0.45 },
    { transform: "translateY(0)" },
  ], { duration: 420, easing: "ease-in-out" }));
});

function stopClickSounds() {
  clickAudio.pause();
  milestoneAudio.pause();
}

function playClickSound() {
  // One channel at a time; every hundredth click replaces the ordinary sound.
  stopClickSounds();
  const audio = clicks % 100 === 0 ? milestoneAudio : clickAudio;
  try {
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback) playback.catch(() => {}); // Audio failure must never block clicks.
  } catch {
    // A missing/unsupported sound is non-fatal.
  }
}

window.addEventListener("pagehide", stopClickSounds);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopClickSounds();
});

function clearSpeech() {
  window.clearTimeout(speechTimer);
  speech.replaceChildren();
}

function showSpeech() {
  // Keep at most the current line/pair, even during very rapid clicking.
  clearSpeech();
  pickQuote().forEach(({ speaker, text }, index) => {
    const bubble = document.createElement("p");
    bubble.className = `speech__bubble speech__bubble--${speaker}`;
    bubble.style.animationDelay = `${index * 0.65}s`;
    bubble.textContent = text;
    speech.append(bubble);
  });
  speechTimer = window.setTimeout(clearSpeech, 6200);
}

function clearConfetti() {
  window.clearTimeout(confettiTimer);
  confetti.replaceChildren();
}

function celebrate() {
  clearSpeech();
  const videoReward = clicks === 200;
  const postcardReward = clicks === 300;
  rewardTitle.textContent = postcardReward ? "Ты заслужил открытку!"
    : videoReward ? "Ты молодец!" : "ТЫ МОЛОДЕЦ!";
  rewardDescription.textContent = postcardReward
    ? "Порадуй близких открыткой от любимых персонажей by KsVs."
    : videoReward ? "Держи еще один танец от твоих любимых персонажей by KsVS."
      : "Держи стикерпак с твоими любимыми героями by KsVs";
  getStickerpack.hidden = videoReward || postcardReward;
  getVideo.hidden = !videoReward;
  getPostcard.hidden = !postcardReward;
  reward.showModal();
  (postcardReward ? getPostcard : videoReward ? getVideo : getStickerpack).focus({ preventScroll: true });
  if (reducedMotion) return;
  const colors = ["#ffe644", "#ff428f", "#6edbff", "#8e63ef", "#ffffff", "#67df9a"];
  for (let i = 0; i < 90; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti__piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 1.4}s`;
    piece.style.animationDuration = `${3 + Math.random() * 2}s`;
    piece.style.setProperty("--drift", `${Math.random() * 180 - 90}px`);
    confetti.append(piece);
  }
  confettiTimer = window.setTimeout(clearConfetti, 7000);
}

document.querySelector("#reward-close").addEventListener("click", () => reward.close());
reward.addEventListener("close", () => {
  clearConfetti();
  klac.focus({ preventScroll: true });
});

function updateSoundButton() {
  sound.setAttribute("aria-pressed", String(!video.muted));
  sound.textContent = video.muted ? "Включить музыку" : "Выключить музыку";
}

function stopDrawing() {
  if (animation !== undefined) window.cancelAnimationFrame(animation);
  animation = undefined;
}

// The dance ends: the heroes freeze in the 0-second pose and stay on screen,
// while the КЛАЦ button slowly floats in from the right.
function showMainScreen() {
  if (finished) return;
  finished = true;
  window.clearTimeout(deadline);
  stopDrawing();
  mediaEvents.forEach(([name, handler]) => video.removeEventListener(name, handler));
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("load", onPageReady);
  window.removeEventListener("pagehide", showMainScreen);
  sound.removeEventListener("click", toggleSound);
  video.pause();
  video.muted = true;
  // Release the decoder and stop network/audio, including after a media error.
  video.removeAttribute("src");
  video.load();
  const restoreFocus = loader.contains(document.activeElement);
  loader.setAttribute("aria-busy", "false");
  loader.classList.add("hidden");
  canvas.setAttribute("aria-hidden", "true");
  poster.setAttribute("aria-hidden", "true");
  scene.classList.add("scene--rest");
  if (restoreFocus) klac.focus({ preventScroll: true });
}

function onPageReady() {
  pageLoaded = true;
  if (introEnded) showMainScreen();
}

function drawFrame() {
  if (finished || video.readyState < 2) return;
  try {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    matte(frame.data);
    context.putImageData(frame, 0, 0);
    canvas.classList.remove("hidden");
    poster.classList.add("hidden");
  } catch {
    // No raw lunar frame or silent, frozen loader if canvas/decoding fails.
    showMainScreen();
  }
}

function draw(timestamp) {
  animation = undefined;
  if (finished || document.hidden || video.paused) return;
  // Limit CPU work on phones. Source sound and motion share video.currentTime,
  // so dropping a painted frame never causes accumulating audio drift.
  if (timestamp - lastFrame >= 40) {
    lastFrame = timestamp;
    drawFrame();
  }
  if (!finished) animation = window.requestAnimationFrame(draw);
}

function startDrawing() {
  if (!finished && !document.hidden && animation === undefined) {
    animation = window.requestAnimationFrame(draw);
  }
}

async function playMuted() {
  if (finished || document.hidden) return;
  video.muted = true;
  updateSoundButton();
  try {
    await video.play();
    if (finished) video.pause();
  } catch {
    if (!finished) status.textContent = "Нажмите «Включить музыку», чтобы запустить танец";
  }
}

async function toggleSound() {
  if (finished) return;
  if (!video.muted) {
    video.muted = true;
    updateSoundButton();
    return;
  }
  // play() is called directly from a real click (also keyboard-activated).
  // Never try to bypass the browser's audible-autoplay restrictions.
  video.muted = false;
  updateSoundButton();
  try {
    await video.play();
    if (finished) { video.pause(); video.muted = true; }
    else status.textContent = "Загрузка…";
  } catch {
    if (!finished) {
      await playMuted();
      if (!finished) status.textContent = "Звук недоступен — танцуем без музыки";
    }
  }
}

function onVisibility() {
  if (finished) return;
  if (document.hidden) {
    video.pause();
    stopDrawing();
  } else {
    video.play().catch(() => playMuted());
  }
}

function listen(name, handler) {
  video.addEventListener(name, handler);
  mediaEvents.push([name, handler]);
}

sound.addEventListener("click", toggleSound);

if (reducedMotion) {
  // No media download, dance or sound: the final still scene appears at once.
  showMainScreen();
} else {
  try {
    context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    // Soften the straight cut where a cape or hand leaves the original frame.
    matte = window.DanceMatte.createMatte(canvas.width, canvas.height, { edgeFeather: 8 });
    window.addEventListener("load", onPageReady, { once: true });
    window.addEventListener("pagehide", showMainScreen, { once: true });
    document.addEventListener("visibilitychange", onVisibility);
    listen("loadeddata", drawFrame);
    listen("playing", startDrawing);
    listen("pause", stopDrawing);
    listen("error", showMainScreen);
    listen("ended", () => {
      introEnded = true;
      if (pageLoaded) showMainScreen();
      else {
        // Repeat only while the actual page is still loading.
        video.currentTime = 0;
        video.play().catch(() => playMuted());
      }
    });
    // One 6-second clip normally completes the intro. This bound also covers
    // stalled downloads, blocked autoplay, missing events and a hung page load.
    deadline = window.setTimeout(showMainScreen, 10000);
    video.src = video.dataset.src;
    video.load();
    playMuted();
  } catch {
    showMainScreen();
  }
}
