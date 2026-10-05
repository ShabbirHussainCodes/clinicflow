"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { signIn, type LoginState } from "@/app/admin/login/actions";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";

const INITIAL: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL);
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <Alert
          tone="danger"
          title="Couldn't sign you in"
          live="assertive"
          data-testid="login-error"
        >
          {state.error}
        </Alert>
      ) : null}

      <TextField
        label="Email address"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        defaultValue={state.email ?? ""}
        error={state.fieldErrors?.email}
      />

      <div className="space-y-1.5">
        <TextField
          label="Password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          className="inline-flex items-center gap-1.5 rounded-xs text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
          {visible ? "Hide password" : "Show password"}
        </button>
      </div>

      <Button
        type="submit"
        size="lg"
        loading={pending}
        className="w-full"
        icon={<LogIn className="size-4" aria-hidden="true" />}
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
