"use client";

import { useEffect, useRef } from "react";

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    permissionRef.current = Notification.permission;

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        permissionRef.current = permission;
      });
    }
  }, []);

  const notify = (title: string, options?: NotificationOptions) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });
  };

  return { notify, hasPermission: permissionRef.current === "granted" };
}

