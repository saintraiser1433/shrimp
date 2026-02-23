/**
 * Android SMS Gateway integration (https://github.com/capcom6/android-sms-gateway).
 * Send SMS via Local Server (device IP:8080) or Cloud (https://api.sms-gate.app/3rdparty/v1).
 */

export type SendSmsResult = { ok: true } | { ok: false; error: string };

export type SmsGatewayConfig = {
  url: string;
  username: string;
  password: string;
};

export async function sendSmsWithConfig(
  config: SmsGatewayConfig,
  phoneNumbers: string[],
  text: string
): Promise<SendSmsResult> {
  const baseUrl = config.url.trim().replace(/\/$/, "");
  if (!baseUrl || !config.username || !config.password) {
    return { ok: false, error: "Gateway URL, username, and password are required." };
  }
  const url = `${baseUrl}/message`;
  const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        textMessage: { text },
        phoneNumbers,
      }),
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
