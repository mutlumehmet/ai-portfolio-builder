"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="from" value={from} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
        />
      </div>
      {state.error && (
        <p className="text-sm font-bold text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
