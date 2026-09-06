// The same allowlist is used by standalone endpoints and nested ticket detail.
export const attachmentSelect = { id: true, originalFileName: true, mimeType: true, fileSizeBytes: true, isRemoved: true, removedAt: true, removalReason: true, createdAt: true } as const;
