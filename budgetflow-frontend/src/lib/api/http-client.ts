const BASE_URL = process.env.NEXT_PUBLIC_BUDGETFLOW_API_BASE_URL ?? "";
export const isApiConfigured = Boolean(BASE_URL);

const TOKEN_KEY = "budgetflow.token";

async function getToken(): Promise<string> {
  const cached = localStorage.getItem(TOKEN_KEY);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@inha.ac.kr" }),
  });
  if (!res.ok) throw new Error("자동 로그인에 실패했습니다.");

  const data = (await res.json()) as { idToken?: string; accessToken?: string };
  const token = data.idToken ?? data.accessToken ?? "";
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`API 오류 ${res.status}: ${method} ${path}`);
  return res.json() as Promise<T>;
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
};
