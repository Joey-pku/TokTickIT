export const REQUESTER_STORAGE_KEY = "toktickit_selected_requester_id";
export function readRequesterId(): string | null {
  return localStorage.getItem(REQUESTER_STORAGE_KEY);
}
export function writeRequesterId(id: number | null): void {
  if (id === null) localStorage.removeItem(REQUESTER_STORAGE_KEY);
  else localStorage.setItem(REQUESTER_STORAGE_KEY, String(id));
}
