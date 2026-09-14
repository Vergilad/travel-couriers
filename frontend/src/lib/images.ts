/**
 * Client-side image compaction. Every photo that leaves the browser goes
 * through here first: avatars (small, aggressive) and verification
 * documents (larger, legible: a human must read fine print off them).
 * The backend caps size as the backstop; this keeps uploads fast and the
 * volume small. The DB never holds bytes, only URL strings.
 */
export function compressImage(
  file: File,
  maxPx = 800,
  quality = 0.82,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas unavailable")); return }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Compression failed"))
        },
        "image/jpeg",
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Failed to load image"))
    }
    img.src = objectUrl
  })
}

/** Avatars: tiny and aggressive. Faces stay recognizable at 512px. */
export function compressAvatar(file: File): Promise<Blob> {
  return compressImage(file, 512, 0.8)
}

/**
 * Verification documents: a human reads fine print off these, so they keep
 * 1600px and higher quality. Still ~10x smaller than a raw phone photo.
 */
export function compressDocument(file: File): Promise<Blob> {
  return compressImage(file, 1600, 0.85)
}
