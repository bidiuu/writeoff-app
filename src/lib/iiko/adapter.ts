export interface WriteoffItem {
  productId: string;
  productName: string;
  amount: number;
  measureUnitId: string;
}

export interface WriteoffPayload {
  storeId: string;
  accountId: string;
  comment: string;
  items: WriteoffItem[];
}

export interface WriteoffResult {
  documentNumber: string;
  status: "created" | "failed";
  error?: string;
}

export interface IikoAdapter {
  createWriteoffAct(payload: WriteoffPayload): Promise<WriteoffResult>;
}
