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

export async function sendSmsWithConfig(
  config: SmsGatewayConfig,
  phoneNumbers: string[],
  text: string
): Promise<SendSmsResult> {
  const baseUrl = config.url.trim().replace(/\/$/, "");
  if (!baseUrl || !config.username || !config.password) {
    return { ok: false, error: "Gateway URL, username, and password are required." };
  }
  const payload = {
    textMessage: { text },
    phoneNumbers,
  };
  const basicHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;

  try {
    let sendUrl: string;
    let authHeader: string;

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
          error: `Gateway auth failed (${tokenRes.status}): ${errBody || tokenRes.statusText}. Use the username and password shown in the app (Cloud Server) after the device is Online.`,
        };
      }
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      if (!tokenJson.access_token) {
        return { ok: false, error: "Gateway auth response missing access_token." };
      }
      sendUrl = `${apiBase}/messages`;
      authHeader = `Bearer ${tokenJson.access_token}`;
    } else {
      sendUrl = `${baseUrl}/message`;
      authHeader = basicHeader;
    }

    const res = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Gateway returned ${res.status}: ${body || res.statusText}` };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Request failed: ${message}` };
  }
}
