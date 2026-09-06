import { randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import { basename, dirname, resolve, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const moduleRoot = fileURLToPath(new URL("../", import.meta.url));
const serverRoot = basename(moduleRoot.replace(/[\\/]$/, "")) === "dist" ? dirname(moduleRoot.replace(/[\\/]$/, "")) : moduleRoot;
function root() {
  const configured = process.env.UPLOAD_DIR;
  const directory = resolve(configured || resolve(serverRoot, "uploads/attachments"));
  if (process.env.NODE_ENV === "test") {
    const testPath = relative(tmpdir(), directory);
    if (!configured || !testPath.split(sep)[0].startsWith("toktickit-attachments-test-")) throw new Error("Isolated test upload storage is required.");
  }
  return directory;
}
function location(name: string) {
  if (!/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf)$/.test(name)) throw new Error("Invalid internal filename.");
  const directory = root(); const path = resolve(directory, name);
  if (relative(directory, path) !== name) throw new Error("Invalid storage location.");
  return path;
}
export const attachmentStorage = {
  async write(bytes: Buffer, extension: string) {
    const name = randomUUID() + extension; const path = location(name); await mkdir(root(), { recursive: true });
    const file = await open(path, "wx");
    try { await file.writeFile(bytes); await file.close(); return { storedFileName: name, filePath: path }; }
    catch (error) { try { await file.close(); } catch { /* Still attempt cleanup if close failed. */ } await this.discard(name); throw error; }
  },
  async discard(name: string) {
    try { await unlink(location(name)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Unable to clean up an uncommitted attachment file."); }
  },
  async open(name: string) { return open(location(name), "r"); },
};
