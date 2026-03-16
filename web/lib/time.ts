export function formatShanghaiYmd(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const map = new Map(parts.map((p) => [p.type, p.value]));
  const yyyy = map.get("year") ?? "0000";
  const mm = map.get("month") ?? "00";
  const dd = map.get("day") ?? "00";
  return `${yyyy}-${mm}-${dd}`;
}

