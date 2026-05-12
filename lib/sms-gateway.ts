/**
 * Android SMS Gateway integration (https://github.com/capcom6/android-sms-gateway).
 * Send SMS via Local Server (device IP:8080) or Cloud (https://api.sms-gate.app/3rdparty/v1).
 *
 * Local server: Basic auth, POST …/message (see project README / docs).
 * Cloud & /3rdparty/v1: obtain JWT via POST …/auth/token (Basic), then POST …/messages with Bearer.
 */

export type SendSmsResult = { ok: true } | { ok: false; error: string };

export type SmsGatewayConfig = {
  url: string;
  username: string;
  password: string;
};

const CREDENTIALS_HINT =
  "Copy username and password from the app (Cloud Server) with no extra spaces. On Android, use the copy action: the characters can look alike (e.g. I vs l).";

function resolveThirdPartyApiBase(trimmedUrl: string): string {
  const marker = "/3rdparty/v1";
  const idx = trimmedUrl.indexOf(marker);
  if (idx !== -1) {
    return trimmedUrl.slice(0, idx + marker.length);
  }
  if (trimmedUrl.includes("sms-gate.app")) {
    return `${trimmedUrl}${marker}`;
  }
  return trimmedUrl;
}

function usesThirdPartyJwtFlow(trimmedUrl: string): boolean {
  return trimmedUrl.includes("sms-gate.app") || trimmedUrl.includes("/3rdparty/v1");
}

async function postSms(
  url: string,
  authorization: string,
  payload: { textMessage: { text: string }; phoneNumbers: string[] }
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify(payload),
  });
}

export async function sendSmsWithConfig(
  config: SmsGatewayConfig,
  phoneNumbers: string[],
  text: string
): Promise<SendSmsResult> {
  const baseUrl = config.url.trim().replace(/\/$/, "");
  const username = config.username.trim();
  const password = config.password.trim();
  if (!baseUrl || !username || !password) {
    return { ok: false, error: "Gateway URL, username, and password are required." };
  }
  const payload = {
    textMessage: { text },
    phoneNumbers,
  };
  const basicHeader = `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;

  try {
    if (usesThirdPartyJwtFlow(baseUrl)) {
      const apiBase = resolveThirdPartyApiBase(baseUrl);
      const tokenRes = await fetch(`${apiBase}/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: basicHeader,
        },
        body: JSON.stringify({
          ttl: 3600,
          scopes: ["messages:send"],
        }),
      });
      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        return {
          ok: false,
          error: `Could not obtain API token (${tokenRes.status}): ${errBody || tokenRes.statusText}. ${CREDENTIALS_HINT} Self-hosted gateways must use the full base URL (e.g. …/api/3rdparty/v1).`,
        };
      }
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      if (!tokenJson.access_token) {
        return { ok: false, error: "Gateway auth response missing access_token." };
      }
      const bearerHeader = `Bearer ${tokenJson.access_token}`;

      const sendAttempts: { label: string; url: string; auth: string }[] = [
        { label: "JWT → /messages", url: `${apiBase}/messages`, auth: bearerHeader },
        { label: "JWT → /message", url: `${apiBase}/message`, auth: bearerHeader },
        { label: "Basic → /message", url: `${apiBase}/message`, auth: basicHeader },
        { label: "Basic → /messages", url: `${apiBase}/messages`, auth: basicHeader },
      ];

      let lastStatus = 0;
      let lastBody = "";
      for (const a of sendAttempts) {
        const res = await postSms(a.url, a.auth, payload);
        if (res.ok) return { ok: true };
        lastStatus = res.status;
        lastBody = await res.text();
        if (lastStatus !== 401 && lastStatus !== 404) {
          return {
            ok: false,
            error: `Gateway returned ${lastStatus} (${a.label}): ${lastBody || res.statusText}`,
          };
        }
      }
      return {
        ok: false,
        error: `Gateway returned ${lastStatus}: ${lastBody || "Unauthorized"}. ${CREDENTIALS_HINT}`,
      };
    }

    const res = await postSms(`${baseUrl}/message`, basicHeader, payload);
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 404) {
        const retry = await postSms(`${baseUrl}/messages`, basicHeader, payload);
        if (retry.ok) return { ok: true };
        const retryBody = await retry.text();
        return {
          ok: false,
          error: `Gateway returned ${retry.status}: ${retryBody || retry.statusText}. For a self-hosted server, set Gateway URL to the full 3rdparty base (often …/api/3rdparty/v1). ${CREDENTIALS_HINT}`,
        };
      }
      return { ok: false, error: `Gateway returned ${res.status}: ${body || res.statusText}` };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Request failed: ${message}` };
  }
}
