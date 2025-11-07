export type RequestLogRecord = {
  id: number;
  source: string;
  path: string;
  method: string;
  status: number | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export type CreateRequestLogInput = {
  source: string;
  path: string;
  method: string;
  status?: number | null;
  metadata?: string | null;
  ipAddress?: string | null;
};