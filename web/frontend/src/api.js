// Thin fetch layer. All URLs are relative — Vite proxies /api to FastAPI in
// dev, and the built app is served same-origin in prod.

async function getJSON(url) {
  const res = await fetch(url)
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail || detail
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`)
  }
  return res.json()
}

export const getSessions = () => getJSON('/api/sessions')
export const getMemory = (n) => getJSON(`/api/memory/${n}`)
export const getDiff = (from, to) => getJSON(`/api/diff?from=${from}&to=${to}`)
