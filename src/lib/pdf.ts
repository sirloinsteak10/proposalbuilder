import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { signPrintToken } from "@/lib/session";

const CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function chromePath(): string {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const found = CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error("No Chrome/Chromium binary found. Set CHROME_PATH.");
  return found;
}

const MAX_CONCURRENT = 2;
let active = 0;
const waiters: Array<() => void> = [];

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  active++;
}
function release() {
  active--;
  waiters.shift()?.();
}

/** Renders /print/[id] in headless Chrome and returns the PDF bytes. */
export async function renderProposalPdf(proposalId: string): Promise<Uint8Array> {
  await acquire();
  try {
    const port = process.env.PORT || "3000";
    const origin = `http://127.0.0.1:${port}`;
    const token = await signPrintToken(proposalId);
    const browser = await puppeteer.launch({
      executablePath: chromePath(),
      headless: true,
      args: [
        "--disable-gpu",
        "--font-render-hinting=none",
        ...(process.env.CHROME_NO_SANDBOX === "1" ? ["--no-sandbox", "--disable-setuid-sandbox"] : []),
      ],
    });
    try {
      const page = await browser.newPage();
      // Only the app itself may be loaded; this blocks any outbound request from the print page.
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const url = req.url();
        if (url.startsWith(origin) || url.startsWith("data:") || url.startsWith("blob:")) void req.continue();
        else void req.abort();
      });
      const res = await page.goto(`${origin}/print/${encodeURIComponent(proposalId)}?t=${encodeURIComponent(token)}`, {
        waitUntil: "networkidle0",
        timeout: 30_000,
      });
      if (!res || !res.ok()) throw new Error(`Print page returned ${res?.status() ?? "no response"}`);
      await page.evaluate(() => document.fonts.ready);
      return await page.pdf({ preferCSSPageSize: true, printBackground: true });
    } finally {
      await browser.close();
    }
  } finally {
    release();
  }
}
