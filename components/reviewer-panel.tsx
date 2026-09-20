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
    <section aria-labelledby="reviewer-heading">
      <h2 id="reviewer-heading">Senior Reviewer</h2>
      <form onSubmit={submit}>
        <label htmlFor="reviewer-question">Ask about the cached decision evidence</label>
        <textarea id="reviewer-question" name="question" required maxLength={2000} rows={3} />
        <p><button type="submit" disabled={pending}>{pending ? "Reviewing…" : "Ask reviewer"}</button></p>
      </form>
      {error && <p role="alert">{error}</p>}
      {response && (
        <div aria-live="polite">
          <p>{response.answer}</p>
          {response.citedIds.length > 0 && <p>Citations: {response.citedIds.join(", ")}</p>}
          <small>Model: {response.model}; tool calls: {response.toolCalls.length}</small>
        </div>
      )}
    </section>
  );
}
