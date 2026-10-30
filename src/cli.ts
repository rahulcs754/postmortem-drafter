import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import type { IncidentConfig } from "./adapters";
import { runPipeline } from "./lib/pipeline";

const USAGE = `Usage:
  postmortem-drafter draft --fixture <dir> [--no-ai] [--out file.md] [--json]
  postmortem-drafter draft --config <incident.json> [--no-ai] [--out file.md] [--json]

  --fixture  folder of recorded API responses (see examples/incident-1)
  --config   incident.json for live mode (reads SLACK_TOKEN, GITHUB_TOKEN, SENTRY_TOKEN, VERCEL_TOKEN)
  --no-ai    use the offline template even if ANTHROPIC_API_KEY is set
  --out      write Markdown to a file instead of stdout
  --json     print timeline + draft as JSON`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      fixture: { type: "string" },
      config: { type: "string" },
      "no-ai": { type: "boolean", default: false },
      out: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || positionals[0] !== "draft" || (!values.fixture && !values.config)) {
    console.error(USAGE);
    return values.help ? 0 : 1;
  }

  const input = values.fixture
    ? { fixture: values.fixture }
    : { live: JSON.parse(await readFile(values.config!, "utf8")) as IncidentConfig };
  const run = await runPipeline(input, { ai: !values["no-ai"] });

  for (const e of run.sourceErrors) console.error(`warn: ${e.source} skipped: ${e.message}`);
  for (const d of run.result.dropped) console.error(`dropped (${d.section}, ${d.reason}): ${d.claim.text}`);
  console.error(
    `${run.timeline.events.length} timeline events · draft by ${run.result.author}` +
      (run.result.author === "offline" ? " (set ANTHROPIC_API_KEY for a Claude draft)" : ""),
  );

  const output = values.json
    ? JSON.stringify({ timeline: run.timeline, ...run.result }, null, 2)
    : run.markdown;
  if (values.out) {
    await writeFile(values.out, output);
    console.error(`wrote ${values.out}`);
  } else {
    process.stdout.write(output);
  }
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
