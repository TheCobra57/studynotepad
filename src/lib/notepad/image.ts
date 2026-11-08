/**
 * Image helpers for the block editor.
 *
 * Uploaded / pasted images are downscaled and re-encoded as the smaller of
 * PNG or JPEG before they are stored — notes live in IndexedDB (hundreds of
 * MB, via localforage), and compact images keep the pad snappy to load.
 */

/** longest edge of a stored image, in px */
const MAX_DIM = 1600
/** warn (toast) when a single processed image exceeds this size */
export const LARGE_IMAGE_BYTES = 700_000

export interface ProcessedImage {
  dataUrl: string
  bytes: number
  width: number
  height: number
}

/** Draw a Blob/File onto a fresh canvas, downscaled to MAX_DIM. */
async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const source: CanvasImageSource = await loadSource(blob)
  const sw = sourceWidth(source)
  const sh = sourceHeight(source)
  const scale = Math.min(1, MAX_DIM / Math.max(sw, sh)) || 1
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(source, 0, 0, w, h)
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close()
  return canvas
}

async function loadSource(blob: Blob): Promise<CanvasImageSource> {
  // fast path — most browsers
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob)
    } catch {
      // fall through to <img> (e.g. SVG files in some browsers)
    }
  }
  // fallback path — always works, also for SVG
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = url
    })
    if (!img.naturalWidth) {
      // SVG with no intrinsic size — draw at the browser default 300×150
      img.width = 300
      img.height = 150
    }
    return img
  } finally {
    // the browser has decoded the image; the URL can be released
    window.setTimeout(() => URL.revokeObjectURL(url), 5_000)
  }
}

function sourceWidth(s: CanvasImageSource): number {
  if (s instanceof HTMLImageElement) return s.naturalWidth || s.width || 300
  if (s instanceof ImageBitmap) return s.width
  if (s instanceof HTMLCanvasElement) return s.width
  return 300
}

function sourceHeight(s: CanvasImageSource): number {
  if (s instanceof HTMLImageElement) return s.naturalHeight || s.height || 150
  if (s instanceof ImageBitmap) return s.height
  if (s instanceof HTMLCanvasElement) return s.height
  return 150
}

/**
 * Encode a canvas as the smaller of PNG (keeps sharp line-art small) or
 * JPEG q0.85 (keeps photos small). JPEG gets a white background so
 * transparency never turns black.
 */
export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  const png = canvas.toDataURL('image/png')
  let jpeg = ''
  try {
    const flat = document.createElement('canvas')
    flat.width = canvas.width
    flat.height = canvas.height
    const ctx = flat.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, flat.width, flat.height)
      ctx.drawImage(canvas, 0, 0)
      jpeg = flat.toDataURL('image/jpeg', 0.85)
    }
  } catch {
    jpeg = ''
  }
  if (jpeg && jpeg.length < png.length) return jpeg
  return png
}

/** Downscale + compress an uploaded/pasted image file into a data URL. */
export async function processImageFile(blob: Blob): Promise<ProcessedImage> {
  const canvas = await blobToCanvas(blob)
  const dataUrl = canvasToDataUrl(canvas)
  return {
    dataUrl,
    bytes: Math.round((dataUrl.length * 3) / 4),
    width: canvas.width,
    height: canvas.height,
  }
}

/** Compress a raw data URL (e.g. the whiteboard canvas export). */
export async function processDataUrl(dataUrl: string): Promise<ProcessedImage> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return processImageFile(blob)
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
