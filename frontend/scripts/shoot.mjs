/**
 * Screenshots the built site at several widths in both colour schemes, and
 * reports any element that sticks out past the viewport.
 *
 *   npm run build && node scripts/shoot.mjs <out-dir> [en|ru]
 *   node scripts/shoot.mjs <out-dir> [en|ru] http://localhost:4137/
 *
 * The locale argument matters more than it looks: the audience reads Russian,
 * Cyrillic sets 10-20% wider than Latin at the same size, and a headline that
 * fits in two lines in English is the usual place a layout breaks.
 *
 * With no URL this owns the whole run: it serves `dist/` itself, launches its
 * own headless Chrome, drives it over the DevTools protocol, then tears both
 * down before exiting. That matters on Windows, where leaving a server or a
 * browser in the shell's background keeps the terminal session open even after
 * the work is done, and orphans a Chrome process tree if the kill misses.
 *
 * Given a URL it shoots that instead and starts no server of its own, which is
 * how the dev server gets checked. Dev and production are not the same program:
 * dev serves unbundled ESM through react-refresh, so a module that only breaks
 * there would never show up in a `dist/` run.
 */
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const PORT = 4178;

const outDir = process.argv[2];
const language = process.argv[3] ?? "en";
const externalUrl = process.argv[4];
if (!outDir || !["en", "ru"].includes(language)) {
  console.error("usage: node scripts/shoot.mjs <out-dir> [en|ru] [base-url]");
  process.exit(1);
}
if (!externalUrl && !existsSync(DIST)) {
  console.error(`no build found at ${DIST}. Run: npm run build`);
  process.exit(1);
}

const url = externalUrl ?? `http://127.0.0.1:${PORT}/`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

/** Static server for `dist/`, falling back to index.html for client routes. */
function serveDist() {
  const server = createServer((request, response) => {
    const requested = decodeURIComponent(new URL(request.url, url).pathname);
    const candidate = join(DIST, normalize(requested).replace(/^([/\\])+/, ""));
    const file =
      candidate.startsWith(DIST) && existsSync(candidate) && extname(candidate)
        ? candidate
        : join(DIST, "index.html");
    response.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function launchChrome(profileDir) {
  const binary = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (!binary) throw new Error("Chrome not found");
  return spawn(
    binary,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--remote-debugging-port=9222",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
}

/** Kills the browser and everything it spawned. */
function killTree(child) {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGKILL");
  }
}

async function waitForDevTools(attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch("http://127.0.0.1:9222/json/version");
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

// 1080 is one pixel above the width where the nav collapses to a menu button,
// so it is the narrowest the full horizontal nav ever has to fit. That is the
// first thing Russian breaks, and nothing between 820 and 1440 would catch it.
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "tablet", width: 820, height: 1180, mobile: true },
  { name: "narrow-nav", width: 1080, height: 900, mobile: false },
  { name: "laptop", width: 1280, height: 800, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
];
const MODES = ["light", "dark"];
/** Fields on the sheet. See LandingSheet for the grid that packs them. */
const TILES = 10;

/**
 * Scrolls the whole page and comes back to the top.
 *
 * `captureBeyondViewport` grows the viewport for the capture but does not
 * scroll, so anything revealed by an IntersectionObserver (which is every
 * tile on the sheet) is still in its pre-reveal state below the fold. Walking
 * the page first makes the screenshot show the settled design instead of the
 * loading state.
 */
const SETTLE = `(async () => {
  const step = Math.round(window.innerHeight * 0.75);
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 110));
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise((r) => setTimeout(r, 450));
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 450));
  return document.documentElement.scrollHeight;
})()`;

/** Reports elements whose box escapes the viewport horizontally. */
const OVERFLOW_PROBE = `(() => {
  const vw = window.innerWidth;
  const bad = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      let depth = 0;
      for (let n = el; (n = n.parentElement); ) depth += 1;
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || "").slice(0, 40),
        text: (el.textContent || "").trim().slice(0, 30),
        left: Math.round(r.left),
        right: Math.round(r.right),
        depth,
      });
    }
  }
  bad.sort((a, b) => a.depth - b.depth);
  // \`tiles\` is the mount assertion. A page that threw during render still
  // screenshots cleanly and still reports zero overflow, so "ok" on its own
  // has never meant the design was on screen. Ten tiles means it was.
  return JSON.stringify({
    scrollWidth: document.documentElement.scrollWidth,
    viewport: vw,
    offenders: bad.length,
    tiles: document.querySelectorAll("[data-theme] .sheet-tile").length,
    shallowest: bad.slice(0, 6),
  });
})()`;

async function connect(target) {
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

  return { send, close: () => socket.close() };
}

const server = externalUrl ? null : await serveDist();
const profileDir = join(process.env.TEMP ?? "/tmp", `viactor-shots-${process.pid}`);
const chrome = launchChrome(profileDir);

let failure = null;
/** Views that rendered wrong. Non-empty means a non-zero exit, not a log line. */
const broken = [];
try {
  await waitForDevTools();

  const target = await (
    await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, {
      method: "PUT",
    })
  ).json();
  const { send, close } = await connect(target);

  await mkdir(outDir, { recursive: true });
  await send("Page.enable");
  await send("Runtime.enable");

  // The app reads its language from localStorage on first render, so this has
  // to be in place before the bundle runs, not after the first paint.
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `localStorage.setItem("language", ${JSON.stringify(language)});`,
  });

  for (const mode of MODES) {
    for (const viewport of VIEWPORTS) {
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: mode }],
      });
      await send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      await send("Page.navigate", { url });
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await send("Runtime.evaluate", { expression: SETTLE, awaitPromise: true });

      const { result } = await send("Runtime.evaluate", {
        expression: OVERFLOW_PROBE,
        returnByValue: true,
      });
      const probe = JSON.parse(result.value);
      const view = `${language} ${mode}/${viewport.name}`;
      const verdict =
        probe.tiles !== TILES ? `NOT RENDERED (${probe.tiles}/${TILES} tiles)` :
        probe.offenders > 0 ? "OVERFLOW" : "ok";
      if (verdict !== "ok") broken.push(`${view}: ${verdict}`);
      console.log(
        `${view}: ${verdict} ` +
          `scrollWidth=${probe.scrollWidth} viewport=${probe.viewport}`,
      );
      for (const offender of probe.shallowest) {
        console.log(
          `    depth ${offender.depth} <${offender.tag} class="${offender.cls}"> ` +
            `left=${offender.left} right=${offender.right} ${JSON.stringify(offender.text)}`,
        );
      }

      const shot = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      await writeFile(
        join(outDir, `${mode}-${viewport.name}.png`),
        Buffer.from(shot.data, "base64"),
      );
    }
  }

  close();
} catch (error) {
  failure = error;
} finally {
  killTree(chrome);
  server?.close();
}

if (failure) {
  console.error(failure);
  process.exit(1);
}
if (broken.length > 0) {
  console.error(`\n${broken.length} of ${MODES.length * VIEWPORTS.length} views failed:`);
  for (const line of broken) console.error(`  ${line}`);
  process.exit(1);
}
process.exit(0);
