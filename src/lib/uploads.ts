import path from "path";

export const ALLOWED_UPLOAD_EXTENSIONS = new Set([".ipynb", ".py"]);

const DEFAULT_UPLOAD_ROOT = path.join(process.cwd(), "uploads", "evaluation-scores");

function getUploadRoot() {
  const override = process.env.UPLOAD_ROOT?.trim();
  // Allow absolute or relative paths; relative resolves from process.cwd()
  if (override && override.length > 0) {
    return path.resolve(override);
  }
  return DEFAULT_UPLOAD_ROOT;
}

const UPLOAD_ROOT = getUploadRoot();

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
