import { useId, useState } from "react";
import { FileIcon, UploadIcon } from "./Icons.js";
export const MAX_ATTACHMENT_BYTES = 5_242_880;
const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };
export function validateAttachment(file: File): string | null {
  const mime = types[file.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime || file.type !== mime) return "File type not permitted. Allowed types: JPG, PNG, WEBP, PDF.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "File exceeds maximum size of 5 MB.";
  return null;
}
export function formatFileSize(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`; }
export function AttachmentPicker({ files, onChange, slots = 5, disabled = false }: { files: File[]; onChange: (files: File[]) => void; slots?: number; disabled?: boolean }) {
  const id = useId(); const [error, setError] = useState("");
  function add(selected: File[]) {
    if (disabled || slots <= 0) return;
    const accepted = [...files]; const errors: string[] = [];
    for (const file of selected) { const problem = validateAttachment(file); if (problem) errors.push(`${file.name}: ${problem}`); else if (accepted.length >= slots) errors.push("Maximum active attachments (5/5) reached for this ticket."); else accepted.push(file); }
    setError(errors.join(" ")); onChange(accepted);
  }
  return <div className="attachment-picker" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); add(Array.from(event.dataTransfer.files)); }}>
    <UploadIcon /><label htmlFor={id}>Supporting attachments</label><p>Allowed: JPG, JPEG, PNG, WEBP, PDF. Maximum 5 MB per file. Up to 5 files.</p>
    <input id={id} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" disabled={disabled || slots <= 0} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={!!error} onChange={event => { add(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    {slots <= 0 && <p>Maximum active attachments (5/5) reached. Remove an existing attachment to upload a new one.</p>}
    {error && <p id={`${id}-error`} className="ticket-field-error" role="alert">{error}</p>}
    <ul className="attachment-queue">{files.map((file, index) => <li key={`${file.name}-${index}`}><FileIcon image={file.type.startsWith("image/")} /><span>{file.name} ({formatFileSize(file.size)})</span><button type="button" className="zen-button attachment-danger-outline" disabled={disabled} aria-label={`Remove ${file.name} from upload queue`} onClick={() => onChange(files.filter((_, i) => i !== index))}>✕ Remove</button></li>)}</ul>
  </div>;
}
