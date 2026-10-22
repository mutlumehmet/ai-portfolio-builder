"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createTag, type TagFormState } from "./actions";

const initialState: TagFormState = { error: null };

export function TagForm() {
  const [state, formAction] = useActionState(createTag, initialState);
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
      className="flex flex-wrap items-end gap-4 rounded-lg border-2 border-border bg-card p-4 shadow-brutal-sm"
    >
      <div className="flex flex-1 min-w-40 flex-col gap-1.5">
        <Label htmlFor="name">Tag name</Label>
        <Input id="name" name="name" required placeholder="GraphQL" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kind">Kind</Label>
        <select
          id="kind"
          name="kind"
          defaultValue="technology"
          className="h-10 rounded-lg border-2 border-border bg-card px-3 text-sm font-bold"
        >
          <option value="technology">Technology</option>
          <option value="industry">Industry</option>
        </select>
      </div>

      <SubmitButton />

      {state.error && (
        <p className="w-full text-sm font-bold text-destructive">{state.error}</p>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "+ Add tag"}
    </Button>
  );
}
