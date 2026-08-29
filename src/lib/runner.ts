import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { extractMetrics, type ExtractedMetrics, type LighthouseResultLike } from "./lighthouse-metrics";

export type Device = "mobile" | "desktop";

/**
 * Lighthouse's own documented default throttling presets: "Slow 4G, 4x CPU
 * slowdown" for mobile, "Dense 4G, no CPU slowdown" for desktop - the
 * "real-device-adjacent" profiles the spec calls for, reused rather than
 * inventing new numbers.
 */
const THROTTLING = {
  mobile: {
    rttMs: 150,
    throughputKbps: 1638.4,
    cpuSlowdownMultiplier: 4,
    requestLatencyMs: 150 * 3.75,
    downloadThroughputKbps: 1638.4 * 0.9,
    uploadThroughputKbps: 675 * 0.9,
  },
  desktop: {
    rttMs: 40,
    throughputKbps: 10240,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0,
  },
} as const;

const SCREEN_EMULATION = {
  mobile: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  desktop: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
} as const;

export type RunResult = ExtractedMetrics;

/**
 * Launches a throwaway headless Chrome, runs Lighthouse's performance
 * category against `url`, and returns the extracted metrics. Chrome is
 * always killed, including on failure - a leaked Chrome process is how a
 * long-running scheduler container slowly runs out of memory.
 */
export async function runLighthouse(url: string, device: Device): Promise<RunResult> {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
    chromePath: process.env.CHROME_PATH,
  });

  try {
    const runnerResult = await lighthouse(
      url,
      { port: chrome.port, output: "json", logLevel: "error" },
      {
        extends: "lighthouse:default",
        settings: {
          formFactor: device,
          screenEmulation: SCREEN_EMULATION[device],
          throttlingMethod: "simulate",
          throttling: THROTTLING[device],
          onlyCategories: ["performance"],
        },
      }
    );

    if (!runnerResult?.lhr) {
      throw new Error("Lighthouse did not return a result");
    }

    return extractMetrics(runnerResult.lhr as unknown as LighthouseResultLike);
  } finally {
    await chrome.kill();
  }
}
