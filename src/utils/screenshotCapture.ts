import domtoimage from 'dom-to-image'

export type RasterFormat = 'png' | 'jpeg' | 'webp'

const CROP_PAD = { top: 24, right: 10, bottom: 10, left: 10 }
const BG_THRESHOLD = 32

type StylePatch = { el: HTMLElement | SVGElement; prop: string; prev: string }
type AttrPatch = { el: Element; name: string; prev: string | null }
type CropRect = { x: number; y: number; w: number; h: number }

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function isNearBg(r: number, g: number, b: number, bg: { r: number; g: number; b: number }, thr: number): boolean {
  return Math.abs(r - bg.r) <= thr && Math.abs(g - bg.g) <= thr && Math.abs(b - bg.b) <= thr
}

/**
 * dom-to-image не переносит viewport-transform → граф в углу растра.
 * Ищем bbox по пикселям, отличным от фона.
 */
function findContentCropInImage(
  img: HTMLImageElement,
  bgHex: string | null,
  pad: typeof CROP_PAD,
  cssWidth: number,
): CropRect {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { x: 0, y: 0, w, h }

  ctx.drawImage(img, 0, 0)
  const { data } = ctx.getImageData(0, 0, w, h)
  const bg = bgHex ? parseHex(bgHex) : null

  let x1 = w
  let y1 = h
  let x2 = -1
  let y2 = -1
  const step = 2

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      const isContent = bg ? !isNearBg(data[i], data[i + 1], data[i + 2], bg, BG_THRESHOLD) : data[i + 3] > 10
      if (isContent) {
        x1 = Math.min(x1, x)
        y1 = Math.min(y1, y)
        x2 = Math.max(x2, x)
        y2 = Math.max(y2, y)
      }
    }
  }

  if (x2 < 0) return { x: 0, y: 0, w, h }

  const sx = w / cssWidth
  const pl = Math.max(2, Math.round(pad.left * sx))
  const pr = Math.max(2, Math.round(pad.right * sx))
  const pt = Math.max(2, Math.round(pad.top * sx))
  const pb = Math.max(2, Math.round(pad.bottom * sx))

  const x = Math.max(0, x1 - pl)
  const y = Math.max(0, y1 - pt)
  const x2p = Math.min(w, x2 + pr)
  const y2p = Math.min(h, y2 + pb)
  return { x, y, w: Math.max(1, x2p - x), h: Math.max(1, y2p - y) }
}

function patchFlowForExport(rf: HTMLElement): () => void {
  const stylePatches: StylePatch[] = []
  const attrPatches: AttrPatch[] = []

  rf.querySelectorAll('.react-flow__edge[data-id]').forEach((g) => {
    const path = g.querySelector('path.react-flow__edge-path')
    if (!(path instanceof SVGPathElement)) return

    const stop = g.querySelector('linearGradient stop:last-child')
    const color = stop?.getAttribute('stop-color') ?? '#7c8db5'

    attrPatches.push({ el: path, name: 'stroke', prev: path.getAttribute('stroke') })
    stylePatches.push({ el: path, prop: 'stroke', prev: path.style.stroke })
    path.setAttribute('stroke', color)
    path.style.stroke = color
  })

  rf.querySelectorAll('[data-screenshot-decor]').forEach((el) => {
    const html = el as HTMLElement
    stylePatches.push({ el: html, prop: 'display', prev: html.style.display })
    html.style.display = 'none'
  })

  return () => {
    for (const { el, prop, prev } of stylePatches) {
      const html = el as HTMLElement
      if (prev) html.style.setProperty(prop, prev)
      else html.style.removeProperty(prop)
    }
    for (const { el, name, prev } of attrPatches) {
      if (prev == null) el.removeAttribute(name)
      else el.setAttribute(name, prev)
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function cropImage(img: HTMLImageElement, crop: CropRect, bg: string | null): string {
  const out = document.createElement('canvas')
  out.width = crop.w
  out.height = crop.h
  const ctx = out.getContext('2d')
  if (!ctx) return ''

  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, out.width, out.height)
  }
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
  return out.toDataURL('image/png')
}

async function rasterToFormat(pngDataUrl: string, format: RasterFormat, jpegQuality: number): Promise<string> {
  if (format === 'png') return pngDataUrl

  const img = await loadImage(pngDataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return pngDataUrl
  ctx.drawImage(img, 0, 0)

  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/webp'
  return canvas.toDataURL(mime, format === 'jpeg' ? jpegQuality : undefined)
}

function exportScale(): number {
  return Math.min(4, Math.max(3, window.devicePixelRatio * 2))
}

export async function captureFlowRaster(
  container: HTMLElement,
  format: RasterFormat,
  bg: string,
  jpegQuality: number,
  transparent = false,
): Promise<string> {
  const rf = container.querySelector('.react-flow') as HTMLElement | null
  const target = transparent && rf ? rf : container
  const restore = rf ? patchFlowForExport(rf) : () => {}

  try {
    const scale = exportScale()
    const opts: Parameters<typeof domtoimage.toPng>[1] = {
      width: target.clientWidth * scale,
      height: target.clientHeight * scale,
      filter: (node: globalThis.Node) => !(node instanceof HTMLElement && node.hasAttribute('data-screenshot-decor')),
    }
    if (!transparent) opts.bgcolor = bg

    const full = await domtoimage.toPng(target, opts)
    const img = await loadImage(full)
    const cropBg = transparent ? null : bg
    const crop = findContentCropInImage(img, cropBg, CROP_PAD, target.clientWidth)
    const cropped = cropImage(img, crop, cropBg)
    return rasterToFormat(cropped, transparent ? 'png' : format, jpegQuality)
  } finally {
    restore()
  }
}

export async function waitForFlowPaint(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  await new Promise<void>((r) => setTimeout(r, 80))
}
