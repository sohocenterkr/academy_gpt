function removeTrailingSlash(value: string): string {
  let result = value;

  while (result.endsWith("/")) {
    result = result.slice(0, -1);
  }

  return result;
}

export function getApplicationBaseUrl(): string {
  const configuredUrl = process.env.APP_URL?.trim();

  if (configuredUrl) {
    const parsed = new URL(configuredUrl);
    return removeTrailingSlash(parsed.toString());
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Production에서는 APP_URL 설정이 필요합니다.");
  }

  const replitDomain = process.env.REPLIT_DEV_DOMAIN?.trim();

  if (replitDomain) {
    return `https://${replitDomain}`;
  }

  const port = process.env.PORT ?? "5000";
  return `http://localhost:${port}`;
}
