const page = document.getElementById('page');
const artwork = document.getElementById('artwork');
const linkLayer = document.getElementById('links');
const status = document.getElementById('status');
const number = document.getElementById('page-number');
const count = senDocument.pages.length;
const previous = document.getElementById('prev');
const next = document.getElementById('next');
let route;
let displayed = -1;
let pendingScript;

number.max = count;
document.getElementById('page-count').textContent = `/ ${count}`;

function readRoute() {
  const fragment = location.hash.slice(1);
  if (fragment.startsWith('bkm-')) {
    try {
      const target = senDocument.targets[decodeURIComponent(fragment.slice(4))];
      if (Array.isArray(target)) return target;
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
    }
  }
  const requested = /^page-(\d+)$/.exec(fragment);
  return [requested ? Math.max(0, Math.min(count - 1, Number(requested[1]) - 1)) : 0, 0];
}

function scrollToRoute() {
  const [index, y] = route;
  const viewScale = page.getBoundingClientRect().height / senDocument.pages[index][1];
  const toolbarHeight = document.querySelector('header').offsetHeight;
  const pageTop = page.getBoundingClientRect().top + window.scrollY;
  window.scrollTo(0, y === 0 ? 0 : Math.max(0, pageTop + y * viewScale - toolbarHeight - 12));
}

function navigate() {
  route = readRoute();
  const [index] = route;
  number.value = index + 1;
  previous.disabled = index === 0;
  next.disabled = index === count - 1;
  if (displayed === index) {
    pendingScript?.remove();
    scrollToRoute();
    return;
  }

  const [width, height] = senDocument.pages[index];
  page.style.setProperty('--page-width', `${width}px`);
  page.style.setProperty('--page-ratio', `${width} / ${height}`);
  page.setAttribute('aria-busy', 'true');
  displayed = -1;
  artwork.replaceChildren();
  linkLayer.replaceChildren();
  status.textContent = '문서를 여는 중입니다.';
  pendingScript?.remove();
  const script = document.createElement('script');
  script.src = `pages/${index + 1}.js`;
  script.onerror = () => {
    if (pendingScript !== script) return;
    page.setAttribute('aria-busy', 'false');
    status.textContent = '페이지 파일을 열 수 없습니다. 압축을 푼 폴더에서 열어 주세요.';
  };
  pendingScript = script;
  document.head.append(script);
}

function senRenderPage(index, svg, links) {
  if (route[0] !== index) return;
  const [width, height] = senDocument.pages[index];
  artwork.innerHTML = svg;
  const overlay = document.createDocumentFragment();
  for (const [target, rawLabel, boxes] of links) {
    if (!Array.isArray(senDocument.targets[target])) continue;
    const label = rawLabel.replace(/●/g, '').trim() || target;
    boxes.forEach(([x, y, w, h], boxIndex) => {
      const anchor = document.createElement('a');
      anchor.href = `#bkm-${encodeURIComponent(target)}`;
      anchor.className = 'hotspot';
      anchor.title = label;
      anchor.setAttribute('aria-label', label);
      if (boxIndex > 0) anchor.tabIndex = -1;
      anchor.style.left = `${100 * x / width}%`;
      anchor.style.top = `${100 * y / height}%`;
      anchor.style.width = `${100 * w / width}%`;
      anchor.style.height = `${100 * h / height}%`;
      overlay.append(anchor);
    });
  }
  linkLayer.replaceChildren(overlay);
  displayed = index;
  status.textContent = '';
  page.setAttribute('aria-busy', 'false');
  scrollToRoute();
}

function goToPage(index) {
  const hash = `#page-${index + 1}`;
  if (location.hash === hash) navigate();
  else location.hash = hash;
}

window.addEventListener('hashchange', navigate);
previous.onclick = () => goToPage(route[0] - 1);
next.onclick = () => goToPage(route[0] + 1);
document.getElementById('page-form').onsubmit = (event) => {
  event.preventDefault();
  goToPage(Number(number.value) - 1);
};
navigate();
