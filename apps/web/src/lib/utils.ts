export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0]!;
}

export function currentMondayISO(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  return monday.toISOString().split("T")[0]!;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
