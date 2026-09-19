import { apiFetch, ApiCallError } from "./api.js";
export interface Attachment { id: number; originalFileName: string; mimeType: string; fileSizeBytes: number; isRemoved: boolean; removedAt: string | null; removalReason: string | null; createdAt: string }
async function metadata(path: string, init: RequestInit): Promise<Attachment> {
  const response = await apiFetch(path, init); const body = await response.json();
  if (!response.ok) throw new ApiCallError(response.status, body.error);
  return body;
}
export function uploadAttachment(ticketId: number, file: File, signal?: AbortSignal) {
  const body = new FormData(); body.append("file", file);
  return metadata(`/api/tickets/${ticketId}/attachments`, { method: "POST", body, signal });
}
export const getAttachment = (id: number, signal?: AbortSignal) => metadata(`/api/attachments/${id}`, { signal });
export const removeAttachment = (id: number, removalReason: string, signal?: AbortSignal) => metadata(`/api/attachments/${id}/remove`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ removalReason }), signal });
export async function downloadAttachment(attachment: Pick<Attachment, "id" | "originalFileName">, signal?: AbortSignal) {
  const response = await apiFetch(`/api/attachments/${attachment.id}/download`, { signal });
  if (!response.ok) { const body = await response.json(); throw new ApiCallError(response.status, body.error); }
  const blob = await response.blob(); if (signal?.aborted) return;
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  try { link.href = url; link.download = attachment.originalFileName; document.body.append(link); link.click(); }
  finally { link.remove(); URL.revokeObjectURL(url); }
}
