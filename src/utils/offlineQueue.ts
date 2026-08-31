import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createOrder, type CreateOrderBody } from '../api';

// Scoped to order placement only — the customer-facing action most likely to hit spotty
// venue WiFi. Admin actions (confirm/reject/etc. in LiveOrdersManagerScreen) aren't queued;
// those need a live connection anyway to see incoming orders in the first place.
const QUEUE_KEY = 'scancode_offline_order_queue';

export interface QueuedOrder {
  id: string;
  storefrontId: number;
  body: CreateOrderBody;
  queuedAt: string;
}

async function readQueue(): Promise<QueuedOrder[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedOrder[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function isOffline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === false || state.isInternetReachable === false;
}

export async function queueOrder(storefrontId: number, body: CreateOrderBody): Promise<QueuedOrder> {
  const entry: QueuedOrder = {
    id: `queued-${Date.now()}`,
    storefrontId,
    body,
    queuedAt: new Date().toISOString(),
  };
  const queue = await readQueue();
  queue.push(entry);
  await writeQueue(queue);
  return entry;
}

export async function getQueuedOrderCount(): Promise<number> {
  return (await readQueue()).length;
}

let flushing = false;

export async function flushQueuedOrders(): Promise<{ sent: number; remaining: number }> {
  if (flushing) {
    return { sent: 0, remaining: (await readQueue()).length };
  }
  flushing = true;
  try {
    const queue = await readQueue();
    if (queue.length === 0) return { sent: 0, remaining: 0 };

    const stillQueued: QueuedOrder[] = [];
    let sent = 0;
    for (const entry of queue) {
      try {
        await createOrder(entry.storefrontId, entry.body);
        sent++;
      } catch {
        // Still offline, or the request itself failed — keep it queued and retry on the
        // next reconnect rather than dropping the order.
        stillQueued.push(entry);
      }
    }
    await writeQueue(stillQueued);
    return { sent, remaining: stillQueued.length };
  } finally {
    flushing = false;
  }
}

let subscribed = false;

// Call once, near app startup — flushes any queued orders as soon as connectivity returns.
export function initOfflineQueue(): void {
  if (subscribed) return;
  subscribed = true;
  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      flushQueuedOrders();
    }
  });
}
