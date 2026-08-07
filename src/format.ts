export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
}

export function sessionDuration(session: {
  startedAt: number;
  endedAt: number | null;
}): number {
  return (session.endedAt ?? session.startedAt) - session.startedAt;
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function startOfWeek(ts: number): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function weekKey(ts: number): string {
  return dayKey(startOfWeek(ts).getTime());
}

export function weekLabel(ts: number): string {
  return startOfWeek(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}
