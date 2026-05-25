/**
 * File upload utility.
 *
 * Uploads files to the platform's storage service (Cloudflare R2).
 * Uses auto-provisioned environment variables:
 *   - STORAGE_UPLOAD_URL: Platform upload endpoint
 *   - STORAGE_TOKEN: Project-scoped bearer token
 *   - STORAGE_CDN_URL: CDN base URL for accessing uploaded files
 */

export async function uploadFile(
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<{ url: string; key: string; contentType: string; size: number }> {
  const uploadUrl = process.env.STORAGE_UPLOAD_URL;
  const token = process.env.STORAGE_TOKEN;

  if (!uploadUrl || !token) {
    throw new Error(
      "Storage not configured. STORAGE_UPLOAD_URL and STORAGE_TOKEN must be set.",
    );
  }

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(file)], { type: contentType }),
    filename,
  );

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  return res.json();
}
