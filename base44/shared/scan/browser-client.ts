// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/browser-client.js)
// Layer D: Isolated Browser Analysis client. The optional headless browser
// worker is never configured in this environment, so this fails safely and
// reports 'unavailable' without blocking the static scan.

import http from "node:http";
import https from "node:https";

/**
 * Client for invoking the isolated headless browser analysis service.
 * If no worker is configured or the worker is unreachable, fails safely and
 * reports 'unavailable' without blocking the static scan or fabricating results.
 */
export async function runBrowserAnalysis(targetUrl, options = {}) {
  const workerUrl = process.env.BROWSER_WORKER_URL;
  const workerSecret = process.env.BROWSER_WORKER_SECRET;

  if (!workerUrl) {
    return {
      attempted: false,
      completed: false,
      status: "unavailable",
      reason: "Browser worker service is not configured in this environment.",
      observations: null
    };
  }

  const timeoutMs = options.timeoutMs || 8_000;

  try {
    const parsed = new URL(workerUrl);
    const client = parsed.protocol === "https:" ? https : http;

    const payload = JSON.stringify({
      url: targetUrl,
      maxRequests: 50,
      timeoutMs: 6_000
    });

    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    };

    if (workerSecret) {
      headers["Authorization"] = `Bearer ${workerSecret}`;
    }

    const workerResult = await new Promise((resolve, reject) => {
      const req = client.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
          path: parsed.pathname + (parsed.search || ""),
          method: "POST",
          headers,
          timeout: timeoutMs
        },
        res => {
          let body = "";
          res.on("data", chunk => (body += chunk));
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(new Error("Worker returned invalid JSON"));
              }
            } else {
              reject(new Error(`Worker responded with HTTP ${res.statusCode}: ${body.slice(0, 100)}`));
            }
          });
          res.on("error", reject);
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Browser worker timed out after ${timeoutMs}ms`));
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });

    return {
      attempted: true,
      completed: true,
      status: "completed",
      reason: null,
      observations: workerResult
    };
  } catch (err) {
    return {
      attempted: true,
      completed: false,
      status: "unavailable",
      reason: `Browser analysis failed or was unreachable: ${err.message}`,
      observations: null
    };
  }
}