"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ensureOneSignalInit, isOnesignalClientConfigured } from "@/lib/onesignal/client-init";
import { assicuraLoginOnesignal } from "@/lib/onesignal/subscription";

/**
 * Allinea login/logout OneSignal a ogni sessione (anche su smartphone).
 * Senza login su ogni visita, la subscription può restare anonima e le push non arrivano.
 */
export function OneSignalAuthBridge() {
  useEffect(() => {
    if (!isOnesignalClientConfigured()) return;

    const supabase = createBrowserSupabaseClient();

    async function syncLogin(userId: string) {
      try {
        await ensureOneSignalInit();
        await assicuraLoginOnesignal(userId);
      } catch (e) {
        console.error("[OneSignalAuthBridge] login", e);
      }
    }

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        await syncLogin(data.session.user.id);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_IN" && session?.user?.id) {
          await syncLogin(session.user.id);
        }
        if (event === "SIGNED_OUT") {
          await ensureOneSignalInit();
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
