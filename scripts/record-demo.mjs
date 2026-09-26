// Records docs/desktop.gif, the demo shown in the README.
//
//   npm run demo
//
// It serves the production build in dist/, drives it with the local Chrome
// through Playwright and turns the screencast into a GIF with ffmpeg, which
// must be on the PATH. Every run shows the same thing: the random numbers are
// seeded, the clock is fixed and the browser starts with an empty disk.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const OUTPUT = resolve('docs/desktop.gif');
const VIEWPORT = { width: 1024, height: 640 };
const FPS = 20;
const CLOCK = new Date('2026-09-26T10:30:00');
/** Folders of dist/ whose pictures the windows show: photo, logos, screenshots. */
const PICTURES = ['profile', 'education', 'experience', 'portfolio'];

/* --- page set-up -------------------------------------------------------- */

/**
 * Runs in the page before the site does. Math.random becomes a seeded
 * generator, so the Solitaire deal is always the same, and a drawn pointer
 * follows the mouse, because a headless screencast shows no cursor. The
 * pointer takes its image from the `cursor` style under it, so it turns into
 * the hand or the crosshair just like the real one.
 */
function pageSetUp() {
  // This seed deals game #963387: a move on the table and two aces in sight.
  let seed = 0x5eed99;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const parse = (value) => {
    const match = /url\("?([^")]+)"?\)(?:\s*[\d.]+x\))?\s*(\d+)\s+(\d+)/.exec(value ?? '');
    return match ? { src: match[1], x: Number(match[2]), y: Number(match[3]) } : null;
  };

  addEventListener('DOMContentLoaded', () => {
    const pointer = document.createElement('img');
    pointer.alt = '';
    pointer.style.cssText =
      'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;image-rendering:pixelated;display:none';
    document.body.append(pointer);

    addEventListener(
      'pointermove',
      (event) => {
        const root = getComputedStyle(document.documentElement).getPropertyValue('--cursor-arrow');
        const under = document.elementFromPoint(event.clientX, event.clientY);
        const cursor = (under && parse(getComputedStyle(under).cursor)) ?? parse(root);
        if (!cursor) return;
        if (pointer.getAttribute('src') !== cursor.src) pointer.src = cursor.src;
        pointer.style.transform = `translate(${event.clientX - cursor.x}px, ${event.clientY - cursor.y}px)`;
        pointer.style.display = 'block';
      },
      true,
    );
  });
}

/* --- mouse and keyboard ------------------------------------------------- */

let page;
let mouse = { x: VIEWPORT.width - 40, y: VIEWPORT.height - 80 };

const hold = (ms) => page.waitForTimeout(ms);

/** Seeded generator for the hand: the same wobbles on every run. */
let handSeed = 95;
function rand(min = 0, max = 1) {
  handSeed = (handSeed * 16807) % 2147483647;
  return min + ((handSeed - 1) / 2147483646) * (max - min);
}

/** Minimum jerk profile: how a hand speeds up and settles on a target. */
const settle = (t) => t * t * t * (10 - 15 * t + 6 * t * t);

/** Fitts's law, roughly: far targets take longer, but not in proportion. */
const travelTime = (distance) => 170 + 115 * Math.log2(1 + distance / 24);

/**
 * Moves the pointer along a slight arc, never a ruler straight line, and on
 * long trips it overshoots a little and corrects, like a wrist does. The
 * position follows the wall clock, so a slow machine drops steps instead of
 * stretching the movement. `straight` keeps the line for menus, where an arc
 * would brush a sibling entry.
 */
async function moveTo(x, y, { ms, straight = false } = {}) {
  const from = { ...mouse };
  const dx = x - from.x;
  const dy = y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return;

  let end = { x, y };
  const overshoot = !straight && distance > 220;
  if (overshoot) {
    const past = rand(0.03, 0.06) * distance;
    end = { x: x + (dx / distance) * past + rand(-3, 3), y: y + (dy / distance) * past + rand(-3, 3) };
  }
  const bend = straight ? 0 : rand(0.06, 0.16) * distance * (rand() < 0.5 ? -1 : 1);
  const control = {
    x: (from.x + end.x) / 2 - (dy / distance) * bend,
    y: (from.y + end.y) / 2 + (dx / distance) * bend,
  };

  const duration = ms ?? travelTime(distance) * rand(0.9, 1.15);
  const start = Date.now();
  for (;;) {
    const t = Math.min(1, (Date.now() - start) / duration);
    const k = settle(t);
    const px = (1 - k) ** 2 * from.x + 2 * (1 - k) * k * control.x + k * k * end.x;
    const py = (1 - k) ** 2 * from.y + 2 * (1 - k) * k * control.y + k * k * end.y;
    await page.mouse.move(px, py);
    if (t === 1) break;
    await hold(12);
  }
  mouse = end;
  if (overshoot) {
    await hold(rand(20, 60));
    await moveTo(x, y, { ms: rand(130, 190), straight: true });
  }
}

