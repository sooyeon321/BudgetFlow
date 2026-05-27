export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function formatRelativeSeconds(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));

  if (seconds < 5) {
    return "방금 전";
  }

  if (seconds < 60) {
    return `${seconds}초 전`;
  }

  return `${Math.floor(seconds / 60)}분 전`;
}
