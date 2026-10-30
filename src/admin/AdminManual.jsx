import { useState } from 'react'

const SECCIONES = [
  ['inicio', 'fa-compass', 'Primeros pasos', [
    'El panel tiene un menú lateral a la izquierda con todos los módulos. Haz clic en uno para abrirlo; el título arriba te dice dónde estás.',
    'El botón de tres rayas (☰) arriba a la izquierda contrae o expande el menú. En el celular lo abre y lo cierra.',
    '"Ver sitio" abre la página pública y "Cerrar sesión" sale del panel.',
    'Los cambios que haces (crear, editar, borrar) se guardan en la base de datos y se ven de inmediato en el sitio público.',
  ]],
  ['barra', 'fa-sliders', 'Barra superior', [
    'Botón Manual (el de libro): abre esta guía.',
    'Pincel de color: elige cualquier color y todo el panel se adapta; las letras se ajustan solas para que siempre se lean.',
    'Botón de tema: cambia entre Negro, Verde, Blanco y Mi color (si ya elegiste uno). Se recuerda tu última elección.',
    'Punto verde/rojo: indica si hay conexión a internet. Si está rojo, no se podrá guardar nada.',
  ]],
  ['dashboard', 'fa-pie-chart', 'Dashboard', [
    'Resumen general: tarjetas con totales (usuarios, avistamientos, rutas, etc.), gráficas y las últimas actividades.',
    'Si hay avistamientos pendientes aparece un botón de alerta que te lleva directo a revisarlos.',
    'Las tarjetas son clicables y te llevan al módulo correspondiente.',
  ]],
  ['usuarios', 'fa-user-circle-o', 'Usuarios', [
    'Lista de todas las personas registradas con su nombre, correo y rol.',
    'Puedes editar datos, cambiar el rol o desactivar/eliminar una cuenta.',
    'En la columna de avistamientos, el ícono del ojo abre una ventana con todos los avistamientos de ese usuario, que puedes filtrar por estado.',
  ]],
  ['rutas', 'fa-road', 'Rutas y paradas', [
    'Aquí se crean las rutas del mapa. Haz clic en el mapa para marcar puntos y dibujar el recorrido.',
    'Cada ruta tiene nombre, color, distancia y paradas. Las paradas son los puntos de interés con su descripción.',
    'Selecciona una ruta de la lista de la izquierda para editarla; usa los botones de lápiz y papelera para modificar o borrar.',
    'Una ruta o parada borrada desaparece del sitio público; revisa antes de confirmar.',
  ]],
  ['hides', 'fa-eye', 'Hide', [
    'Un Hide es una caseta de observación. Pulsa "Nuevo" para agregar uno.',
    'Llena nombre y descripción, y marca su ubicación en el mapa (clic en el punto exacto).',
    'Puedes asociarlo a una ruta o parada. Con el interruptor "activo" decides si se muestra al público.',
    'Los hides activos aparecen en la sección Hide del sitio y en el mapa.',
  ]],
  ['nidos', 'fa-leaf', 'Nidos', [
    'Funciona igual que Hide, pero para registrar nidos: nombre, descripción, ubicación en el mapa, ruta/parada y estado activo.',
    'Los nidos activos se muestran en la sección Nidos para turistas y usuarios, con su propio diseño.',
    'Requiere haber creado la tabla "nidos" en Supabase con el archivo nidos_videos.sql.',
  ]],
  ['videos', 'fa-youtube-play', 'Videos', [
    'Pega la dirección (URL) de un video de YouTube y verás una vista previa al instante.',
    'Agrega un título y texto opcional, y guarda. El video aparece en la página de Inicio.',
    'En la lista puedes ocultar un video sin borrarlo, cambiar su orden o eliminarlo.',
    'Acepta enlaces normales (youtube.com/watch?v=...), cortos (youtu.be/...) y de Shorts.',
    'Requiere la tabla "videos" creada con nidos_videos.sql.',
  ]],
  ['avistamientos', 'fa-binoculars', 'Avistamientos', [
    'Aquí llegan los avistamientos que reportan los usuarios. Los nuevos quedan "pendientes".',
    'Revísalos y pulsa Aprobar o Rechazar; puedes escribir un comentario para el usuario. Solo los aprobados cuentan oficialmente.',
    'Filtros: por estado (Todos, Pendiente, Aprobado, Rechazado), por hide (botones superiores) y por usuario (lista desplegable).',
    'Buscador: escribe nombre, especie, hide, ruta, fecha o número y la lista se filtra al momento.',
    'Puedes eliminar un avistamiento; esa acción no se puede deshacer.',
    'El número rojo junto a "Avistamientos" en el menú indica cuántos esperan revisión.',
  ]],
  ['ave', 'fa-info-circle', 'Ficha técnica', [
    'Contiene la información de la Guacamaya (Paraba Frente Roja): descripción, hábitat, alimentación, conservación, etc.',
    'Edita los textos y guarda; el cambio se refleja en la ficha del sitio público.',
  ]],
  ['reportes', 'fa-file-text-o', 'Reportes', [
    'Genera informes con los datos del sistema.',
    'Elige el período o filtros y exporta a PDF (botón rojo) o Excel (botón verde).',
  ]],
  ['recomendaciones', 'fa-lightbulb-o', 'Recomendaciones', [
    'Consejos para los visitantes (qué llevar, cómo comportarse, mejores horarios).',
    'Agrega, edita u oculta recomendaciones; las activas se muestran en el sitio.',
  ]],
  ['roles', 'fa-users', 'Roles y permisos', [
    'Define qué puede hacer cada tipo de usuario (administrador, usuario, invitado).',
    'Cambia los permisos con cuidado: un permiso mal quitado puede dejar a alguien sin acceso.',
  ]],
  ['consejos', 'fa-star-o', 'Buenas prácticas', [
    'Revisa los avistamientos pendientes con frecuencia para que los usuarios reciban respuesta.',
    'Prefiere ocultar (desactivar) antes que borrar: así puedes recuperar el contenido.',
    'Usa fotos y textos claros; al guardar, espera el mensaje de confirmación antes de salir.',
    'Si algo no carga, revisa el indicador de conexión y recarga la página.',
  ]],
]

