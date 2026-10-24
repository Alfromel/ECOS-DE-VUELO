import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const ROJO = [185, 28, 28]

export const descargar = (blob, nombre) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

// PDF con encabezado rojo (banda del título y cabecera de tabla)
export const crearPdf = ({ titulo, subtitulo, columnas, filas }) => {
  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...ROJO)
  doc.rect(0, 0, w, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text(titulo, 14, 12)
  doc.setFontSize(9)
  doc.text(subtitulo || 'Ecos de Vuelo Rojo · ' + new Date().toLocaleDateString(), 14, 20)
  autoTable(doc, {
    startY: 32, head: [columnas], body: filas,
    headStyles: { fillColor: ROJO, textColor: 255 }, styles: { fontSize: 9 }, alternateRowStyles: { fillColor: [253, 242, 242] },
  })
  return doc
}

export const exportarPdf = (cfg, nombre) => crearPdf(cfg).save(nombre + '.pdf')

export const exportarExcel = ({ columnas, filas, hoja = 'Datos' }, nombre) => {
  const ws = XLSX.utils.aoa_to_sheet([columnas, ...filas])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31))
  XLSX.writeFile(wb, nombre + '.xlsx')
}

// Ficha técnica del ave en filas campo/valor
export const filasFicha = ave => {
  const f = [
    ['Nombre común', ave.nombre_comun], ['Nombre científico', ave.nombre_cientifico], ['Familia', ave.familia],
    ['Estado de conservación', ave.estado_conservacion], ['Descripción', ave.descripcion], ['Hábitat', ave.habitat],
    ['Alimentación', ave.alimentacion], ['Distribución', ave.distribucion],
    ...(ave.estadisticas || []).map(e => [e.etiqueta, e.valor]),
    ...(ave.datos || []).map(d => [d.k, d.v]),
    ...(ave.tarjetas || []).map(t => [t.titulo, t.texto]),
    ...(ave.poblacion || []).map(p => ['Población · ' + p.etiqueta, p.valor + '%']),
    ...(ave.ciclo || []).map(c => ['Ciclo · ' + c.periodo, c.texto]),
  ]
  return f.filter(r => r[1]).map(r => [r[0], String(r[1])])
}

// Mapa capturado + leyenda, con encabezado rojo. Devuelve un Blob PDF.
export const pdfMapa = (canvas, rutas, hides, paradas) => {
  const doc = new jsPDF({ orientation: 'landscape' })
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight()
  doc.setFillColor(...ROJO)
  doc.rect(0, 0, w, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.text('Mapa de rutas · Ecos de Vuelo Rojo', 10, 13)
  const anchoLey = 70
  const maxW = w - anchoLey - 20, maxH = h - 32
  const esc = Math.min(maxW / canvas.width, maxH / canvas.height)
  doc.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 10, 26, canvas.width * esc, canvas.height * esc)
  let y = 30
  const x = w - anchoLey - 4
  doc.setTextColor(0)
  doc.setFontSize(11)
  doc.text('Leyenda', x, y)
  doc.setFontSize(9)
  rutas.forEach(r => {
    y += 8
    doc.setFillColor(r.color)
    doc.rect(x, y - 3.5, 5, 5, 'F')
    doc.text(`${r.nombre} (${r.n} paradas, ${r.km.toFixed(2)} km)`, x + 8, y, { maxWidth: anchoLey - 10 })
  })
  y += 8
  if (paradas) { doc.text('● Parada (número = orden)', x, y); y += 6 }
  if (hides) doc.text('● Hide', x, y)
  return doc.output('blob')
}

export const exportarFicha = (ave, formato) => {
  const cfg = { titulo: 'Ficha técnica · ' + ave.nombre_comun, columnas: ['Campo', 'Detalle'], filas: filasFicha(ave), hoja: 'Ficha técnica' }
  if (formato === 'pdf') exportarPdf(cfg, 'ficha-' + ave.nombre_comun)
  else exportarExcel(cfg, 'ficha-' + ave.nombre_comun)
}
