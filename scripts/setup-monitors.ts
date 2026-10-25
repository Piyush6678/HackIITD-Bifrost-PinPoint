import { noticePages, topicQueries } from "../src/data/noticeSources";
import { createMonitor, listMonitors } from "../src/lib/tinyfish";

// Creates the TinyFish monitors that watch official notice pages. Run it once; it skips any
// monitor whose name already exists.
//
//   npm run setup:monitors -- --app-url https://your-site.example
//   npm run setup:monitors -- --page "PWD Delhi=https://example.gov.in/notices"
//
// With --app-url (or APP_URL), monitors report to /api/webhooks/tinyfish, authenticated by
// TINYFISH_WEBHOOK_SECRET. Without it they are still created, and /api/cron/notices polls
// them instead. Each scheduled run uses credits, so the schedule is once a day.

const args = process.argv.slice(2);
const values = (name: string) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));

// 07:00 in India (01:30 UTC).
const DAILY = "30 1 * * *";

async function main() {
  const appUrl = values("app-url")[0] ?? process.env.APP_URL;
  const secret = process.env.TINYFISH_WEBHOOK_SECRET;

  let webhookUrl: string | undefined;
  if (appUrl) {
    if (!secret) throw new Error("Set TINYFISH_WEBHOOK_SECRET before pointing monitors at the webhook");
    if (!appUrl.startsWith("https://")) throw new Error("The webhook address must be https");
    webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/tinyfish?secret=${encodeURIComponent(secret)}`;
  } else {
    console.log("No --app-url, so monitors are created without a webhook; use /api/cron/notices to poll them.\n");
  }

  const extra = values("page").map((p) => {
    const [name, ...url] = p.split("=");
    if (!name || url.length === 0) throw new Error(`--page expects "Name=url", got "${p}"`);
    return { name, url: url.join("=") };
  });

  const existing = new Set((await listMonitors()).map((m) => m.name));

  for (const page of [...noticePages, ...extra]) {
    const name = `PinPoint: ${page.name}`;
    if (existing.has(name)) {
      console.log(`skip   ${name} (already exists)`);
      continue;
    }
    const monitor = await createMonitor({
      type: "fetch",
      name,
      url: page.url,
      scheduleCron: DAILY,
      webhookUrl,
      purpose: "Notices that mention the pilot wards: road works, water supply, cleanliness drives",
    });
    console.log(`made   ${name} -> ${monitor.id}`);
  }

  for (const query of topicQueries) {
    const name = `PinPoint: topic ${query.slice(0, 40)}`;
    if (existing.has(name)) {
      console.log(`skip   ${name} (already exists)`);
      continue;
    }
    const monitor = await createMonitor({
      type: "search",
      name,
      query,
      scheduleCron: DAILY,
      webhookUrl,
      purpose: "New official announcements about the pilot wards",
    });
    console.log(`made   ${name} -> ${monitor.id}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
