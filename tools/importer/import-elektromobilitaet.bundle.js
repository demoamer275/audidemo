/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-elektromobilitaet.js
  var import_elektromobilitaet_exports = {};
  __export(import_elektromobilitaet_exports, {
    default: () => import_elektromobilitaet_default
  });

  // tools/importer/parsers/cards-teaser.js
  var CONTAINER_SEL = '[class*="EditorialTeaserContainer"]';
  var TEASER_SEL = '[class*="EditorialTeaser__StyledComponent"]';
  function isAttached(el, document) {
    if (typeof el.isConnected === "boolean") return el.isConnected;
    return document.documentElement.contains(el);
  }
  function hinted(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function buildImage(teaser, document) {
    const src = teaser.querySelector('[class*="EditorialTeaser__Media"] img, img[class*="StyledImage"]');
    if (!src || !src.getAttribute("src") || src.getAttribute("src").startsWith("data:")) return null;
    const img = document.createElement("img");
    img.setAttribute("src", src.getAttribute("src"));
    img.setAttribute("alt", src.getAttribute("alt") || "");
    return img;
  }
  var KEEP_INLINE = ["STRONG", "B", "EM", "I", "U", "SUB"];
  function appendInline(source, target, document) {
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const raw = node.textContent;
        if (/^\s*$/.test(raw) && /\n/.test(raw)) return;
        const text = raw.replace(/\s+/g, " ");
        if (text) target.appendChild(document.createTextNode(text));
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toUpperCase();
      if (["IMG", "SVG", "SCRIPT", "STYLE", "PICTURE"].includes(tag)) return;
      if (tag === "SUP") {
        const t = node.textContent.replace(/\s+/g, " ").trim();
        if (!t) return;
        const sup = document.createElement("sup");
        sup.textContent = /^[,;]$/.test(t) ? `${t} ` : t;
        target.appendChild(sup);
        return;
      }
      if (tag === "BR") {
        target.appendChild(document.createElement("br"));
        return;
      }
      if (tag === "A" && node.getAttribute("href") && !node.classList.contains("audi-j-footnote-reference")) {
        const a = document.createElement("a");
        a.setAttribute("href", node.getAttribute("href"));
        appendInline(node, a, document);
        target.appendChild(a);
        return;
      }
      if (KEEP_INLINE.includes(tag)) {
        const el = document.createElement(tag.toLowerCase());
        appendInline(node, el, document);
        target.appendChild(el);
        return;
      }
      appendInline(node, target, document);
    });
    return target;
  }
  function trimEdges(el) {
    const first = el.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, "");
    const last = el.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, "");
    return el;
  }
  function copyInline(source, target) {
    const document = target.ownerDocument;
    return trimEdges(appendInline(source, target, document));
  }
  function buildCard(teaser, document) {
    const textArea = teaser.querySelector('[class*="EditorialTeaser__TextArea"]') || teaser;
    const img = buildImage(teaser, document);
    const imageCell = img ? hinted(document, "image", [img]) : "";
    const textNodes = [];
    const heading = textArea.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading && cleanText(heading.textContent)) {
      const h = document.createElement(heading.tagName.toLowerCase());
      h.textContent = cleanText(heading.textContent);
      textNodes.push(hinted(document, "text_title", [h]));
    }
    const legal = textArea.querySelector('[class*="LegalInfoContainer"]');
    const bodyParas = [...textArea.querySelectorAll("p")].filter((p) => !(legal && legal.contains(p)) && cleanText(p.textContent));
    if (bodyParas.length) {
      const ps = bodyParas.map((p) => copyInline(p, document.createElement("p")));
      textNodes.push(hinted(document, "text_body", ps));
    }
    const cta = textArea.querySelector('[class*="ButtonContainer"] a[href]') || [...textArea.querySelectorAll("a[href]")].find((a) => !(legal && legal.contains(a)) && !(a.getAttribute("href") || "").startsWith("#"));
    if (cta) {
      const a = document.createElement("a");
      a.setAttribute("href", cta.getAttribute("href"));
      a.textContent = cleanText(cta.textContent);
      const p = document.createElement("p");
      p.appendChild(a);
      textNodes.push(hinted(document, "text_link", [p]));
    }
    const textCell = textNodes.length ? textNodes : "";
    let disclaimerCell = "";
    if (legal && cleanText(legal.textContent)) {
      const paras = [...legal.querySelectorAll("p")].filter((p) => cleanText(p.textContent));
      const out = (paras.length ? paras : [legal]).map((p) => copyInline(p, document.createElement("p")));
      disclaimerCell = hinted(document, "disclaimer", out);
    }
    return [imageCell, textCell, disclaimerCell];
  }
  function parse(element, { document }) {
    if (!isAttached(element, document)) return;
    const own = element.matches(CONTAINER_SEL) ? [element] : [...element.querySelectorAll(CONTAINER_SEL)];
    const all = [...document.querySelectorAll(CONTAINER_SEL)];
    const containers = all.filter((c) => own.includes(c) || own.length && own[0].compareDocumentPosition(c) & 4);
    const cells = [];
    containers.forEach((container) => {
      container.querySelectorAll(TEASER_SEL).forEach((teaser) => {
        const parentTeaser = teaser.parentElement && teaser.parentElement.closest(TEASER_SEL);
        if (parentTeaser && container.contains(parentTeaser)) return;
        cells.push(buildCard(teaser, document));
      });
    });
    containers.forEach((container) => {
      if (element.contains(container) || container.contains(element)) return;
      const wrapper = container.closest("feature-app") || container;
      if (wrapper.parentNode && !wrapper.contains(element)) wrapper.remove();
    });
    if (!cells.length) return;
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-teaser", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-media-text.js
  function cleanText2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function appendInline2(source, target, document) {
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const raw = node.textContent;
        if (/^\s*$/.test(raw) && /\n/.test(raw)) return;
        target.appendChild(document.createTextNode(raw.replace(/\s+/g, " ")));
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toUpperCase();
      if (["IMG", "SVG", "PICTURE", "SCRIPT", "STYLE"].includes(tag)) return;
      if (tag === "DIV" && node.parentElement && node.parentElement.tagName.toUpperCase() === "LI" && /^[›>•\-\s]*$/.test(node.textContent)) return;
      if (tag === "SUP") {
        const t = cleanText2(node.textContent);
        if (!t) return;
        const sup = document.createElement("sup");
        sup.textContent = /^[,;]$/.test(t) ? `${t} ` : t;
        target.appendChild(sup);
        return;
      }
      if (tag === "A" && node.getAttribute("href") && !node.classList.contains("audi-j-footnote-reference")) {
        const a = document.createElement("a");
        a.setAttribute("href", node.getAttribute("href"));
        appendInline2(node, a, document);
        target.appendChild(a);
        return;
      }
      if (["STRONG", "B", "EM", "I", "U", "SUB"].includes(tag)) {
        const el = document.createElement(tag.toLowerCase());
        appendInline2(node, el, document);
        target.appendChild(el);
        return;
      }
      if (tag === "BR") {
        target.appendChild(document.createElement("br"));
        return;
      }
      appendInline2(node, target, document);
    });
    return target;
  }
  function inline(source, tagName, document) {
    const el = appendInline2(source, document.createElement(tagName), document);
    const first = el.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, "");
    const last = el.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, "");
    return el;
  }
  function parse2(element, { document }) {
    const imageCell = [];
    const srcImg = element.querySelector('[class*="BasicTeaser__StyledMedia"] img, [class*="BasicTeaser__StyledImage"] img') || element.querySelector("img");
    if (srcImg && srcImg.getAttribute("src") && !srcImg.getAttribute("src").startsWith("data:")) {
      const img = document.createElement("img");
      img.setAttribute("src", srcImg.getAttribute("src"));
      img.setAttribute("alt", srcImg.getAttribute("alt") || "");
      imageCell.push(img);
    }
    const textArea = element.querySelector('[class*="BasicTeaser__StyledTextArea"]') || element;
    const textCell = [];
    const heading = textArea.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading && cleanText2(heading.textContent)) {
      const h = document.createElement(heading.tagName.toLowerCase());
      h.textContent = cleanText2(heading.textContent);
      textCell.push(h);
    }
    const buttonsArea = textArea.querySelector('.buttons, [class*="button-group"]');
    const richText = textArea.querySelector('[class*="RichText__StyledText"]');
    const bodyRoot = richText || textArea;
    bodyRoot.querySelectorAll("p, ul, ol").forEach((node) => {
      if (buttonsArea && buttonsArea.contains(node)) return;
      if (heading && heading.contains(node)) return;
      const parentBody = node.parentElement && node.parentElement.closest("p, ul, ol");
      if (parentBody && bodyRoot.contains(parentBody)) return;
      const tag = node.tagName.toLowerCase();
      if (tag === "p") {
        if (cleanText2(node.textContent)) textCell.push(inline(node, "p", document));
        return;
      }
      const list = document.createElement(tag);
      node.querySelectorAll(":scope > li").forEach((li) => {
        const item = inline(li, "li", document);
        if (cleanText2(item.textContent)) list.appendChild(item);
      });
      if (list.children.length) textCell.push(list);
    });
    const buttons = buttonsArea ? [...buttonsArea.querySelectorAll("a[href]")] : [...textArea.querySelectorAll("a.button[href]")];
    buttons.forEach((btn) => {
      const label = cleanText2(btn.textContent);
      if (!label) return;
      const a = document.createElement("a");
      a.setAttribute("href", btn.getAttribute("href"));
      a.textContent = label;
      const p = document.createElement("p");
      p.appendChild(a);
      textCell.push(p);
    });
    const cells = [[imageCell.length ? imageCell : "", textCell.length ? textCell : ""]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-media-text", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-image-overlay.js
  var TILE_SEL = '[class*="StyledContentTileContainer"]';
  var LINK_FALLBACK = {
    "reichweiten-simulator": "https://www.audi.de/de/elektromobilitaet/reichweite/",
    "ladezeit-simulator": "https://www.audi.de/de/elektromobilitaet/laden/",
    ladestationen: "https://www.audi.de/de/elektromobilitaet/ladestation-finden/"
  };
  function cleanText3(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function isAttached2(el, document) {
    if (typeof el.isConnected === "boolean") return el.isConnected;
    return document.documentElement.contains(el);
  }
  function hinted2(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function firstSrcsetUrl(srcset) {
    if (!srcset) return "";
    return srcset.split(",")[0].trim().split(/\s+/)[0] || "";
  }
  function findImage(tile) {
    const media = tile.querySelector('[class*="MediaContainer"]') || tile;
    const img = media.querySelector("img");
    let src = "";
    let alt = "";
    if (img) {
      alt = img.getAttribute("alt") || "";
      src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) {
        src = img.getAttribute("data-src") || firstSrcsetUrl(img.getAttribute("srcset") || img.getAttribute("data-srcset"));
      }
    }
    if (!src || src.startsWith("data:")) {
      const source = [...media.querySelectorAll("picture source")].map((s) => firstSrcsetUrl(s.getAttribute("srcset") || s.getAttribute("data-srcset"))).find((u) => u && !u.startsWith("data:"));
      if (source) src = source;
    }
    if (!src || src.startsWith("data:")) {
      const bgEl = [media, ...media.querySelectorAll('[style*="background"]')].find((el) => /url\(/.test(el.getAttribute("style") || ""));
      if (bgEl) {
        const m = (bgEl.getAttribute("style") || "").match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
        if (m) src = m[1];
      }
    }
    if (!src || src.startsWith("data:")) return null;
    return { src, alt };
  }
  function appendInline3(source, target, document) {
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const raw = node.textContent;
        if (/^\s*$/.test(raw) && /\n/.test(raw)) return;
        target.appendChild(document.createTextNode(raw.replace(/\s+/g, " ")));
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toUpperCase();
      if (["IMG", "SVG", "PICTURE", "SCRIPT", "STYLE"].includes(tag)) return;
      if (tag === "SUP") {
        const t = cleanText3(node.textContent);
        if (!t) return;
        const sup = document.createElement("sup");
        sup.textContent = /^[,;]$/.test(t) ? `${t} ` : t;
        target.appendChild(sup);
        return;
      }
      if (tag === "A" && node.getAttribute("href") && !node.classList.contains("audi-j-footnote-reference")) {
        const a = document.createElement("a");
        a.setAttribute("href", node.getAttribute("href"));
        appendInline3(node, a, document);
        target.appendChild(a);
        return;
      }
      if (["STRONG", "B", "EM", "I", "U", "SUB"].includes(tag)) {
        const el = document.createElement(tag.toLowerCase());
        appendInline3(node, el, document);
        target.appendChild(el);
        return;
      }
      appendInline3(node, target, document);
    });
    return target;
  }
  function inlineParagraph(source, document) {
    const p = appendInline3(source, document.createElement("p"), document);
    const first = p.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, "");
    const last = p.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, "");
    return p;
  }
  function resolveLink(tile, title) {
    const a = [...tile.querySelectorAll("a[href]")].find((el) => {
      const href = el.getAttribute("href") || "";
      return href && !href.startsWith("#") && !el.classList.contains("audi-j-footnote-reference") && !/^javascript:/i.test(href);
    });
    if (a) return a.getAttribute("href");
    const dataHref = tile.querySelector("[data-href], [data-link], [data-url]");
    if (dataHref) {
      return dataHref.getAttribute("data-href") || dataHref.getAttribute("data-link") || dataHref.getAttribute("data-url");
    }
    return LINK_FALLBACK[cleanText3(title).toLowerCase()] || "";
  }
  function buildCard2(tile, document) {
    const imgData = findImage(tile);
    let imageCell = "";
    if (imgData) {
      const img = document.createElement("img");
      img.setAttribute("src", imgData.src);
      img.setAttribute("alt", imgData.alt);
      imageCell = hinted2(document, "image", [img]);
    }
    const headingEl = tile.querySelector('[class*="StyledHeadline"], [class*="styles__Heading"] h1, [class*="styles__Heading"] h2, h1, h2, h3, h4');
    const title = headingEl ? cleanText3(headingEl.textContent) : "";
    const contentNodes = [];
    if (title) {
      const h3 = document.createElement("h3");
      h3.textContent = title;
      contentNodes.push(hinted2(document, "content_title", [h3]));
    }
    const href = resolveLink(tile, title);
    if (href) {
      const a = document.createElement("a");
      a.setAttribute("href", href);
      a.textContent = title || href;
      const p = document.createElement("p");
      p.appendChild(a);
      contentNodes.push(hinted2(document, "content_link", [p]));
    }
    const contentCell = contentNodes.length ? contentNodes : "";
    let disclaimerCell = "";
    const wltp = tile.querySelector('[class*="WLTPContainer"], .fg-wltp-content');
    if (wltp && cleanText3(wltp.textContent)) {
      const paras = [...wltp.querySelectorAll("p")].filter((p) => cleanText3(p.textContent));
      const out = (paras.length ? paras : [wltp]).map((p) => inlineParagraph(p, document));
      disclaimerCell = hinted2(document, "disclaimer", out);
    }
    return [imageCell, contentCell, disclaimerCell];
  }
  function parse3(element, { document }) {
    if (!isAttached2(element, document)) return;
    const tiles = [...element.querySelectorAll(TILE_SEL)].filter((tile) => {
      const parentTile = tile.parentElement && tile.parentElement.closest(TILE_SEL);
      return !(parentTile && element.contains(parentTile));
    });
    const cells = tiles.map((tile) => buildCard2(tile, document));
    if (!cells.length) return;
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-image-overlay", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/audi-cleanup.js
  var SOURCE_ORIGIN = "https://www.audi.de";
  var AUDI_HOSTS = ["www.audi.de", "audi.de"];
  var MIGRATED_PATHS = [
    "/de/elektromobilitaet/"
  ];
  var CONFIGURATOR_PATH_RE = /(konfigurator|configurator|configure)/i;
  var CONFIGURATOR_HOST_RE = /^(configurator|konfigurator)\./i;
  var TRACKING_HOST_RE = /(googlesyndication|doubleclick|facebook\.com\/tr|facebook\.net|connect\.facebook|google-analytics|googletagmanager|googleadservices|adservice\.google|bat\.bing|analytics\.|pixel\.|adnxs|krxd|everesttech|mathtag|demdex|omtrdc|linkedin\.com\/px|ads\.linkedin|t\.co\/i|analytics\.twitter|criteo|taboola|outbrain|hotjar|scorecardresearch)/i;
  var DAM_URN_RE = /^https?:\/\/emea-dam\.audi\.com\/adobe\/assets\/urn:/i;
  function setReport(document, payload, key, value) {
    if (document) {
      document.excatCleanupReport = __spreadProps(__spreadValues({}, document.excatCleanupReport || {}), { [key]: value });
    }
    if (payload) {
      payload[key] = value;
      if (payload.params && typeof payload.params === "object") {
        payload.params[key] = value;
      }
    }
  }
  function removeAll(root, selector) {
    let count = 0;
    root.querySelectorAll(selector).forEach((el) => {
      if (el.isConnected !== false && el.parentNode) {
        el.remove();
        count += 1;
      }
    });
    return count;
  }
  function removeFeatureApps(root, selector) {
    root.querySelectorAll(selector).forEach((el) => {
      const target = el.closest("feature-app") || el;
      if (target.parentNode) target.remove();
    });
  }
  function isConfiguratorUrl(url) {
    return CONFIGURATOR_HOST_RE.test(url.hostname) || CONFIGURATOR_PATH_RE.test(url.pathname);
  }
  function normalizePath(p) {
    return p.endsWith("/") ? p : `${p}/`;
  }
  function rewriteLinks(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!href || href.startsWith("#") || /^(mailto|tel|javascript|data):/i.test(href)) return;
      const isRootRelative = href.startsWith("/") && !href.startsWith("//");
      let url;
      try {
        url = new URL(href, SOURCE_ORIGIN);
      } catch (e) {
        return;
      }
      if (isConfiguratorUrl(url)) {
        if (isRootRelative) a.setAttribute("href", url.href);
        return;
      }
      const isAudi = isRootRelative || AUDI_HOSTS.includes(url.hostname.toLowerCase());
      if (!isAudi) return;
      const migrated = MIGRATED_PATHS.some((p) => normalizePath(url.pathname) === normalizePath(p));
      if (migrated) {
        a.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
      } else {
        a.setAttribute("href", `${SOURCE_ORIGIN}${url.pathname}${url.search}${url.hash}`);
      }
    });
  }
  function cleanDamUrl(src) {
    if (!src || !DAM_URN_RE.test(src)) return src;
    return src.split("?")[0].split("#")[0];
  }
  function normalizeImages(root) {
    root.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (TRACKING_HOST_RE.test(src) || img.getAttribute("width") === "1" && img.getAttribute("height") === "1") {
        img.remove();
        return;
      }
      if (DAM_URN_RE.test(src)) {
        img.setAttribute("src", cleanDamUrl(src));
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.removeAttribute("loading");
        if (!img.hasAttribute("alt")) img.setAttribute("alt", "");
      }
    });
    root.querySelectorAll("picture source").forEach((s) => {
      const srcset = s.getAttribute("srcset") || "";
      if (!srcset || DAM_URN_RE.test(srcset)) s.remove();
    });
  }
  function normalizeFootnoteReferences(root, document) {
    root.querySelectorAll("sup.audi-footnote-anchor__text").forEach((sup) => {
      const text = sup.textContent.trim();
      const clean = document.createElement("sup");
      clean.textContent = text;
      sup.replaceWith(clean);
    });
    root.querySelectorAll("a.audi-j-footnote-reference").forEach((a) => {
      a.replaceWith(document.createTextNode(a.textContent.trim()));
    });
  }
  function convertFootnoteList(root, document) {
    root.querySelectorAll(".audi-footnote-engine ul").forEach((ul) => {
      const ol = document.createElement("ol");
      let start = null;
      ul.querySelectorAll(":scope > li").forEach((li) => {
        const p = li.querySelector("p") || li;
        const spans = p.querySelectorAll(":scope > span");
        const item = document.createElement("li");
        if (spans.length >= 2) {
          const num = parseInt(spans[0].textContent.trim(), 10);
          if (start === null && !Number.isNaN(num)) start = num;
          for (let i = 1; i < spans.length; i += 1) {
            while (spans[i].firstChild) item.append(spans[i].firstChild);
          }
        } else {
          const expected = (start === null ? 1 : start) + ol.children.length;
          const walker = document.createTreeWalker(p, 4);
          let first = walker.nextNode();
          while (first && !first.textContent.trim()) first = walker.nextNode();
          const m = first && first.textContent.match(/^\s*(\d+)/);
          if (m && parseInt(m[1], 10) === expected) {
            if (start === null) start = expected;
            first.textContent = first.textContent.slice(m[0].length).replace(/^\s+/, "");
          }
          while (p.firstChild) item.append(p.firstChild);
        }
        if (item.textContent.trim()) ol.append(item);
      });
      if (start !== null && start !== 1) ol.setAttribute("start", String(start));
      ul.replaceWith(ol);
    });
  }
  function promoteH1(root, document) {
    if (root.querySelector("h1") || document.querySelector("h1")) return;
    let h2 = root.querySelector('feature-app[id="676fd0de-2275-40ef-8a91-60515ad4a12d-1"] h2');
    if (!h2) {
      h2 = [...root.querySelectorAll("h2")].find((h) => /Elektromobilität von Audi/i.test(h.textContent));
    }
    if (!h2) return;
    const h1 = document.createElement("h1");
    h1.textContent = h2.textContent.replace(/\s+/g, " ").trim();
    h2.replaceWith(h1);
  }
  function transform(hookName, element, payload) {
    const document = payload && payload.document || element.ownerDocument;
    if (hookName === "beforeTransform") {
      const livechatWidgetsRemoved = removeAll(element, '[class~="acquire-livechat-widget"]');
      setReport(document, payload, "livechatWidgetsRemoved", livechatWidgetsRemoved);
      WebImporter.DOMUtils.remove(element, [
        "#ensModalWrapper",
        "#ensModalBackdrop",
        ".ensPrivacyManager",
        '[id*="usercentrics"]',
        '[class*="usercentrics"]',
        '[id^="cookie"]',
        '[class*="cookie-banner"]',
        '[class*="consent-banner"]',
        ".AdSense"
      ]);
      removeFeatureApps(element, 'feature-app[id="b373ebe8-46bc-4942-b1b9-078ea99a36ba-1"]');
      removeFeatureApps(element, '[class*="AudiHeaderStyles__HeaderStyled"]');
      removeFeatureApps(element, '[class*="audi-footer__OneFooterStyled"]');
      removeFeatureApps(element, "#skip-to-content-link");
      removeFeatureApps(element, '[class*="popup-group__"]');
      removeFeatureApps(element, '[class*="Spacer__StyledSpacer"]');
      [...element.querySelectorAll("a")].filter((a) => /Spring zum Inhalt/i.test(a.textContent)).forEach((a) => a.remove());
      WebImporter.DOMUtils.remove(element, ["header", "footer", "nav"]);
      WebImporter.DOMUtils.remove(element, ["script", "style", "noscript", "iframe", "link", "dialog"]);
      normalizeFootnoteReferences(element, document);
      convertFootnoteList(element, document);
      normalizeImages(element);
      rewriteLinks(element);
    }
    if (hookName === "afterTransform") {
      normalizeImages(element);
      rewriteLinks(element);
      promoteH1(element, document);
      element.querySelectorAll("*").forEach((el) => {
        [...el.attributes].forEach((attr) => {
          if (/^(data-track|data-tracking|data-gtm|data-analytics|onclick|onload)/i.test(attr.name)) {
            el.removeAttribute(attr.name);
          }
        });
      });
      element.querySelectorAll("#impression-tracking-box").forEach((el) => el.removeAttribute("id"));
    }
  }

  // tools/importer/transformers/audi-sections.js
  var MARKER_ATTR = "data-excat-section-id";
  function findSectionElement(root, section) {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
    for (const sel of selectors) {
      if (!sel) continue;
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (e) {
      }
    }
    return null;
  }
  function isSectionBreak(node) {
    return node && node.nodeType === 1 && node.tagName === "HR";
  }
  function transform2(hookName, element, payload) {
    const document = payload && payload.document || element.ownerDocument;
    const template = payload && payload.template;
    const sections = template && template.sections || [];
    if (sections.length < 2) return;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const el = findSectionElement(element, section);
        if (!el || !el.parentNode) continue;
        if (i === 0 && !section.style) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(MARKER_ATTR, section.id);
        el.parentNode.insertBefore(hr, el);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const marker = element.querySelector(`hr[${MARKER_ATTR}="${section.id}"]`);
        if (section.style) {
          const meta = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          const el = findSectionElement(element, section);
          if (el && el.parentNode) {
            el.after(meta);
          } else if (marker && marker.parentNode) {
            let node = marker.nextSibling;
            while (node && !isSectionBreak(node)) node = node.nextSibling;
            if (node) node.before(meta);
            else marker.parentNode.append(meta);
          }
        }
        if (marker) {
          if (i === 0) marker.remove();
          else marker.removeAttribute(MARKER_ATTR);
        }
      }
    }
  }

  // tools/importer/import-elektromobilitaet.js
  var PAGE_TEMPLATE = {
    "name": "elektromobilitaet",
    "urls": [
      "https://www.audi.de/de/elektromobilitaet/"
    ],
    "representativeUrl": "https://www.audi.de/de/elektromobilitaet/",
    "description": "Audi E-Mobility landing page: centered intro heading, editorial teaser grid, media-text consultation teaser, tool tiles and footnotes",
    "urlPattern": "/de/*",
    "blocks": [
      {
        "name": "cards-teaser",
        "instances": [
          "feature-app:has([class*='EditorialTeaserContainer'])",
          "[class*='EditorialTeaserContainer']"
        ]
      },
      {
        "name": "columns-media-text",
        "instances": [
          "[class*='BasicTeaser__StyledContainer']"
        ]
      },
      {
        "name": "cards-image-overlay",
        "instances": [
          "feature-app:has([class*='StyledContentTileContainer'])",
          "[class*='styles__Container']:has(> [class*='StyledContentTileContainer'])"
        ]
      }
    ],
    "sections": [
      {
        "id": "section-1",
        "name": "Intro / Seiten\xFCberschrift",
        "selector": [
          'feature-app[id="676fd0de-2275-40ef-8a91-60515ad4a12d-1"]',
          "feature-app:has([class*='style__Wrapper'] h2)"
        ],
        "style": "centered",
        "blocks": [],
        "defaultContent": [
          'feature-app[id="676fd0de-2275-40ef-8a91-60515ad4a12d-1"] h2'
        ]
      },
      {
        "id": "section-2",
        "name": "Themen-Teaser",
        "selector": [
          "feature-app:has([class*='EditorialTeaserContainer'])"
        ],
        "style": null,
        "blocks": [
          "cards-teaser"
        ],
        "defaultContent": []
      },
      {
        "id": "section-3",
        "name": "Elektromobilit\xE4tsberatung",
        "selector": [
          "feature-app:has([class*='BasicTeaser__StyledContainer'])"
        ],
        "style": null,
        "blocks": [
          "columns-media-text"
        ],
        "defaultContent": []
      },
      {
        "id": "section-4",
        "name": "Testen Sie es selbst",
        "selector": [
          'feature-app[id="e7de798a-209d-4527-bcca-b57f07f02436-1"]',
          "feature-app:has([class*='StyledContentTileContainer'])"
        ],
        "style": null,
        "blocks": [
          "cards-image-overlay"
        ],
        "defaultContent": [
          'feature-app[id="e7de798a-209d-4527-bcca-b57f07f02436-1"] h2'
        ]
      },
      {
        "id": "section-5",
        "name": "Fu\xDFnoten",
        "selector": [
          ".audi-footnote-engine",
          "feature-app:has(.audi-footnote-engine)"
        ],
        "style": "dark",
        "blocks": [],
        "defaultContent": [
          ".audi-footnote-engine ul"
        ]
      }
    ]
  };
  var parsers = {
    "cards-teaser": parse,
    "columns-media-text": parse2,
    "cards-image-overlay": parse3
  };
  var transformers = [transform, transform2];
  var CONFIGURATOR_PATH_RE2 = /(konfigurator|configurator|configure)/i;
  var CONFIGURATOR_HOST_RE2 = /^(configurator|konfigurator)\./i;
  function isConfiguratorUrl2(href) {
    try {
      const u = new URL(href);
      return CONFIGURATOR_PATH_RE2.test(u.pathname) || CONFIGURATOR_HOST_RE2.test(u.hostname);
    } catch (e) {
      return false;
    }
  }
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          pageBlocks.push({ name: blockDef.name, selector, element });
        });
      });
    });
    return pageBlocks;
  }
  var import_elektromobilitaet_default = {
    transform: (payload) => {
      var _a, _b;
      const { document, url, params } = payload;
      const main = document.body;
      if (isConfiguratorUrl2(params.originalURL)) {
        throw new Error(`Skipped: configurator (${params.originalURL})`);
      }
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      const cleanupReport = document.excatCleanupReport || {};
      const livechatWidgetsRemoved = (_b = (_a = cleanupReport.livechatWidgetsRemoved) != null ? _a : params && params.livechatWidgetsRemoved) != null ? _b : 0;
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: [...new Set(pageBlocks.map((b) => b.name))],
          livechatWidgetsRemoved
        }
      }];
    }
  };
  return __toCommonJS(import_elektromobilitaet_exports);
})();
