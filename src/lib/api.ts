// src/lib/api.ts
import {
  BskyAgent,
  type AtpSessionData,
  type AtpSessionEvent,
} from "@atproto/api";

export const agent = new BskyAgent({
  // This is the AppView URL
  service: "https://bsky.social",
  // If you were making an authenticated client, you would
  // use the PDS URL here instead - the main one is bsky.social
  // service: "https://bsky.social",
  persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
    // store the session-data for reuse
    localStorage.setItem("session", JSON.stringify(sess));
  },
});

export const getSavedSessionData = () => {
  // if (typeof localStorage === "undefined") return undefined;
  const sess = localStorage.getItem("session");
  if (sess && sess !== "undefined") {
    return JSON.parse(sess);
  }
  return undefined;
};

export const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
export const timeAgo = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
};