/** Rests the hand while the eyes read: a slow drift of a few pixels. */
async function linger(ms) {
  const until = Date.now() + ms;
  while (until - Date.now() > 400) {
    const drift = { x: mouse.x + rand(-14, 14), y: mouse.y + rand(-9, 9) };
    await moveTo(drift.x, drift.y, { ms: Math.min(until - Date.now(), rand(500, 900)), straight: true });
    if (until - Date.now() > 300) await hold(Math.min(until - Date.now(), rand(150, 450)));
  }
  const rest = until - Date.now();
  if (rest > 0) await hold(rest);
}

/** A point inside the element, near the middle but never dead centre. */
async function aim(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Not on screen: ${locator}`);
  return {
    x: Math.round(box.x + box.width * rand(0.35, 0.65)),
    y: Math.round(box.y + box.height * rand(0.38, 0.62)),
  };
}

async function click(locator) {
  const { x, y } = await aim(locator);
  await moveTo(x, y);
  await hold(rand(90, 170));
  await page.mouse.click(x, y, { delay: rand(50, 90) });
}

/**
 * Picks an entry of an open drop-down menu: straight down out of the menu bar
 * first, then across, because brushing a neighbour in the bar swaps the menu.
 */
async function pickMenuEntry(locator) {
  const { x, y } = await aim(locator);
  await moveTo(mouse.x, y, { straight: true });
  await moveTo(x, y, { straight: true });
  await hold(rand(90, 150));
  await page.mouse.click(x, y, { delay: rand(50, 90) });
}

async function doubleClick(locator) {
  const { x, y } = await aim(locator);
  await moveTo(x, y);
  await hold(rand(110, 190));
  await page.mouse.dblclick(x, y, { delay: rand(45, 70) });
}

async function hover(locator) {
  const { x, y } = await aim(locator);
  await moveTo(x, y);
}

async function drag(from, to) {
  await moveTo(from.x, from.y);
  await hold(rand(120, 180));
  await page.mouse.down();
  await hold(80);
  await moveTo(to.x, to.y, { ms: travelTime(Math.hypot(to.x - from.x, to.y - from.y)) * 1.25 });
  await hold(rand(90, 140));
  await page.mouse.up();
}

/**
 * Scrolls whatever is under the pointer the way a wheel does: a few flicks of
 * uneven length with short reading pauses between them.
 */
async function scroll(distance) {
  const direction = Math.sign(distance);
  let left = Math.abs(distance);
  while (left > 0) {
    const flick = Math.min(left, Math.round(rand(110, 190)));
    const start = Date.now();
    const ms = rand(220, 300);
    let done = 0;
    while (done < flick) {
      const t = Math.min(1, (Date.now() - start) / ms);
      const step = Math.round(flick * settle(t)) - done;
      if (step > 0) await page.mouse.wheel(0, step * direction);
      done += step;
      await hold(14);
    }
    left -= flick;
    if (left > 0) await hold(rand(120, 320));
  }
}

/* --- the demo ------------------------------------------------------------ */

const window95 = (name) => page.getByRole('dialog', { name, exact: true });
const desktopIcon = (name) => page.getByRole('listbox', { name: 'Desktop' }).getByRole('option', { name });

/**
 * Walks the Start menu like a person: sideways into each submenu first, then
 * down to the entry, so the pointer never crosses a sibling that would swap
 * the submenu under it.
 */
async function openFromStart(...path) {
  await click(page.getByRole('toolbar').getByRole('button', { name: /Start/ }));
  await hold(rand(250, 350));
  for (const [index, item] of path.entries()) {
    const { x, y } = await aim(page.getByRole('menuitem', { name: item, exact: true }));
    if (index > 0) await moveTo(x, mouse.y, { ms: rand(160, 220), straight: true });
    await moveTo(x, y, { straight: true });
    await hold(index === path.length - 1 ? rand(100, 160) : rand(200, 280));
  }
  await page.mouse.click(mouse.x, mouse.y, { delay: rand(50, 90) });
}

/** Top face up card of each tableau column. */
async function tableauTops(solitaire) {
  const tops = [];
  for (let column = 1; column <= 7; column += 1) {
    const cards = solitaire.getByRole('group', { name: `Column ${column}` }).locator('.card--face');
    const count = await cards.count();
    if (count === 0) continue;
    const top = cards.nth(count - 1);
    const [suit, rank] = (await top.getAttribute('data-card-id')).split('-');
    tops.push({ top, suit, rank: Number(rank) });
  }
  return tops;
}

/** A card that can go on top of another one in the tableau. */
function tableauMove(tops) {
  const red = (suit) => suit === 'hearts' || suit === 'diamonds';
  for (const card of tops) {
    if (card.rank === 1) continue;
    const target = tops.find((other) => other.rank === card.rank + 1 && red(other.suit) !== red(card.suit));
    if (target) return { card: card.top, target: target.top };
  }
  return null;
}

async function demo() {
  // 1. The desktop boots on the Welcome window.
  await page.getByRole('listbox', { name: 'Desktop' }).waitFor();
  await hold(300);
  await moveTo(mouse.x - 180, mouse.y - 90);
  await linger(900);

  // 2. About me: who I am, what I study and where I have worked.
  await click(window95('Welcome').getByRole('button', { name: 'About me', exact: true }));
  await hold(600);
  const about = window95('About me');
  await hover(about.locator('.app-about-body'));
  await linger(300);
  await scroll(420);
  await linger(500);
  await scroll(520);
  await linger(700);

  // 3. The projects, one tab each.
  await click(about.getByRole('menuitem', { name: 'File' }));
  await hold(300);
  await pickMenuEntry(page.getByRole('menuitem', { name: 'Projects' }));
  await hold(600);
  const projects = window95('My projects');
  const projectsBody = projects.locator('.app-projects-body');
  await hover(projectsBody);
  await scroll(380);
  await linger(700);
  await scroll(-380);
  await click(projects.getByRole('tab').nth(1));
  await linger(500);
  await hover(projectsBody);
  await scroll(380);
  await linger(800);

  // 4. Contact: the mail window, and the address copied.
  await doubleClick(desktopIcon('Mail'));
  await hold(600);
  await click(window95('Mail').getByRole('button', { name: 'Copy the address' }));
  await linger(900);

  // 5. And it is a real desktop: a game of Solitaire to finish.
  await openFromStart('Programs', 'Games', 'Solitaire');
  await hold(600);
  const solitaire = window95('Solitaire');
  const move = tableauMove(await tableauTops(solitaire));
  if (move) {
    await drag(await aim(move.card), await aim(move.target));
    await hold(350);
  }
  for (const ace of (await tableauTops(solitaire)).filter((card) => card.rank === 1)) {
    await doubleClick(ace.top);
    await hold(rand(250, 400));
  }
  await linger(1500);
}

/* --- recording ----------------------------------------------------------- */

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
}

const server = await preview({ preview: { port: 4174, strictPort: true, open: false }, logLevel: 'warn' });
const url = server.resolvedUrls.local[0];
const work = mkdtempSync(join(tmpdir(), 'nilparra-demo-'));
// The script eases its own wheel steps; Chrome's smooth scrolling would add a
// second easing on top and keep the page moving after the hand has stopped.
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-smooth-scrolling'] });

try {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'en-US',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  page = await context.newPage();
  await page.clock.setFixedTime(CLOCK);
  await page.addInitScript(pageSetUp);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Decode every picture up front, so no window opens with an empty frame
  // where the photo or a screenshot is still loading.
  const pictures = PICTURES.flatMap((folder) =>
    readdirSync(resolve('dist', folder), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(entry.name))
      .map((entry) => new URL(relative('dist', join(entry.parentPath, entry.name)).split(sep).join('/'), url).href),
  );
  await page.evaluate(async (sources) => {
    window.demoPictures = sources.map((source) => Object.assign(new Image(), { src: source }));
    await Promise.all(window.demoPictures.map((image) => image.decode().catch(() => {})));
  }, pictures);

  // The screencast sends a frame each time the page repaints, with its time.
  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ data, time: metadata.timestamp });
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height });
  await demo();
  const end = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');

  // Each frame lasts until the next one; ffmpeg resamples them to FPS.
  mkdirSync(join(work, 'frames'));
  const list = ['ffconcat version 1.0'];
  frames.forEach((frame, index) => {
    const name = `frames/${String(index).padStart(5, '0')}.png`;
    writeFileSync(join(work, name), Buffer.from(frame.data, 'base64'));
    const next = frames[index + 1]?.time ?? end;
    list.push(`file '${name}'`, `duration ${Math.max(0.001, next - frame.time).toFixed(4)}`);
  });
  list.push(`file 'frames/${String(frames.length - 1).padStart(5, '0')}.png'`);
  writeFileSync(join(work, 'frames.txt'), `${list.join('\n')}\n`);

  // One palette for the whole clip; the flat interface colours land in it
  // exactly, and only the photos get dithered.
  const filters = `fps=${FPS},split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`;
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'frames.txt'), '-vf', filters, '-loop', '0', OUTPUT]);
  console.log(`${frames.length} frames -> ${OUTPUT}`);
} finally {
  await browser.close();
  await new Promise((done) => server.httpServer.close(done));
  rmSync(work, { recursive: true, force: true });
}
