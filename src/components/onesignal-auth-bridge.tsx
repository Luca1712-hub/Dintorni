"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  ensureOneSignalInit,
  isOnesignalClientConfigured,
  unregisterConflictingPushServiceWorkers,
} from "@/lib/onesignal/client-init";

/**
 * Allinea external_id OneSignal = id utente Supabase dopo login e fa logout su OneSignal in uscita.
 */
export function OneSignalAuthBridge() {
  useEffect(() => {
    if (!isOnesignalClientConfigured()) return;

    const supabase = createBrowserSupabaseClient();

    void (async () => {
      try {
        await unregisterConflictingPushServiceWorkers();
        await ensureOneSignalInit();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await OneSignal.login(session.user.id);
        }
      } catch (e) {
        console.error("[OneSignalAuthBridge] init/session", e);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        await ensureOneSignalInit();
        if (event === "SIGNED_IN" && session?.user?.id) {
          await OneSignal.login(session.user.id);
        }
        if (event === "SIGNED_OUT") {
          await OneSignal.logout();
        }
      } catch (e) {
        console.error("[OneSignalAuthBridge]", e);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
