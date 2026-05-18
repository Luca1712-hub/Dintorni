"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { ensureOneSignalInit, isOnesignalClientConfigured } from "@/lib/onesignal/client-init";
import { navigaSeDiverso, urlDaClickNotifica } from "@/lib/onesignal/notification-click-url";

/** Foreground display + navigazione al tap (es. Chrome Android con tab su /dashboard). */
export function OneSignalForegroundBridge() {
  useEffect(() => {
    if (!isOnesignalClientConfigured()) return;

    let cancelled = false;
    let removeListeners: (() => void) | undefined;

    void ensureOneSignalInit().then(() => {
      if (cancelled) return;

      const onForeground = (event: {
        preventDefault: () => void;
        notification: { display: () => void };
      }) => {
        try {
          event.preventDefault();
          event.notification.display();
        } catch {
          /* alcuni browser non supportano preventDefault */
        }
      };

      const onClick = (event: unknown) => {
        const url = urlDaClickNotifica(event);
        if (url) navigaSeDiverso(url);
      };

      OneSignal.Notifications.addEventListener("foregroundWillDisplay", onForeground);
      OneSignal.Notifications.addEventListener("click", onClick);

      removeListeners = () => {
        OneSignal.Notifications.removeEventListener("foregroundWillDisplay", onForeground);
        OneSignal.Notifications.removeEventListener("click", onClick);
      };
    });

    return () => {
      cancelled = true;
      removeListeners?.();
    };
  }, []);

  return null;
}
