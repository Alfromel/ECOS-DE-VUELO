// Extrae el ID de un enlace de YouTube (watch, youtu.be, shorts, embed, live) o de un ID suelto
export const idYoutube = texto => {
  const t = (texto || '').trim()
  if (/^[\w-]{11}$/.test(t)) return t
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : 'https://' + t)
    const host = u.hostname.replace(/^(www|m)\./, '')
    let id = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/) || [])[1]
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch { return null }
}

export const urlEmbed = url => {
  const id = idYoutube(url)
  return id ? `https://www.youtube.com/embed/${id}` : ''
}

export const miniatura = url => {
  const id = idYoutube(url)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : ''
}

// Título del video vía oEmbed de YouTube (si falla se usa el que escriba el admin)
export const tituloYoutube = async url => {
  try {
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + idYoutube(url)))
    return r.ok ? (await r.json()).title : null
  } catch { return null }
}
