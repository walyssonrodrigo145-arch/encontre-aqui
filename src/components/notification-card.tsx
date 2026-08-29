"use client";

import Link from "next/link";
import { markReadAction } from "@/server/actions/notifications";
import { timeAgo } from "@/lib/utils";

export interface NotificationItemData {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export function NotificationCard({ notification: n }: { notification: NotificationItemData }) {
  const icon = n.type.includes("QUOTE")
    ? "📋"
    : n.type.includes("BOOKING") || n.type.includes("APPT")
      ? "📅"
      : n.type.includes("MESSAGE")
        ? "💬"
        : n.type.includes("REVIEW")
          ? "⭐"
          : n.type.includes("BOOST")
            ? "🚀"
            : n.type.includes("SUBSCRIPTION")
              ? "💳"
              : "🔔";

  const content = (
    <div
      className={`card flex gap-3 p-4 transition ${
        !n.readAt ? "border-l-4 border-l-[var(--primary)]" : "opacity-70"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base ${
          !n.readAt ? "bg-[var(--primary-soft)]" : "bg-slate-100"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700">{n.title}</p>
        {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{n.body}</p>}
        <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />}
    </div>
  );

  if (n.link) {
    return (
      <Link
        href={n.link}
        onClick={() => {
          if (!n.readAt) void markReadAction(n.id);
        }}
        className="block"
      >
        {content}
      </Link>
    );
  }
  return content;
}
