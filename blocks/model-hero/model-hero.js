const GRAPHQL_ENDPOINT = 'https://publish-p182083-e1919654.adobeaemcloud.com/graphql/execute.json/audidemo/getcarmodel';

function getCfPath(cell) {
  if (!cell) return '';
  const a = cell.querySelector('a');
  const raw = (a ? a.getAttribute('href') : cell.textContent).trim();
  try {
    // strip host and any .html extension added by link rewriting
    return new URL(raw, window.location.origin).pathname.replace(/\.html$/, '');
  } catch {
    return raw;
  }
}

async function fetchCarModel(path) {
  const url = `${GRAPHQL_ENDPOINT};path=${path};variation=master`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`GraphQL request failed: ${resp.status}`);
  const json = await resp.json();
  return json?.data?.carModelByPath?.item;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const [refRow, linkRow, linkTextRow] = [...block.children];
  const path = getCfPath(refRow?.firstElementChild);

  // link may be authored as an <a> (with text) or as separate link + text fields
  const cta = linkRow?.querySelector('a');
  if (cta) {
    const text = linkTextRow?.textContent.trim();
    if (text) cta.textContent = text;
  }

  block.textContent = '';
  if (!path) return;

  let item;
  try {
    item = await fetchCarModel(path);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('model-hero:', e);
  }
  if (!item) return;

  if (item.title) {
    const h1 = document.createElement('h1');
    h1.textContent = item.title;
    block.append(h1);
  }

  // eslint-disable-next-line no-underscore-dangle
  const imgUrl = item.image?._publishUrl;
  if (imgUrl) {
    const p = document.createElement('p');
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = item.title || '';
    img.loading = 'eager';
    img.fetchPriority = 'high';
    picture.append(img);
    p.append(picture);
    block.append(p);
  }

  if (item.description?.html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = item.description.html;
    if (wrapper.querySelector('p')) {
      block.append(...wrapper.children);
    } else {
      const p = document.createElement('p');
      p.innerHTML = item.description.html;
      block.append(p);
    }
  }

  if (cta) {
    const p = document.createElement('p');
    p.className = 'button-container';
    cta.className = 'button';
    p.append(cta);
    block.append(p);
  }
}
