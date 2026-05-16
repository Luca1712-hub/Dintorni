"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { ensureOneSignalInit, isOnesignalClientConfigured } from "@/lib/onesignal/client-init";

/** Su alcuni browser (es. Chrome Android) in primo piano serve display() esplicito. */
export function OneSignalForegroundBridge() {
  useEffect(() => {
    if (!isOnesignalClientConfigured()) return;

    void ensureOneSignalInit().then(() => {
      const handler = (event: {
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
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", handler);
    });
  }, []);

  return null;
}
