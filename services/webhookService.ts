/**
 * Webhook dispatch service (#170)
 * - HMAC-SHA256 signing
 * - Retry on failure (up to 3 attempts)
 * - Rate limiting check
 */
import { useWebhookStore, type WebhookEventType, type WebhookDelivery } from '@/store/useWebhookStore';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/** Compute HMAC-SHA256 signature using SubtleCrypto */
async function sign(secret: string, body: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return '';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Build sample payload for test dispatch */
export function buildSamplePayload(event: WebhookEventType): WebhookPayload {
  const samples: Record<WebhookEventType, Record<string, unknown>> = {
    new_signal: { signalId: 'sig_demo', asset: 'XLM/USDC', direction: 'BUY', confidence: 85 },
    trade_execution: { tradeId: 'trade_demo', asset: 'XLM/USDC', status: 'confirmed', txHash: '0xdemo' },
    portfolio_alert: { type: 'drawdown', threshold: 5, current: 6.2, asset: 'XLM' },
  };
  return { event, timestamp: new Date().toISOString(), data: samples[event] };
}

/** Dispatch an event to all registered webhooks that subscribe to it */
export async function dispatchWebhookEvent(event: WebhookEventType, data: Record<string, unknown>) {
  const { webhooks, recordDelivery, decrementRateLimit } = useWebhookStore.getState();
  const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data };
  const body = JSON.stringify(payload);

  for (const webhook of webhooks) {
    if (!webhook.events.includes(event)) continue;
    if (webhook.rateLimit <= 0) continue;

    decrementRateLimit(webhook.id);
    const signature = await sign(webhook.secret, body);
    const delivery = await sendWithRetry(webhook.url, body, signature, webhook.id);
    recordDelivery(webhook.id, delivery);
  }
}

async function sendWithRetry(
  url: string,
  body: string,
  signature: string,
  webhookId: string,
  attempts = 3
): Promise<WebhookDelivery> {
  const deliveryId = `del_${Date.now()}`;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-StellarSwipe-Signature': signature,
        },
        body,
      });
      if (res.ok) {
        return { id: deliveryId, timestamp: new Date().toISOString(), status: 'success', statusCode: res.status };
      }
      if (i === attempts - 1) {
        return { id: deliveryId, timestamp: new Date().toISOString(), status: 'failed', statusCode: res.status, error: `HTTP ${res.status}` };
      }
    } catch (err) {
      if (i === attempts - 1) {
        return { id: deliveryId, timestamp: new Date().toISOString(), status: 'failed', error: (err as Error).message };
      }
    }
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  return { id: deliveryId, timestamp: new Date().toISOString(), status: 'failed', error: 'Max retries exceeded' };
}
