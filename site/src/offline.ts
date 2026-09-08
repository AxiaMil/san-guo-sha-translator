import { useEffect, useState } from "react";
export function useOfflineUpdate() {
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let alive = true;
    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting && alive) setUpdate(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller &&
              alive
            )
              setUpdate(reg.waiting || worker);
          });
        });
      })
      .catch(() => {
        /* A failed cache must not prevent online use. */
      });
    return () => {
      alive = false;
    };
  }, []);
  return update
    ? () => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => location.reload(),
          { once: true },
        );
        update.postMessage("ACTIVATE_UPDATE");
      }
    : null;
}
