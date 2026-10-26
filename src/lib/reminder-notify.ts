// Browser side of the leaving reminders: asking permission and showing a notification.
// A notification-only service worker (public/sw.js) is used because phones require one.
// It does not cache anything, so the app still has no offline mode.

export type NotifyState = "unsupported" | "default" | "granted" | "denied";

export function notifyState(): NotifyState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

async function registerWorker(): Promise<ServiceWorkerRegistration | undefined> {
  try {
    if (!("serviceWorker" in navigator)) return undefined;
    return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  } catch {
    return undefined;
  }
}

export async function enableNotifications(): Promise<NotifyState> {
  if (typeof Notification === "undefined") return "unsupported";
  await registerWorker();
  return (await Notification.requestPermission()) as NotifyState;
}

export async function showReminder(title: string, body: string, tag: string): Promise<boolean> {
  if (notifyState() !== "granted") return false;
  const options = { body, tag, icon: "/icons/pack-192.png", badge: "/icons/pack-192.png" };
  const registration = await registerWorker();
  try {
    if (registration) {
      await registration.showNotification(title, options);
      return true;
    }
  } catch {
    /* fall through to the plain constructor */
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

export function downloadCalendar(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "trip"}-leaving.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
