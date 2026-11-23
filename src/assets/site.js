const by = id => document.getElementById(id);
const editParam = new URLSearchParams(location.hash.slice(1)).get('editar');
if (editParam) {
  sessionStorage.setItem('editorKey', editParam);
  history.replaceState(null, '', location.pathname);
}
const editKey = sessionStorage.getItem('editorKey');
const headers = { Authorization: 'Bearer ' + editKey };
const socials = [...document.querySelectorAll('[data-profile]')];
const defaults = Object.fromEntries(socials.map(a => [a.dataset.profile, a.href]));
let profile = {};
let selectedSlot = '';
by('admin').hidden = !editKey;
const carouselStates = new WeakMap();
function carouselSlides(carousel) {
  return [...carousel.querySelectorAll('.evidence-slides > figure')].filter(figure =>
    !figure.dataset.slot || figure.querySelector('img') || editKey
  );
}
function refreshCarousel(carousel) {
  const state = carouselStates.get(carousel);
  const slides = carouselSlides(carousel);
  state.activeIndex = Math.min(state.activeIndex, Math.max(slides.length - 1, 0));
  for (const figure of carousel.querySelectorAll('.evidence-slides > figure')) figure.hidden = true;
  slides.forEach((figure, index) => {
    figure.hidden = index !== state.activeIndex;
    figure.setAttribute('aria-label', `${index + 1} de ${slides.length}`);
  });
  carousel.querySelector('[data-carousel-status]').textContent = `${state.activeIndex + 1} de ${slides.length}`;
  carousel.querySelector('[data-carousel-prev]').disabled = slides.length < 2;
  carousel.querySelector('[data-carousel-next]').disabled = slides.length < 2;
  const dots = carousel.querySelector('.carousel-dots');
  dots.replaceChildren(...slides.map((figure, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Exibir captura ${index + 1}: ${figure.querySelector('figcaption')?.textContent || 'imagem enviada'}`);
    dot.setAttribute('aria-pressed', String(index === state.activeIndex));
    dot.addEventListener('click', () => {
      state.activeIndex = index;
      refreshCarousel(carousel);
    });
    return dot;
  }));
}
function initCarousels() {
  for (const carousel of document.querySelectorAll('[data-carousel]')) {
    carouselStates.set(carousel, {activeIndex: 0});
    carousel.addEventListener('click', event => {
      const direction = event.target.closest('[data-carousel-prev]') ? -1 :
        event.target.closest('[data-carousel-next]') ? 1 : 0;
      if (!direction) return;
      const slides = carouselSlides(carousel);
      const state = carouselStates.get(carousel);
      state.activeIndex = (state.activeIndex + direction + slides.length) % slides.length;
      refreshCarousel(carousel);
    });
    refreshCarousel(carousel);
  }
}
function info(title, msg) {
  by('msgTitle').textContent = title;
  by('msgText').textContent = msg;
  by('message').showModal();
}
async function read(path) {
  const res = await fetch(path);
  if (!res.ok) throw Error('Falha ao carregar os dados.');
  return res.json();
}
async function loadProfile() {
  profile = await read('/perfil');
  for (const a of socials) a.href = profile[a.dataset.profile] || defaults[a.dataset.profile];

}
function edit() {
  const f = by('form');
  for (const name of Object.keys(defaults)) f.elements[name].value = profile[name] || defaults[name];

  by('status').textContent = '';
  by('editor').showModal();
}
by('admin').onclick = edit;
by('cv').onclick = () => profile.pdf ? location.assign('/curriculo.pdf') : editKey ? edit() : info('Currículo', 'O currículo ainda não foi disponibilizado.');
function showUpload(slot, caption, isPhoto) {
  selectedSlot = slot;
  const form = by('mediaForm');
  form.reset();
  form.elements.caption.value = caption;
  form.elements.file.accept = 'image/jpeg,image/png,image/webp';
  by('mediaTitle').textContent = slot === 'foto-perfil' ? 'Foto de perfil' : isPhoto ? 'Foto do laboratório' : 'Imagem do certificado';
  by('mediaStatus').textContent = 'JPG, PNG ou WebP · até 8 MB';
  by('upload').showModal();
}
function renderGallery(data) {
  const caption = data['foto-perfil'];
  const portrait = by('portrait-image');
  portrait.hidden = !caption;
  by('portrait-initials').hidden = !!caption;
  if (caption) {
    portrait.alt = caption;
    portrait.src = '/foto-perfil?v=' + Date.now();
  }
  const editPortrait = by('portrait-edit');
  editPortrait.hidden = !editKey;
  editPortrait.textContent = caption ? 'Trocar foto' : 'Adicionar foto';
  editPortrait.onclick = () => showUpload('foto-perfil', caption || 'Jonhnes Monteiro', true);
  for (const figure of document.querySelectorAll('.project-media')) {
    const {slot, title} = figure.dataset;
    const label = data[slot];
    const button = figure.querySelector('button');
    if (label) {
      const image = document.createElement('img');
      image.src = '/' + slot;
      image.alt = label;
      const link = document.createElement('a');
      link.href = image.src;
      link.setAttribute('aria-label', 'Abrir imagem em tamanho original: ' + label);
      link.append(image);
      figure.querySelector('.shot').replaceChildren(link);
      figure.querySelector('figcaption').textContent = label;
    }
    if (figure.closest('[data-carousel]')) figure.hidden = !label && !editKey;
    button.hidden = !editKey;
    button.textContent = figure.querySelector('img') ? 'Trocar imagem' : 'Adicionar imagem';
    button.onclick = () => showUpload(slot, label || title, true);
  }
  for (const carousel of document.querySelectorAll('[data-carousel]')) refreshCarousel(carousel);
  const samples = by('samples');
  samples.replaceChildren();
  for (let i = 1; i <= 3; i++) {
    const slot = 'cert-img-' + i;
    const title = data[slot];
    if (!title && !editKey) continue;
    const figure = document.createElement('figure');
    figure.className = 'extra-cert';
    if (title) {
      const img = document.createElement('img');
      img.alt = title;
      img.src = '/' + slot;
      figure.append(img);
    }
    if (editKey) {
      const button = document.createElement('button');
      button.textContent = title ? 'Substituir certificado' : 'Adicionar certificado';
      button.onclick = () => showUpload(slot, title || 'Certificado ' + i, false);
      figure.append(button);
    }
    samples.append(figure);
  }
}
async function saveForm(form, endpoint, status, onSaved) {
  const button = form.querySelector('.save');
  button.disabled = true;
  try {
    const body = new FormData(form);
    if (endpoint === '/perfil') body.set('certs', (profile.certs || []).join('\n'));
    const res = await fetch(endpoint, {method:'POST', headers, body});
    if (!res.ok) throw Error(await res.text());
    await onSaved();
    form.closest('dialog').close();
    info('Portfólio atualizado', 'As alterações foram salvas.');
  } catch (error) {
    by(status).textContent = error.message;
  } finally {
    button.disabled = false;
  }
}
by('form').onsubmit = event => {
  event.preventDefault();
  const f = event.target;
  if (f.elements.pdf.files[0]?.size > 5242880) {by('status').textContent = 'Escolha um PDF de até 5 MB.'; return;}
  saveForm(f, '/perfil', 'status', async () => {await loadProfile(); f.elements.pdf.value = '';});
};
by('mediaForm').onsubmit = event => {
  event.preventDefault();
  const f = event.target;
  if (f.elements.file.files[0]?.size > 8388608) {by('mediaStatus').textContent = 'Escolha um arquivo de até 8 MB.'; return;}
  saveForm(f, '/' + selectedSlot, 'mediaStatus', async () => renderGallery(await read('/galeria')));
};
initCarousels();
renderGallery({});
Promise.all([loadProfile(), read('/galeria').then(renderGallery)]).catch(() => info('Dados indisponíveis', 'Atualize a página para tentar novamente.'));

const viewer = by('image-viewer');
const viewerImage = by('viewer-image');
by('projetos').addEventListener('click', event => {
  const trigger = event.target.closest('.shot a');
  if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const preview = trigger.querySelector('img');
  if (!preview) return;
  event.preventDefault();
  viewerImage.src = trigger.href;
  viewerImage.alt = preview.alt;
  by('viewer-caption').textContent = trigger.closest('figure').querySelector('figcaption').textContent;
  viewer.showModal();
});
viewer.addEventListener('click', event => {
  if (event.target !== viewer) return;
  const rect = viewer.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX >= rect.right ||
      event.clientY < rect.top || event.clientY >= rect.bottom) viewer.close();
});
