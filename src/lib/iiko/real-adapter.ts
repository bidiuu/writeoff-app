import type { IikoAdapter, WriteoffPayload, WriteoffResult } from "./adapter";

export class RealIikoAdapter implements IikoAdapter {
  private baseUrl: string;
  private login: string;
  private passwordSha1: string;

  constructor() {
    this.baseUrl = process.env.IIKO_SERVER_URL!;
    this.login = process.env.IIKO_LOGIN!;
    this.passwordSha1 = process.env.IIKO_PASSWORD_SHA1!;
  }

  private async getToken(): Promise<string> {
    // Note: Iiko API requires credentials in query string — no alternative in their v2 API
    const res = await fetch(
      `${this.baseUrl}/resto/api/auth?login=${encodeURIComponent(this.login)}&pass=${encodeURIComponent(this.passwordSha1)}`
    );
    if (!res.ok) throw new Error(`Iiko auth failed: ${res.status}`);
    return res.text();
  }

  private async logout(token: string): Promise<void> {
    await fetch(`${this.baseUrl}/resto/api/logout?key=${token}`).catch(() => {});
  }

  async createWriteoffAct(payload: WriteoffPayload): Promise<WriteoffResult> {
    const token = await this.getToken();
    try {
      const documentNumber = `WO-${Date.now()}`;
      const body = {
        dateIncoming: new Date().toISOString().split("T")[0],
        documentNumber,
        status: "PROCESSED",
        comment: payload.comment,
        storeId: payload.storeId,
        accountId: payload.accountId,
        items: payload.items.map((item) => ({
          productId: item.productId,
          amount: item.amount,
          measureUnitId: item.measureUnitId,
        })),
      };

      const res = await fetch(
        `${this.baseUrl}/resto/api/v2/documents/writeoff?key=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        // Log internally, never surface Iiko error details to client
        const errText = await res.text();
        console.error(`[Iiko] writeoff failed: status=${res.status} body=${errText}`);
        return { documentNumber: "", status: "failed", error: "Iiko integration error" };
      }

      return { documentNumber, status: "created" };
    } finally {
      await this.logout(token);
    }
  }
}