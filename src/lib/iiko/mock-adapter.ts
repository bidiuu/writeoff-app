import type { IikoAdapter, WriteoffPayload, WriteoffResult } from "./adapter";

export class MockIikoAdapter implements IikoAdapter {
  async createWriteoffAct(payload: WriteoffPayload): Promise<WriteoffResult> {
    await new Promise((r) => setTimeout(r, 500));
    const documentNumber = `MOCK-${Date.now()}`;
    console.log("[MockIiko] Created writeoff act:", documentNumber, payload);
    return { documentNumber, status: "created" };
  }
}
