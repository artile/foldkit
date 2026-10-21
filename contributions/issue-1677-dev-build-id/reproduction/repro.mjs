// Usage: node repro.mjs <installed app directory> [default|fixed|explicit-per-session]
// default: no build id configured. fixed: FOLDKIT_BUILD_ID=development in every
// session. explicit-per-session: FOLDKIT_BUILD_ID=release-<session>.
// Starts the Vite dev server three times against one persistent browser
// profile and reloads the page normally after each restart. Exits 1 when
// Runtime.hydrate refuses a page that the current dev server rendered.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const appDirectory = resolve(process.argv[2] ?? ".");
const { chromium } = createRequire(join(appDirectory, "package.json"))(
  "playwright",
);
const mode = process.argv[3] ?? "default";
const PORT = 5179;
const SESSION_COUNT = 3;

const assertPortFree = () =>
  new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.once("error", () => reject(new Error(`port ${PORT} is taken`)));
    probe.listen(PORT, "127.0.0.1", () => probe.close(resolvePromise));
  });

const environmentFor = (session) => {
  const environment = { ...process.env };
  delete environment.FOLDKIT_BUILD_ID;
  if (mode === "fixed") {
    environment.FOLDKIT_BUILD_ID = "development";
  }
  if (mode === "explicit-per-session") {
    environment.FOLDKIT_BUILD_ID = `release-${session}`;
  }
  return environment;
};

const startVite = (session) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(
      "npx",
      ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
      {
        cwd: appDirectory,
        env: environmentFor(session),
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    const onData = (chunk) => {
      output += chunk;
      if (output.includes("Local:")) {
        resolvePromise(child);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) =>
      reject(new Error(`vite exited ${code}\n${output}`)),
    );
  });

const stopVite = (child) =>
  new Promise((resolvePromise) => {
    child.removeAllListeners("exit");
    child.once("exit", resolvePromise);
    process.kill(-child.pid, "SIGTERM");
  });

await assertPortFree();
const profile = mkdtempSync(join(tmpdir(), "fk1677-profile-"));
const context = await chromium.launchPersistentContext(profile, {
  headless: true,
});
const page = context.pages()[0] ?? (await context.newPage());

let errors = [];
let buildToken = undefined;
let stamped = undefined;
page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => errors.push(String(error)));
page.on("response", async (response) => {
  if (response.request().resourceType() === "document") {
    const html = await response.text();
    stamped = /data-foldkit-build="([^"]*)"/.exec(html)?.[1];
  }
  if (response.url().includes("/foldkit/dist/buildToken.js")) {
    buildToken = {
      url: response.url().replace(`http://127.0.0.1:${PORT}`, ""),
      cacheControl: response.headers()["cache-control"],
    };
  }
});

const url = `http://127.0.0.1:${PORT}/`;
let isReproduced = false;
for (let session = 1; session <= SESSION_COUNT; session++) {
  const vite = await startVite(session);
  try {
    errors = [];
    buildToken = undefined;
    stamped = undefined;
    if (session === 1) {
      await page.goto(url, { waitUntil: "networkidle" });
    } else {
      await page.reload({ waitUntil: "networkidle" });
    }
    await page.waitForTimeout(500);
    const isRefused =
      (await page.locator("body[data-foldkit-refused]").count()) > 0;
    const clientId = await page.evaluate(async () => {
      const entry = performance
        .getEntriesByType("resource")
        .find((resource) =>
          resource.name.includes("/foldkit/dist/buildToken.js"),
        );
      if (entry === undefined) {
        return "not loaded";
      }
      const module = await import(entry.name);
      return module.injectedBuildId;
    });
    const resource = await page.evaluate(() => {
      const entry = performance
        .getEntriesByType("resource")
        .find((resource) =>
          resource.name.includes("/foldkit/dist/buildToken.js"),
        );
      return entry === undefined
        ? "not loaded"
        : `transferSize=${entry.transferSize} (0 means served from the browser cache)`;
    });
    console.log(
      `session ${session}${session === 1 ? ", first load" : ", restarted dev server, normal reload"}`,
    );
    console.log(`  id stamped on page:    ${stamped}`);
    console.log(`  id in client module:   ${clientId}`);
    console.log(
      `  buildToken.js:         ${buildToken?.url ?? "not requested over the network"} cache-control=${buildToken?.cacheControl ?? "n/a"}`,
    );
    console.log(`  buildToken.js timing:  ${resource}`);
    console.log(`  body refused:          ${isRefused}`);
    for (const error of errors) {
      console.log(`  console error:         ${error.split("\n")[0]}`);
    }
    if (isRefused || stamped !== clientId) {
      isReproduced = true;
    }
  } finally {
    await stopVite(vite);
  }
}

await context.close();
rmSync(profile, { recursive: true, force: true });
console.log(
  isReproduced
    ? "REPRODUCED: hydration refused a page from the current dev server"
    : "PASSED: every reload hydrated",
);
process.exit(isReproduced ? 1 : 0);
