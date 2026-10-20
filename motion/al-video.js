/* ═══ Ambilor.Lab · Motion System: componente de video (2026-10-20) ═══
   Para escenas cinematográficas renderizadas aparte (Blender, Kdenlive): ver motion/LEEME.md.
   Uso, en el HTML:
     <figure class="al-video" data-al-video data-webm="motion/media/escena.webm" data-mp4="motion/media/escena.mp4"
             style="--al-video-forma:16/10">
       <img class="al-video__poster" src="motion/media/escena.webp" alt="Qué muestra la escena" width="1280" height="800" loading="lazy">
       <figcaption>Texto que explica la escena (se lee aunque el video no cargue)</figcaption>
     </figure>
   Comportamiento:
   · Solo el póster se descarga al entrar a la página (loading="lazy"); el video, recién al tocar «Reproducir».
   · El video va sin sonido, en línea (también en iPhone) y con los controles del navegador.
   · Se pausa solo cuando sale de la pantalla.
   · Con «reducir movimiento» no se reproduce solo y nunca se repite en bucle.
   · Si el navegador no puede reproducirlo, o el archivo no existe, queda el póster con un aviso.
   · Se inicia una sola vez por figura (data-al-video-listo), así no duplica listeners. */
(function(){
  'use strict';
  var reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vigia = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){
    es.forEach(function(e){ var v = e.target.querySelector('video'); if (v && !e.isIntersecting && !v.paused) v.pause(); });
  }, { threshold: 0.2 }) : null;

  function aviso(fig, texto){
    var p = fig.querySelector('.al-video__aviso');
    if (!p) { p = document.createElement('p'); p.className = 'al-video__aviso'; p.setAttribute('role', 'status'); fig.appendChild(p); }
    p.textContent = texto;
  }
  function reproducir(fig, btn){
    var webm = fig.getAttribute('data-webm'), mp4 = fig.getAttribute('data-mp4'), poster = fig.querySelector('.al-video__poster');
    var v = document.createElement('video'), prueba = document.createElement('video');
    var fuente = webm && prueba.canPlayType('video/webm; codecs="vp9"') ? webm : (mp4 && prueba.canPlayType('video/mp4') ? mp4 : null);
    if (!fuente) { aviso(fig, 'Este navegador no puede reproducir el video. La imagen muestra la escena.'); return; }
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.controls = true; v.preload = 'auto';
    if (poster) v.poster = poster.currentSrc || poster.src;
    if (!reducido && fig.hasAttribute('data-bucle')) v.loop = true;
    v.setAttribute('aria-label', (poster && poster.alt) || 'Video de la demostración');
    v.addEventListener('error', function(){ v.remove(); fig.removeAttribute('data-estado'); btn.disabled = false; aviso(fig, 'No se pudo cargar el video. La imagen muestra la escena.'); }, { once: true });
    v.src = fuente; fig.appendChild(v);
    var pr = v.play(); if (pr && pr.then) pr.then(function(){ fig.setAttribute('data-estado', 'video'); v.focus(); }, function(){ fig.setAttribute('data-estado', 'video'); });
    else fig.setAttribute('data-estado', 'video');
    btn.disabled = true;
  }
  function iniciar(fig){
    if (fig.hasAttribute('data-al-video-listo')) return; fig.setAttribute('data-al-video-listo', '');
    if (!fig.getAttribute('data-webm') && !fig.getAttribute('data-mp4')) return;   // sin archivo: queda el póster (el componente espera su video)
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'al-video__play';
    btn.textContent = 'Reproducir video'; btn.setAttribute('aria-label', 'Reproducir el video: ' + ((fig.querySelector('.al-video__poster') || {}).alt || 'demostración'));
    btn.addEventListener('click', function(){ reproducir(fig, btn); });
    fig.appendChild(btn);
    if (vigia) vigia.observe(fig);
  }
  function todos(raiz){ (raiz || document).querySelectorAll('[data-al-video]').forEach(iniciar); }
  window.alVideo = { iniciar: todos };   // para contenido que se agrega después: alVideo.iniciar(contenedor)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ todos(); }); else todos();
})();
