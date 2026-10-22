"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createFaq, type FaqFormState } from "./actions";

const initialState: FaqFormState = { error: null };

export function FaqForm() {
  const [state, formAction] = useActionState(createFaq, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border-2 border-border bg-card p-4 shadow-brutal-sm"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="question">Question</Label>
        <Input id="question" name="question" required placeholder="Do you know Figma?" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="answer">Answer</Label>
        <Textarea id="answer" name="answer" required rows={3} placeholder="Advanced/pro level…" />
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton />
        {state.error && <p className="text-sm font-bold text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? "Adding…" : "+ Add FAQ"}
    </Button>
  );
}
