"use client";

import { useMemo, useState } from "react";
import { clock } from "../../src/lib/format";
import { toMarkdown } from "../../src/lib/markdown";
import { CONFIDENCE, SECTION_KEYS, SECTION_TITLES, type Claim, type Draft, type SectionKey } from "../../src/lib/types";
import type { DraftResponse } from "./Workspace";

const domId = (eventId: string) => `ev-${eventId.replace(/[^\w-]/g, "_")}`;

export function Editor({ data }: { data: DraftResponse }) {
  const { timeline } = data;
  const [draft, setDraft] = useState<Draft>(data.draft);
  const [focus, setFocus] = useState<string>();
  const byId = useMemo(() => new Map(timeline.events.map((e) => [e.id, e])), [timeline]);
  const markdown = useMemo(() => toMarkdown(draft, timeline), [draft, timeline]);
  const m = timeline.metrics;

  function update(section: SectionKey, index: number, patch: Partial<Claim> | null) {
    setDraft((d) => {
      const claims = [...d.sections[section]];
      if (patch === null) claims.splice(index, 1);
      else claims[index] = { ...claims[index]!, ...patch };
      return { ...d, sections: { ...d.sections, [section]: claims } };
    });
  }

  function jump(id: string) {
    setFocus(id);
    document.getElementById(domId(id))?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "postmortem.md" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <dl className="metrics">
        <div><dt>Errors</dt><dd>{m.totalErrors}</dd></div>
        {m.usersAffected !== undefined && <div><dt>Users affected</dt><dd>{m.usersAffected}</dd></div>}
        {m.timeToDetectMin !== undefined && <div><dt>Time to detect</dt><dd>{m.timeToDetectMin} min</dd></div>}
        {m.durationMin !== undefined && <div><dt>Duration</dt><dd>{m.durationMin} min</dd></div>}
        <div><dt>Draft by</dt><dd>{data.author === "claude" ? "Claude" : "Offline template"}</dd></div>
      </dl>

      {data.sourceErrors.map((e) => (
        <p key={e.source} className="warn">{e.source} skipped: {e.message}</p>
      ))}
      {data.dropped.length > 0 && (
        <details className="warn">
          <summary>{data.dropped.length} uncited line(s) removed</summary>
          <ul>{data.dropped.map((d, i) => <li key={i}>{SECTION_TITLES[d.section]}: {d.claim.text} ({d.reason})</li>)}</ul>
        </details>
      )}

      <div className="split">
        <section className="timeline" aria-label="Timeline">
          <h2>Timeline</h2>
          <ol>
            {timeline.events.map((e) => (
              <li key={e.id} id={domId(e.id)} className={`event ${e.kind} ${focus === e.id ? "focus" : ""}`}>
                <time dateTime={e.at}>{clock(e.at).slice(0, 5)}</time>
                <span className={`src ${e.source}`}>{e.source}</span>
                <span className="title">
                  {e.url ? <a href={e.url} target="_blank" rel="noreferrer">{e.title}</a> : e.title}
                  {e.actor && <span className="actor"> · {e.actor}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="draft" aria-label="Draft">
          <input
            className="draft-title"
            aria-label="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          {SECTION_KEYS.map((key) => (
            <div key={key} className="section">
              <h3>{SECTION_TITLES[key]}</h3>
              {draft.sections[key].length === 0 && <p className="empty">Nothing in the evidence for this yet.</p>}
              {draft.sections[key].map((c, i) => (
                <div key={i} className={`claim ${c.confidence}`}>
                  <textarea
                    aria-label={`${SECTION_TITLES[key]} line ${i + 1}`}
                    value={c.text}
                    rows={Math.max(2, Math.ceil(c.text.length / 70))}
                    onChange={(e) => update(key, i, { text: e.target.value })}
                  />
                  <div className="claim-meta">
                    <select
                      aria-label="Confidence"
                      value={c.confidence}
                      onChange={(e) => update(key, i, { confidence: e.target.value as Claim["confidence"] })}
                    >
                      {CONFIDENCE.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    {c.cites.map((id) => (
                      <button key={id} type="button" className="cite" onClick={() => jump(id)} title={byId.get(id)?.title}>
                        {byId.get(id) ? clock(byId.get(id)!.at).slice(0, 5) : id}
                      </button>
                    ))}
                    <button type="button" className="remove" onClick={() => update(key, i, null)} aria-label="Remove line">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div className="export">
            <button type="button" onClick={download}>Download Markdown</button>
            <button type="button" onClick={() => navigator.clipboard.writeText(markdown)}>Copy Markdown</button>
          </div>
        </section>
      </div>
    </>
  );
}
