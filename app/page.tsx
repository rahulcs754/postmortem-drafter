import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { Workspace } from "./components/Workspace";

async function listFixtures(): Promise<string[]> {
  const entries = await readdir(join(process.cwd(), "examples"), { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

export default async function Home() {
  const fixtures = await listFixtures();
  return (
    <main className="page">
      <header className="masthead">
        <h1>Postmortem Drafter</h1>
        <p>
          Code builds the timeline from your evidence. Claude drafts the postmortem on top, with a citation on every
          line. You edit and export.
        </p>
      </header>
      <Workspace fixtures={fixtures} aiAvailable={Boolean(process.env.ANTHROPIC_API_KEY)} />
    </main>
  );
}
