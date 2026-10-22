"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { deleteFaq, moveFaq, updateFaq } from "./actions";

type FaqRow = { id: string; question: string; answer: string; order: number };

export function FaqList({ faqs }: { faqs: FaqRow[] }) {
  if (faqs.length === 0) {
    return <p className="text-sm text-muted-foreground">No FAQ entries yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq, i) => (
        <FaqRow key={faq.id} faq={faq} isFirst={i === 0} isLast={i === faqs.length - 1} />
      ))}
    </div>
  );
}

function FaqRow({ faq, isFirst, isLast }: { faq: FaqRow; isFirst: boolean; isLast: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const result = await updateFaq(faq.id, { error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setIsEditing(false);
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this FAQ entry?")) return;
    startTransition(() => deleteFaq(faq.id));
  }

  if (isEditing) {
    return (
      <form
        action={handleSave}
        className="flex flex-col gap-3 rounded-lg border-2 border-border bg-card p-4 shadow-brutal-sm"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`question-${faq.id}`}>Question</Label>
          <Input
            id={`question-${faq.id}`}
            name="question"
            required
            defaultValue={faq.question}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`answer-${faq.id}`}>Answer</Label>
          <Textarea
            id={`answer-${faq.id}`}
            name="answer"
            required
            rows={3}
            defaultValue={faq.answer}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={() => {
              setError(null);
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-lg border-2 border-border bg-card p-4 shadow-brutal-sm">
      <div className="flex flex-col gap-1 pt-1">
        <button
          type="button"
          disabled={isFirst || isPending}
          onClick={() => startTransition(() => moveFaq(faq.id, "up"))}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={isLast || isPending}
          onClick={() => startTransition(() => moveFaq(faq.id, "down"))}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move down"
        >
          ↓
        </button>
      </div>

      <div className="flex-1">
        <p className="font-bold">{faq.question}</p>
        <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
      </div>

      <div className="flex flex-none flex-col gap-2">
        <Button type="button" variant="neutral" size="sm" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <Button type="button" variant="neutral" size="sm" disabled={isPending} onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
