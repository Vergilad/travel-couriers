/**
 * Measures the landing page's composition and prints it as numbers.
 *
 *   node scripts/measure.mjs [url] [width]
 *   node scripts/measure.mjs http://localhost:4137/ 1440
 *
 * This exists because "it looks boring" and "there is too much on one screen"
 * are both measurable, and the measurements said something more specific than
 * the complaint did: ten fields whose areas all sat inside one narrow band,
 * every one composed identically, and a type scale with two steps in it.
 *
 * What it reports, and what good looks like:
 *
 *   type steps        distinct rendered font sizes across the sheet, and how
 *                     many fields use each. At least 4 steps, or the page has
 *                     one shout and one flat middle, which is what a page of
 *                     boxes reads as. This counts what is on screen rather
 *                     than what the heading tags are, because the largest and
 *                     smallest type here are a paragraph and a caption.
 *   height spread     the tallest field over the shortest. Near 1.0 means the
 *                     grid is overruling the composition.
 *   composition       first child and child count per field. Identical rows
 *                     here mean identical fields, whatever the spans say.
 *   prose blocks      strings of 12+ words. A landing page is a first
 *                     impression, so a handful is a page and a dozen is an
 *                     essay.
 *
 * It drives headless Chrome over the DevTools protocol and tears it down, the
 * same way scripts/shoot.mjs does, and it reads whatever server you point it
 * at rather than starting one.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const url = process.argv[2] ?? "http://127.0.0.1:4137/";
const width = Number(process.argv[3] ?? 1440);
const PORT = 9334;

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const binary = CHROME_CANDIDATES.find(existsSync);
if (!binary) {
  console.error("Chrome not found");
  process.exit(1);
}

const profileDir = `${process.env.TEMP ?? "/tmp"}/viactor-measure-${process.pid}`;
const chrome = spawn(
  binary,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

function killTree(child) {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGKILL");
  }
}

/**
 * Reads every field on the sheet: its box, how its contents are composed, and
 * the size of its heading. Composition is the part that matters most, because
 * a grid can look varied in the markup and render as one shape ten times.
 */
const PROBE = `(() => {
  const fields = [];
  document.querySelectorAll(".sheet-tile").forEach((el, index) => {
    const box = el.getBoundingClientRect();
    const ink = el.querySelector(".sheet-ink") ?? el;
    const children = [...ink.children].map((child) => {
      const name = String(child.className || "").split(" ")[0];
      return child.tagName.toLowerCase() + (name ? "." + name : "");
    });
    const head = el.querySelector("h1, h2");
    fields.push({
      index,
      width: Math.round(box.width),
      height: Math.round(box.height),
      shape: children.join(" + "),
      headSize: head ? Math.round(parseFloat(getComputedStyle(head).fontSize)) : 0,
      headText: (head?.innerText ?? "").trim().slice(0, 26),
    });
  });

  // Type steps, measured off the page rather than off the heading tags. The
  // biggest and smallest type on this sheet are a paragraph and a caption, so
  // counting h1/h2 alone reported three steps where there are six.
  const steps = {};
  for (const el of document.querySelectorAll(".sheet-tile *")) {
    if (el.children.length > 0) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (!(el.textContent ?? "").trim()) continue;
    const size = Math.round(parseFloat(getComputedStyle(el).fontSize));
    steps[size] = (steps[size] ?? 0) + 1;
  }

  // Every visible run of 12+ words. Alt text is excluded because it is read
  // aloud rather than read, and so is anything inside an aria-hidden subtree:
  // the split-flap board stacks a front and a back face per character, so its
  // destination counted twice as a 22-word paragraph.
  const prose = [];
  for (const el of document.querySelectorAll("p, li, h1, h2, h3")) {
    if (el.querySelector("p, li, h1, h2, h3")) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    // innerText walks into aria-hidden subtrees, so the hero headline read as
    // 22 words: the split-flap board stacks a front and a back face per
    // character and both faces carry the glyph. Strip the decorative subtrees
    // and what is left is the sentence a person actually reads.
    const copy = el.cloneNode(true);
    for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
    const text = (copy.textContent ?? "").replace(/\\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    if (words >= 12) prose.push({ words, text: text.slice(0, 72) });
  }

  return JSON.stringify({
    pageHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    fields,
    steps,
    prose,
  });
})()`;

let failure = null;
try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, {
      method: "PUT",
    })
  ).json();

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const resolve = pending.get(message.id);
    if (resolve) {
      pending.delete(message.id);
      resolve(message.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = (nextId += 1);
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const { result } = await send("Runtime.evaluate", {
    expression: PROBE,
    returnByValue: true,
  });
  const report = JSON.parse(result.value);
  socket.close();

  const heights = report.fields.map((field) => field.height);
  const steps = Object.entries(report.steps)
    .map(([size, count]) => [Number(size), count])
    .sort((a, b) => a[0] - b[0]);
  const shapes = new Set(report.fields.map((field) => field.shape));

  console.log(`${url}  at ${width}px`);
  console.log(
    `page ${report.pageHeight}px = ` +
      `${(report.pageHeight / report.viewportHeight).toFixed(2)} screens\n`,
  );

  console.log(" #   width  height  heading  field");
  for (const field of report.fields) {
    console.log(
      `${String(field.index).padStart(2)}  ` +
        `${String(field.width).padStart(5)}  ` +
        `${String(field.height).padStart(6)}  ` +
        `${String(field.headSize || "-").padStart(7)}  ` +
        `${field.headText.padEnd(26)} ${field.shape}`,
    );
  }

  const spread = Math.max(...heights) / Math.min(...heights);
  console.log(
    `\ntype steps         ${steps.length}: ` +
      steps.map(([size, count]) => `${size}px x${count}`).join(", "),
  );
  console.log(
    `height spread      ${Math.min(...heights)} to ${Math.max(...heights)}px, ` +
      `${spread.toFixed(2)}x`,
  );
  console.log(`distinct shapes    ${shapes.size} of ${report.fields.length} fields`);
  console.log(`prose blocks       ${report.prose.length} runs of 12+ words`);
  for (const block of report.prose) {
    console.log(`   ${String(block.words).padStart(3)}w  ${block.text}`);
  }
} catch (error) {
  failure = error;
} finally {
  killTree(chrome);
}

if (failure) {
  console.error(failure);
  process.exit(1);
}
process.exit(0);
