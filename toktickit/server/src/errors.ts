import type { Response } from "express";
const errors = {
  ATTACHMENT_NOT_FOUND: { status: 404, message: "Attachment not found." },
  ALREADY_REMOVED: { status: 409, message: "Attachment has already been removed." },
  ATTACHMENT_LIMIT_REACHED: { status: 409, message: "Maximum active attachments (5/5) reached for this ticket." },
  FILE_TOO_LARGE: { status: 413, message: "File exceeds maximum size of 5 MB." },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: "File type not permitted. Allowed types: JPG, PNG, WEBP, PDF." },
  // Lab 3 authentication & authorisation
  UNAUTHENTICATED: { status: 401, message: "Authentication required. Please log in." },
  INVALID_CREDENTIALS: { status: 401, message: "Invalid email or password. Please try again." },
  CSRF_PROTECTION_FAILED: { status: 403, message: "CSRF protection validation failed." },
  FORBIDDEN: { status: 403, message: "You do not have permission to perform this action." },
  MUST_CHANGE_PASSWORD: { status: 403, message: "You must change your password before continuing." },
  PASSWORD_COMPLEXITY_FAILED: { status: 400, message: "Password does not meet complexity requirements." },
  PASSWORD_SAME_AS_CURRENT: { status: 400, message: "New password must differ from the current password." },
  INVALID_CURRENT_PASSWORD: { status: 400, message: "Current password is incorrect." },
  TOO_MANY_REQUESTS: { status: 429, message: "Too many failed login attempts. Please wait 15 minutes and try again." },
  // Ticket & attachment errors
  INTERNAL_ERROR: { status: 500, message: "An unexpected server error occurred." },
  TICKET_NOT_FOUND: { status: 404, message: "Ticket not found." },
  VALIDATION_ERROR: { status: 400, message: "The request contains invalid data." },
  INVALID_STATUS_TRANSITION: { status: 400, message: "That status transition is not permitted." },
  INVALID_STATUS_FOR_RESOLUTION: { status: 400, message: "Resolution cannot be indicated for the current ticket status." },
  INELIGIBLE_OWNER: { status: 400, message: "The specified owner is inactive or does not have a permitted role." },
  // User management
  USER_NOT_FOUND: { status: 404, message: "User not found." },
  DUPLICATE_EMAIL: { status: 409, message: "An account with that email address already exists." },
  CANNOT_DEACTIVATE_SELF: { status: 400, message: "You cannot deactivate your own account." },
  CANNOT_DEACTIVATE_LAST_ADMIN: { status: 400, message: "Cannot deactivate or demote the only active Administrator." },
} as const;
export function sendError(res: Response, code: keyof typeof errors, fields: Record<string, string> = {}): void {
  const { status, message } = errors[code];
  res.status(status).json({ error: { code, message, ...(code === "VALIDATION_ERROR" ? { fields } : {}) } });
}
