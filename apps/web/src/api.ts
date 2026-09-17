export type Row = Record<string, any>;
let accessToken = "";
export function setToken(value: string) {
  accessToken = value;
}
export function getBase() {
  return "";
}
let refreshPromise: Promise<any> | null = null;
export async function api(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<any> {
  const response = await fetch(getBase() + "/api/" + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && retry && !path.startsWith("auth/")) {
    if (!refreshPromise)
      refreshPromise = api("auth/refresh", { method: "POST" }, false)
        .then((r) => {
          setToken(r.accessToken);
          return r;
        })
        .finally(() => {
          refreshPromise = null;
        });
    await refreshPromise;
    return api(path, options, false);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The service is temporarily unavailable. Please try again shortly.",
    );
  }
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
export const money = (v: number = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v / 100);
export const weight = (v: number = 0) =>
  (v / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " kg";
export const date = (v: string | Date) =>
  v
    ? new Date(v).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";
export const title = (v: string = "") =>
  v
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export function csv(name: string, rows: Row[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (v: any) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const blob = new Blob(
    [
      "\ufeff" +
        [
          keys.map(cell).join(","),
          ...rows.map((row) => keys.map((k) => cell(row[k])).join(",")),
        ].join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
