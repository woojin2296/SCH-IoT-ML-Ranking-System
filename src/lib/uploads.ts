import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "evaluation-scores");
export const ALLOWED_UPLOAD_EXTENSIONS = new Set([".ipynb", ".py"]);

export const resolveWithinUploadRoot = (relativePath: string) => {
  const base = path.resolve(UPLOAD_ROOT);
  const resolved = path.resolve(base, relativePath);
  if (!resolved.startsWith(base)) {
    throw new Error("Invalid file path outside upload directory");
  }
  return resolved;
};

export const resolveStoredFilePath = (storedPath: string | null) => {
  if (!storedPath) return null;
  try {
    const base = path.resolve(UPLOAD_ROOT);
    const candidate = path.isAbsolute(storedPath)
      ? path.resolve(storedPath)
      : path.resolve(base, storedPath);

    if (!candidate.startsWith(base)) {
      return null;
    }

    return candidate;
  } catch (error) {
    console.error("Failed to resolve stored file path", storedPath, error);
    return null;
  }
};
