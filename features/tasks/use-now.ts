"use client";

import { useSyncExternalStore } from "react";

type ClockListener = () => void;

const listeners = new Set<ClockListener>();
let currentTimestamp = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;

function publishCurrentTime() {
  currentTimestamp = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: ClockListener) {
  listeners.add(listener);

  if (listeners.size === 1) {
    currentTimestamp = Date.now();
    intervalId = setInterval(publishCurrentTime, 1_000);
    document.addEventListener("visibilitychange", publishCurrentTime);
    window.addEventListener("focus", publishCurrentTime);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      document.removeEventListener("visibilitychange", publishCurrentTime);
      window.removeEventListener("focus", publishCurrentTime);
    }
  };
}

function getSnapshot() {
  return currentTimestamp;
}

function getServerSnapshot() {
  return null;
}

/** Returns one shared client timestamp for every mounted countdown. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
