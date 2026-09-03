import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type TaskFlowSupabaseClient = SupabaseClient<Database>;

let browserClient: TaskFlowSupabaseClient | undefined;

function readSupabaseConfiguration(): {
  publishableKey: string;
  url: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { publishableKey, url };
}

/** The local repository remains active when these public values are absent. */
export function isSupabaseConfigured(): boolean {
  return readSupabaseConfiguration() !== null;
}

/**
 * Lazily creates the browser client so importing Supabase-ready code does not
 * make credentials a requirement for the local-first V1 experience.
 */
export function createSupabaseBrowserClient(): TaskFlowSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const configuration = readSupabaseConfiguration();
  if (!configuration) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }

  browserClient = createSupabaseClient<Database>(
    configuration.url,
    configuration.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    },
  );

  return browserClient;
}
