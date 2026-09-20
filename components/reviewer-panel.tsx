"use client";

import { FormEvent, useState } from "react";
import type { ReviewerResponse } from "@/lib/contracts";

export function ReviewerPanel({ submissionId }: Readonly<{ submissionId: string }>) {
  const [response, setResponse] = useState<ReviewerResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: data.get("question"), submissionId }),
      });
      if (!result.ok) throw new Error("The reviewer request was not accepted.");
      setResponse(await result.json() as ReviewerResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The reviewer is unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="reviewer-panel" aria-labelledby="reviewer-heading">
      <div className="reviewer-intro">
        <p className="page-kicker">Second look</p>
        <h2 id="reviewer-heading">Ask a senior reviewer</h2>
        <p>Question this decision using only the evidence already attached to the packet.</p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="reviewer-question">Question for the reviewer</label>
        <textarea id="reviewer-question" name="question" required maxLength={2000} rows={3} placeholder="Which evidence had the greatest effect on this treatment?" />
        <button type="submit" disabled={pending}>{pending ? "Reviewing evidence…" : "Ask reviewer"}</button>
      </form>
      {error && <p role="alert" className="notice notice-error">{error}</p>}
      {response && (
        <div className="reviewer-response" aria-live="polite">
          <p className="page-kicker">Reviewer response</p>
          <p>{response.answer}</p>
          {response.citedIds.length > 0 && <p>Citations: {response.citedIds.join(", ")}</p>}
          <small>Model: {response.model}; tool calls: {response.toolCalls.length}</small>
        </div>
      )}
    </section>
  );
}
