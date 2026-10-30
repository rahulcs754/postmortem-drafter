"use client";

import { useState } from "react";
import type { DraftResult, Timeline } from "../../src/lib/types";
import { Editor } from "./Editor";

export interface DraftResponse extends DraftResult {
  title?: string;
  timeline: Timeline;
  sourceErrors: { source: string; message: string }[];
}

export function Workspace({ fixtures, aiAvailable }: { fixtures: string[]; aiAvailable: boolean }) {
  const [fixture, setFixture] = useState(fixtures[0] ?? "");
  const [ai, setAi] = useState(aiAvailable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<DraftResponse>();

  async function build() {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixture, ai }),
      });
      const body = (await res.json()) as DraftResponse | { error: string };
      if ("error" in body) throw new Error(body.error);
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="controls" aria-label="Draft settings">
        <label>
          Incident
          <select value={fixture} onChange={(e) => setFixture(e.target.value)}>
            {fixtures.map((f) => (
              <option key={f} value={f}>
                {f} (sample)
              </option>
            ))}
          </select>
        </label>
        <label className="check" title={aiAvailable ? "" : "Set ANTHROPIC_API_KEY to enable"}>
          <input type="checkbox" checked={ai} disabled={!aiAvailable} onChange={(e) => setAi(e.target.checked)} />
          Draft with Claude
        </label>
        <button type="button" onClick={build} disabled={loading || !fixture}>
          {loading ? "Building…" : data ? "Rebuild draft" : "Build draft"}
        </button>
        {!aiAvailable && <span className="hint">No API key: using the offline template.</span>}
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {data && <Editor key={JSON.stringify(data.draft)} data={data} />}
    </>
  );
}