export default function AdminManual({ cerrar, iniciarTour }) {
  const [sel, setSel] = useState('inicio')
  const [q, setQ] = useState('')
  const t = q.trim().toLowerCase()
  const lista = SECCIONES.filter(([, , titulo, items]) => !t || titulo.toLowerCase().includes(t) || items.some(i => i.toLowerCase().includes(t)))
  const actual = lista.find(s => s[0] === sel) || lista[0]

  return (
    <div className="man-fondo" onClick={cerrar}>
      <div className="man-caja" onClick={e => e.stopPropagation()} role="dialog" aria-label="Manual del administrador">
        <div className="man-cab">
          <h3><i className="fa fa-book"></i> Manual del administrador</h3>
          {iniciarTour && <button className="man-tour" onClick={iniciarTour}><i className="fa fa-map-signs"></i> Recorrido guiado</button>}
          <button onClick={cerrar} aria-label="Cerrar"><i className="fa fa-times"></i></button>
        </div>
        <div className="man-cuerpo">
          <nav className="man-menu">
            <input className="campo" type="search" placeholder="Buscar en el manual…" value={q} onChange={e => setQ(e.target.value)} />
            {lista.map(([k, ic, titulo]) => (
              <button key={k} className={actual && actual[0] === k ? 'activa' : ''} onClick={() => setSel(k)}>
                <i className={'fa ' + ic}></i> {titulo}
              </button>
            ))}
            {!lista.length && <small>Sin resultados.</small>}
          </nav>
          <article className="man-texto">
            {actual ? (
              <>
                <h4><i className={'fa ' + actual[1]}></i> {actual[2]}</h4>
                <ul>{actual[3].map((p, i) => <li key={i}>{p}</li>)}</ul>
              </>
            ) : <p>No se encontró nada con esa búsqueda.</p>}
          </article>
        </div>
      </div>
    </div>
  )
}
