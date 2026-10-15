"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthError, User } from "@supabase/supabase-js";

import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
  type TaskFlowSupabaseClient,
} from "@/lib/supabase/client";

export type AuthStatus =
  | "loading"
  | "signed_out"
  | "signed_in"
  | "unconfigured"
  | "error";

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_exists"
  | "weak_password"
  | "rate_limited"
  | "unknown";

export class TaskFlowAuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "TaskFlowAuthError";
  }
}

export interface AuthSubmissionResult {
  confirmationRequired: boolean;
}

function toAuthError(error: AuthError): TaskFlowAuthError {
  const code = error.code ?? "";
  if (code === "invalid_credentials") {
    return new TaskFlowAuthError("invalid_credentials", { cause: error });
  }
  if (code === "email_not_confirmed") {
    return new TaskFlowAuthError("email_not_confirmed", { cause: error });
  }
  if (code === "user_already_exists" || code === "email_exists") {
    return new TaskFlowAuthError("user_exists", { cause: error });
  }
  if (code === "weak_password") {
    return new TaskFlowAuthError("weak_password", { cause: error });
  }
  if (code === "over_request_rate_limit" || error.status === 429) {
    return new TaskFlowAuthError("rate_limited", { cause: error });
  }
  return new TaskFlowAuthError("unknown", { cause: error });
}

export function useAuthSession() {
  const configured = isSupabaseConfigured();
  const client = useMemo<TaskFlowSupabaseClient | null>(
    () => (configured ? createSupabaseBrowserClient() : null),
    [configured],
  );
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "unconfigured",
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      // The first cached session is verified by getUser() below before cloud
      // persistence is selected. Subsequent auth events come from auth APIs.
      if (event === "INITIAL_SESSION") return;
      setUser(session?.user ?? null);
      setStatus(session?.user ? "signed_in" : "signed_out");
    });

    void client.auth.getUser().then(({ data: userData, error }) => {
      if (!active) return;
      if (error) {
        setUser(null);
        setStatus(
          error.status === 401 ||
            error.name === "AuthSessionMissingError" ||
            error.code === "session_not_found"
            ? "signed_out"
            : "error",
        );
        return;
      }
      setUser(userData.user);
      setStatus(userData.user ? "signed_in" : "signed_out");
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthSubmissionResult> => {
      if (!client) throw new TaskFlowAuthError("unknown");
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw toAuthError(error);
      setUser(data.user);
      setStatus("signed_in");
      return { confirmationRequired: false };
    },
    [client],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthSubmissionResult> => {
      if (!client) throw new TaskFlowAuthError("unknown");
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw toAuthError(error);

      if (data.session && data.user) {
        setUser(data.user);
        setStatus("signed_in");
      }

      return { confirmationRequired: !data.session };
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw toAuthError(error);
    setUser(null);
    setStatus("signed_out");
  }, [client]);

  return {
    client,
    configured,
    isInitialized: status !== "loading",
    signIn,
    signOut,
    signUp,
    status,
    user,
  };
}
