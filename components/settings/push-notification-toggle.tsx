"use client";

import * as React from "react";
import { BellIcon, BellOffIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { subscribeToPush, unsubscribeFromPush } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type Status = "unsupported" | "loading" | "unsubscribed" | "subscribed";

export function PushNotificationToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = React.useState<Status>("loading");
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- capability check can only run client-side; must resolve out of "loading" immediately
      setStatus("unsupported");
      return;
    }
    // Registers unconditionally (not just on enable) so `.ready` has a
    // worker to resolve against — otherwise a first-ever visit with no
    // prior registration would hang in "loading" forever.
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, [vapidPublicKey]);

  function handleEnable() {
    if (!vapidPublicKey) return;
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notifications were blocked — allow them in your browser settings to enable this.");
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });

        const json = subscription.toJSON();
        const result = await subscribeToPush({
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        });

        if (result.error) {
          toast.error("Couldn't enable notifications", { description: result.error });
          return;
        }
        setStatus("subscribed");
        toast.success("Push notifications enabled");
      } catch {
        toast.error("Couldn't enable notifications on this device");
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await unsubscribeFromPush(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setStatus("unsubscribed");
        toast.success("Push notifications disabled");
      } catch {
        toast.error("Couldn't disable notifications");
      }
    });
  }

  if (status === "unsupported") {
    return <p className="text-xs text-muted-foreground">Push notifications aren&apos;t supported in this browser.</p>;
  }

  if (status === "loading") {
    return <Loader2Icon className="size-4 animate-spin text-muted-foreground" />;
  }

  return status === "subscribed" ? (
    <Button variant="outline" size="sm" onClick={handleDisable} disabled={isPending}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <BellOffIcon />}
      Disable push
    </Button>
  ) : (
    <Button size="sm" onClick={handleEnable} disabled={isPending}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <BellIcon />}
      Enable push notifications
    </Button>
  );
}
