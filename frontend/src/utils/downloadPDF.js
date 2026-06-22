/**
 * KALA IS ART — PDF Download Utility
 *
 * Flow:
 *  1. Call estimatesAPI.downloadPDF(id) via Axios (returns base64 JSON)
 *  2. Decode base64 to binary Uint8Array
 *  3. Validate %PDF magic bytes client-side
 *  4. Create Blob with explicit 'application/pdf' MIME type
 *  5. Trigger <a download> click
 *  6. Revoke object URL after 10 s
 */
import { estimatesAPI } from '../services/api'

export async function downloadPDFNative(estimateId, filename, toast) {
  const toastId = toast?.loading('Generating PDF…')

  try {
    // ── STEP 1: Fetch via Axios (auto-handles token refresh) ──
    const response = await estimatesAPI.downloadPDF(estimateId)

    // Backend now returns JSON with { base64: '...', filename: '...' }
    const base64Str = response.data?.base64
    if (!base64Str) {
      throw new Error('Invalid response from server (missing PDF data).')
    }

    // ── STEP 2: Decode Base64 to ArrayBuffer ──────────────────
    const binaryString = atob(base64Str)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // ── STEP 3: Validate PDF magic bytes ─────────────────────
    if (bytes.length < 200) {
      throw new Error('Generated PDF is too small or corrupted.')
    }
    
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
    if (magic !== '%PDF') {
      console.error('[PDF] Unexpected magic bytes:', magic)
      throw new Error('The server returned an invalid PDF file. Please try again.')
    }

    // ── STEP 4: Create Blob with explicit MIME type ───────────
    const blob      = new Blob([bytes], { type: 'application/pdf' })
    const objectUrl = URL.createObjectURL(blob)

    // ── STEP 5: Trigger download ──────────────────────────────
    // Prefer the filename provided by backend, fallback to the argument
    const safeFilename = response.data?.filename || filename;
    
    const anchor         = document.createElement('a')
    anchor.style.display = 'none'
    anchor.href          = objectUrl
    anchor.download      = safeFilename
    document.body.appendChild(anchor)
    anchor.click()

    // ── STEP 6: Cleanup after 10 s ────────────────────────────
    setTimeout(() => {
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    }, 10_000)

    toast?.success('PDF downloaded successfully!', { id: toastId })
    return { success: true, size: bytes.length }

  } catch (err) {
    // Extract a human-readable message from Axios errors too
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      'PDF download failed. Please try again.'

    console.error('[PDF Download Error]', err)
    toast?.error(msg, { id: toastId })
    throw err
  }
}
