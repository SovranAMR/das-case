export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== "undefined") {
    const path = window.location.pathname + window.location.search;
    window.location.href = `/giris?next=${encodeURIComponent(path)}`;
  }
  return res;
}
