import type { Response } from "express";
const errors = {
  MISSING_REQUESTER_CONTEXT: { status: 400, message: "The x-requester-id header is required." },
  INVALID_REQUESTER_ID: { status: 400, message: "The x-requester-id header must be a positive base-10 integer." },
  REQUESTER_NOT_FOUND: { status: 404, message: "Development Requester not found." },
  INTERNAL_ERROR: { status: 500, message: "An unexpected server error occurred." },
  TICKET_NOT_FOUND: { status: 404, message: "Ticket not found." },
  VALIDATION_ERROR: { status: 400, message: "The request contains invalid data." },
} as const;
export function sendError(res: Response, code: keyof typeof errors, fields: Record<string, string> = {}): void {
  const { status, message } = errors[code];
  res.status(status).json({ error: { code, message, ...(code === "VALIDATION_ERROR" ? { fields } : {}) } });
}
