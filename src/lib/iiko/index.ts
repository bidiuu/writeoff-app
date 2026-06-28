import type { IikoAdapter } from "./adapter";
import { MockIikoAdapter } from "./mock-adapter";
import { RealIikoAdapter } from "./real-adapter";

export function getIikoAdapter(): IikoAdapter {
  // IIKO_MODE=mock forces mock regardless of other IIKO_* vars being set
  if (process.env.IIKO_MODE === "mock") {
    return new MockIikoAdapter();
  }
  if (process.env.IIKO_SERVER_URL && process.env.IIKO_LOGIN) {
    return new RealIikoAdapter();
  }
  return new MockIikoAdapter();
}

export type { IikoAdapter, WriteoffPayload, WriteoffResult, WriteoffItem } from "./adapter";