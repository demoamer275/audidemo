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

  // tools/importer/import-neuwagen-model.js
  var import_neuwagen_model_exports = {};
  __export(import_neuwagen_model_exports, {
    default: () => import_neuwagen_model_default
  });

  // tools/importer/parsers/hero-video.js
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function hinted(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function cleanMediaUrl(url) {
    return (url || "").trim().split("#")[0].split("?")[0];
  }
  function readStageData(element) {
    const app = element.closest("feature-app[data-content]") || element.querySelector("feature-app[data-content]");
    if (!app) return null;
    try {
      return JSON.parse(app.getAttribute("data-content"));
    } catch (e) {
      return null;
    }
  }
  function appendInline(source, target, document) {
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const raw = node.textContent;
        if (/^\s*$/.test(raw) && /\n/.test(raw)) return;
        target.appendChild(document.createTextNode(raw.replace(/\s+/g, " ")));
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toUpperCase();
      if (["IMG", "SVG", "PICTURE", "SCRIPT", "STYLE", "VIDEO"].includes(tag)) return;
      if (tag === "SUP") {
        const t = cleanText(node.textContent);
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
      if (["STRONG", "B", "EM", "I", "U", "SUB"].includes(tag)) {
        const el = document.createElement(tag.toLowerCase());
        appendInline(node, el, document);
        target.appendChild(el);
        return;
      }
      appendInline(node, target, document);
    });
    return target;
  }
  function inline(source, tagName, document) {
    const el = appendInline(source, document.createElement(tagName), document);
    const first = el.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, "");
    const last = el.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, "");
    return el;
  }
  function parse(element, { document }) {
    const data = readStageData(element);
    const fields = data && data.fields || {};
    const assetFields = fields.asset && fields.asset.fields || {};
    let videoCell = "";
    const source = element.querySelector("video source[src], video[src]");
    let videoUrl = source ? cleanMediaUrl(source.getAttribute("src")) : "";
    if (!videoUrl && assetFields.assetLandscape && /\.mp4$/i.test(cleanMediaUrl(assetFields.assetLandscape.path))) {
      videoUrl = cleanMediaUrl(assetFields.assetLandscape.path);
    }
    if (videoUrl) {
      const a = document.createElement("a");
      a.setAttribute("href", videoUrl);
      a.textContent = videoUrl;
      videoCell = hinted(document, "video", [a]);
    }
    let imageCell = "";
    const domImg = [...element.querySelectorAll("img[src]")].find((img) => !img.getAttribute("src").startsWith("data:"));
    const poster = assetFields.assetPortraitPoster;
    const posterSrc = domImg ? domImg.getAttribute("src") : poster && poster.path;
    if (posterSrc) {
      const img = document.createElement("img");
      img.setAttribute("src", cleanMediaUrl(posterSrc));
      img.setAttribute("alt", domImg ? domImg.getAttribute("alt") || "" : assetFields.assetPortraitAltText || assetFields.assetAlt || "");
      imageCell = hinted(document, "image", [img]);
    }
    const textNodes = [];
    const heading = element.querySelector("h1, h2");
    if (heading && cleanText(heading.textContent)) {
      const h = document.createElement(heading.tagName.toLowerCase());
      h.textContent = cleanText(heading.textContent);
      textNodes.push(h);
    }
    const headWrap = element.querySelector('[class*="StyledHeadlineSubLineWrapper"]') || heading && heading.parentElement;
    if (headWrap) {
      headWrap.querySelectorAll("p").forEach((p) => {
        if (cleanText(p.textContent)) textNodes.push(inline(p, "p", document));
      });
    }
    const buttonSet = element.querySelector('[class*="StageButtons__ButtonsContainer"]');
    const seen = /* @__PURE__ */ new Set();
    (buttonSet ? [...buttonSet.querySelectorAll("a[href]")] : []).forEach((btn) => {
      const label = cleanText(btn.textContent);
      const href = btn.getAttribute("href");
      if (!label || seen.has(`${href}|${label}`)) return;
      seen.add(`${href}|${label}`);
      const a = document.createElement("a");
      a.setAttribute("href", href);
      a.textContent = label;
      const p = document.createElement("p");
      p.appendChild(a);
      textNodes.push(p);
    });
    const textCell2 = textNodes.length ? hinted(document, "text", textNodes) : "";
    let disclaimerCell = "";
    const legal = element.querySelector('[class*="StageLegal"]');
    const legalParas = legal ? [...legal.querySelectorAll("p")].filter((p) => cleanText(p.textContent)) : [];
    if (legalParas.length) {
      disclaimerCell = hinted(document, "disclaimer", legalParas.map((p) => inline(p, "p", document)));
    } else if (Array.isArray(fields.disclaimers) && fields.disclaimers.length) {
      disclaimerCell = hinted(document, "disclaimer", fields.disclaimers.map((t) => {
        const p = document.createElement("p");
        p.textContent = cleanText(t);
        return p;
      }));
    }
    const cells = [[videoCell], [imageCell], [textCell2], [disclaimerCell]];
    const position = String(fields.appearanceContentPosition || "");
    const name = /^top/i.test(position) ? "hero-video (top)" : "hero-video";
    const block = WebImporter.Blocks.createBlock(document, { name, cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-stats.js
  function cleanText2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function hinted2(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
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
      if (["IMG", "SVG", "PICTURE", "SCRIPT", "STYLE", "VIDEO"].includes(tag)) return;
      if (tag === "SUP") {
        const t = cleanText2(node.textContent);
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
      appendInline2(node, target, document);
    });
    return target;
  }
  function inline2(source, tagName, document) {
    const el = appendInline2(source, document.createElement(tagName), document);
    const first = el.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, "");
    const last = el.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, "");
    return el;
  }
  function textCell(document, field, el) {
    const text = el ? cleanText2(el.textContent) : "";
    return text ? hinted2(document, field, [document.createTextNode(text)]) : "";
  }
  function richCell(document, field, el) {
    if (!el || !cleanText2(el.textContent)) return "";
    return hinted2(document, field, [inline2(el, "p", document)]);
  }
  function parse2(element, { document }) {
    const tiles = [...element.querySelectorAll('[class*="NumbersMode-style__ComponentContainer"]')];
    const cells = [];
    tiles.forEach((tile) => {
      const eyebrow = tile.querySelector('[class*="EditorialNumbers__StyledTitle"]');
      const value = tile.querySelector('[class*="EditorialNumbers__StyledValue-"]');
      const unit = tile.querySelector('[class*="EditorialNumbers__StyledUnit"]');
      const caption = tile.querySelector('[class*="EditorialNumbers__StyledDescription"]');
      const row = [
        textCell(document, "eyebrow", eyebrow),
        textCell(document, "value", value),
        richCell(document, "unit", unit),
        richCell(document, "caption", caption)
      ];
      if (row.some((c) => c !== "")) cells.push(row);
    });
    const legal = element.querySelector('[class*="EditorialColumns-style__LegalInfoContainer"]');
    const legalParas = legal ? [...legal.querySelectorAll("p")].filter((p) => cleanText2(p.textContent)) : [];
    const trailing = legalParas.map((p) => inline2(p, "p", document));
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-stats", cells });
    trailing.reverse().forEach((p) => element.after(p));
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-cards.js
  var PLACEHOLDER_RE = /\/PH-[^/]*\.(jpe?g|png|webp)$/i;
  function cleanText3(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function cleanMediaUrl2(url) {
    return (url || "").trim().split("#")[0].split("?")[0];
  }
  function isPlaceholder(src, alt) {
    const url = cleanMediaUrl2(src);
    return !url || url.startsWith("data:") || PLACEHOLDER_RE.test(url) || (alt || "").trim() === "#";
  }
  function hinted3(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
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
      if (["IMG", "SVG", "PICTURE", "SCRIPT", "STYLE", "VIDEO"].includes(tag)) return;
      if (tag === "SUP") {
        const t = cleanText3(node.textContent);
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
  function inline3(source, tagName, document) {
    const el = appendInline3(source, document.createElement(tagName), document);
    const first = el.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, "");
    const last = el.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, "");
    return el;
  }
  function readSlideData(element) {
    const app = element.closest("feature-app[data-content]");
    if (!app) return [];
    try {
      const data = JSON.parse(app.getAttribute("data-content"));
      return (data.fields && data.fields.slides || []).map((s) => s.fields || {});
    } catch (e) {
      return [];
    }
  }
  function videoUrlOf(data) {
    if (!data) return "";
    const keys = ["slideVideoLandscapeAsset", "slideVideoPortraitAsset", "slideVideoAsset"];
    for (const key of keys) {
      const asset = data[key];
      const url = cleanMediaUrl2(asset && (asset.path || asset));
      if (typeof url === "string" && /\.(mp4|webm|mov|m4v)$/i.test(url)) return url;
    }
    return "";
  }
  function parse3(element, { document }) {
    const slideData = readSlideData(element);
    const slides = [...element.querySelectorAll("li.splide__slide")].filter((li) => !li.classList.contains("splide__slide--clone"));
    const cells = [];
    slides.forEach((li, index) => {
      const titleEl2 = li.querySelector(".faCarousel__slideTitle");
      const title = titleEl2 ? cleanText3(titleEl2.textContent) : "";
      const data = slideData.find((d) => cleanText3(d.slideTitle) === title) || slideData[index];
      let imageCell = "";
      const img = [...li.querySelectorAll("img[src]")].find((i) => !isPlaceholder(i.getAttribute("src"), i.getAttribute("alt")));
      if (img) {
        const out = document.createElement("img");
        out.setAttribute("src", cleanMediaUrl2(img.getAttribute("src")));
        out.setAttribute("alt", img.getAttribute("alt") || "");
        imageCell = hinted3(document, "image", [out]);
      }
      let videoCell = "";
      const domVideo = li.querySelector("video source[src], video[src]");
      const videoUrl = domVideo && cleanMediaUrl2(domVideo.getAttribute("src")) || videoUrlOf(data);
      if (videoUrl) {
        const a = document.createElement("a");
        a.setAttribute("href", videoUrl);
        a.textContent = videoUrl;
        videoCell = hinted3(document, "video", [a]);
      }
      const content = [];
      if (title) {
        const h3 = document.createElement("h3");
        h3.textContent = title;
        content.push(hinted3(document, "content_title", [h3]));
      }
      const desc = li.querySelector(".faCarousel__slideDescription");
      const paras = desc ? [...desc.querySelectorAll("p")].filter((p) => cleanText3(p.textContent)) : [];
      const textNodes = paras.length ? paras.map((p) => inline3(p, "p", document)) : desc && cleanText3(desc.textContent) ? [inline3(desc, "p", document)] : [];
      const cta = li.querySelector('a[data-testid$="-item-cta"]');
      if (cta && cleanText3(cta.textContent) && cta.getAttribute("href")) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.setAttribute("href", cta.getAttribute("href"));
        a.textContent = cleanText3(cta.textContent);
        p.appendChild(a);
        textNodes.push(p);
      }
      const wltp = li.querySelector('[data-testid$="-item-wltp"]');
      if (wltp && cleanText3(wltp.textContent)) {
        const line = inline3(wltp, "p", document);
        line.innerHTML = line.innerHTML.replace(/;(?!\s|$)/g, "; ");
        textNodes.push(line);
      }
      if (textNodes.length) content.push(hinted3(document, "content_text", textNodes));
      const row = [imageCell, videoCell, content.length ? content : ""];
      if (row.some((c) => c !== "")) cells.push(row);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-cards", cells });
    const app = element.closest("feature-app[id]");
    const tagged = app && document.querySelector(`feature-app[data-heading-for="${app.id.slice(0, 8)}"]`);
    const titleEl = [...element.querySelectorAll("h2")].find((h) => !h.closest("li"));
    if (titleEl && !tagged && cleanText3(titleEl.textContent)) {
      const h2 = document.createElement("h2");
      h2.textContent = cleanText3(titleEl.textContent);
      element.replaceWith(h2, block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/parsers/columns-gallery.js
  function cleanText4(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function cleanMediaUrl3(url) {
    return (url || "").trim().split("#")[0].split("?")[0];
  }
  function appendInline4(source, target, document) {
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const raw = node.textContent;
        if (/^\s*$/.test(raw) && /\n/.test(raw)) return;
        target.appendChild(document.createTextNode(raw.replace(/\s+/g, " ")));
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toUpperCase();
      if (["IMG", "SVG", "PICTURE", "SCRIPT", "STYLE", "VIDEO"].includes(tag)) return;
      if (tag === "SUP") {
        const t = cleanText4(node.textContent);
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
        appendInline4(node, a, document);
        target.appendChild(a);
        return;
      }
      if (["STRONG", "B", "EM", "I", "U", "SUB"].includes(tag)) {
        const el = document.createElement(tag.toLowerCase());
        appendInline4(node, el, document);
        target.appendChild(el);
        return;
      }
      appendInline4(node, target, document);
    });
    return target;
  }
  function inline4(source, tagName, document) {
    const el = appendInline4(source, document.createElement(tagName), document);
    const first = el.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, "");
    const last = el.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, "");
    return el;
  }
  function captionParas(container, document) {
    if (!container) return [];
    return [...container.querySelectorAll("p")].filter((p) => cleanText4(p.textContent)).map((p) => inline4(p, "p", document));
  }
  function collectItems(element, document) {
    const mediaWrapper = element.querySelector('[class*="EditorialMedia__MediaWrapper"]') || element;
    const legalWrapper = element.querySelector('[class*="EditorialMedia__LegalWrapper"]');
    const fallbackCaptions = legalWrapper ? [...legalWrapper.querySelectorAll('[class*="StyledLegalInfo"]')] : [];
    const media = [...mediaWrapper.querySelectorAll('[class*="StyledMediaWrapper"]')].filter((m) => !(legalWrapper && legalWrapper.contains(m)));
    const items = [];
    media.forEach((m, i) => {
      const src = [...m.querySelectorAll("img[src]")].find((img2) => !img2.getAttribute("src").startsWith("data:"));
      if (!src) return;
      const img = document.createElement("img");
      img.setAttribute("src", cleanMediaUrl3(src.getAttribute("src")));
      img.setAttribute("alt", src.getAttribute("alt") || "");
      let captionEl = null;
      let sib = m.nextElementSibling;
      while (sib && !/StyledMediaWrapper/.test(sib.className || "")) {
        if (/StyledLegalInfo/.test(sib.className || "")) {
          captionEl = sib;
          break;
        }
        sib = sib.nextElementSibling;
      }
      if (!captionEl) captionEl = fallbackCaptions[i] || null;
      items.push({ img, caption: captionParas(captionEl, document) });
    });
    return items;
  }
  function parse4(element, { document }) {
    const items = collectItems(element, document);
    if (items.length < 2) {
      const frag = document.createDocumentFragment();
      items.forEach(({ img, caption }) => {
        const p = document.createElement("p");
        p.appendChild(img);
        frag.appendChild(p);
        caption.forEach((c) => frag.appendChild(c));
      });
      element.replaceWith(frag);
      return;
    }
    const cells = [items.map(({ img, caption }) => [img, ...caption])];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-gallery", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-media-text.js
  function cleanText5(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function appendInline5(source, target, document) {
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
        const t = cleanText5(node.textContent);
        if (!t) return;
        const sup = document.createElement("sup");
        sup.textContent = /^[,;]$/.test(t) ? `${t} ` : t;
        target.appendChild(sup);
        return;
      }
      if (tag === "A" && node.getAttribute("href") && !node.classList.contains("audi-j-footnote-reference")) {
        const a = document.createElement("a");
        a.setAttribute("href", node.getAttribute("href"));
        appendInline5(node, a, document);
        target.appendChild(a);
        return;
      }
      if (["STRONG", "B", "EM", "I", "U", "SUB"].includes(tag)) {
        const el = document.createElement(tag.toLowerCase());
        appendInline5(node, el, document);
        target.appendChild(el);
        return;
      }
      if (tag === "BR") {
        target.appendChild(document.createElement("br"));
        return;
      }
      appendInline5(node, target, document);
    });
    return target;
  }
  function inline5(source, tagName, document) {
    const el = appendInline5(source, document.createElement(tagName), document);
    const first = el.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, "");
    const last = el.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, "");
    return el;
  }
  function parse5(element, { document }) {
    const imageCell = [];
    const srcImg = element.querySelector('[class*="BasicTeaser__StyledMedia"] img, [class*="BasicTeaser__StyledImage"] img') || element.querySelector("img");
    if (srcImg && srcImg.getAttribute("src") && !srcImg.getAttribute("src").startsWith("data:")) {
      const img = document.createElement("img");
      img.setAttribute("src", srcImg.getAttribute("src"));
      img.setAttribute("alt", srcImg.getAttribute("alt") || "");
      imageCell.push(img);
    }
    const textArea = element.querySelector('[class*="BasicTeaser__StyledTextArea"]') || element;
    const textCell2 = [];
    const heading = textArea.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading && cleanText5(heading.textContent)) {
      const h = document.createElement(heading.tagName.toLowerCase());
      h.textContent = cleanText5(heading.textContent);
      textCell2.push(h);
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
        if (cleanText5(node.textContent)) textCell2.push(inline5(node, "p", document));
        return;
      }
      const list = document.createElement(tag);
      node.querySelectorAll(":scope > li").forEach((li) => {
        const item = inline5(li, "li", document);
        if (cleanText5(item.textContent)) list.appendChild(item);
      });
      if (list.children.length) textCell2.push(list);
    });
    const buttons = buttonsArea ? [...buttonsArea.querySelectorAll("a[href]")] : [...textArea.querySelectorAll("a.button[href]")];
    buttons.forEach((btn) => {
      const label = cleanText5(btn.textContent);
      if (!label) return;
      const a = document.createElement("a");
      a.setAttribute("href", btn.getAttribute("href"));
      a.textContent = label;
      const p = document.createElement("p");
      p.appendChild(a);
      textCell2.push(p);
    });
    const cells = [[imageCell.length ? imageCell : "", textCell2.length ? textCell2 : ""]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-media-text", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-teaser.js
  var CONTAINER_SEL = '[class*="EditorialTeaserContainer"]';
  var TEASER_SEL = '[class*="EditorialTeaser__StyledComponent"]';
  function isAttached(el, document) {
    if (typeof el.isConnected === "boolean") return el.isConnected;
    return document.documentElement.contains(el);
  }
  function hinted4(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function cleanText6(text) {
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
  function appendInline6(source, target, document) {
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
        appendInline6(node, a, document);
        target.appendChild(a);
        return;
      }
      if (KEEP_INLINE.includes(tag)) {
        const el = document.createElement(tag.toLowerCase());
        appendInline6(node, el, document);
        target.appendChild(el);
        return;
      }
      appendInline6(node, target, document);
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
    return trimEdges(appendInline6(source, target, document));
  }
  function buildCard(teaser, document) {
    const textArea = teaser.querySelector('[class*="EditorialTeaser__TextArea"]') || teaser;
    const img = buildImage(teaser, document);
    const imageCell = img ? hinted4(document, "image", [img]) : "";
    const textNodes = [];
    const heading = textArea.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading && cleanText6(heading.textContent)) {
      const h = document.createElement(heading.tagName.toLowerCase());
      h.textContent = cleanText6(heading.textContent);
      textNodes.push(hinted4(document, "text_title", [h]));
    }
    const legal = textArea.querySelector('[class*="LegalInfoContainer"]');
    const legalParas = legal ? [...legal.querySelectorAll("p")].filter((p) => cleanText6(p.textContent)) : [];
    const isFact = (p) => /^[•·]/.test(cleanText6(p.textContent));
    const factParas = legalParas.filter(isFact);
    const disclaimerParas = legalParas.filter((p) => !isFact(p));
    const bodyNodes = [...textArea.querySelectorAll("p")].filter((p) => !(legal && legal.contains(p)) && cleanText6(p.textContent)).map((p) => copyInline(p, document.createElement("p")));
    if (factParas.length) {
      const ul = document.createElement("ul");
      factParas.forEach((p) => {
        const li = copyInline(p, document.createElement("li"));
        const first = li.firstChild;
        if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s*[•·]\s*/, "");
        ul.appendChild(li);
      });
      bodyNodes.push(ul);
    }
    let ctas = [...textArea.querySelectorAll('[class*="ButtonContainer"] a[href]')];
    if (!ctas.length) {
      const fallback = [...textArea.querySelectorAll("a[href]")].find((a) => !(legal && legal.contains(a)) && !(a.getAttribute("href") || "").startsWith("#"));
      if (fallback) ctas = [fallback];
    }
    const linkParas = ctas.filter((cta) => cleanText6(cta.textContent)).map((cta) => {
      const a = document.createElement("a");
      a.setAttribute("href", cta.getAttribute("href"));
      a.textContent = cleanText6(cta.textContent);
      const p = document.createElement("p");
      p.appendChild(a);
      return p;
    });
    const mainLink = linkParas.pop();
    bodyNodes.push(...linkParas);
    if (bodyNodes.length) textNodes.push(hinted4(document, "text_body", bodyNodes));
    if (mainLink) textNodes.push(hinted4(document, "text_link", [mainLink]));
    const textCell2 = textNodes.length ? textNodes : "";
    let disclaimerCell = "";
    if (legal && cleanText6(legal.textContent) && (disclaimerParas.length || !legalParas.length)) {
      const out = (disclaimerParas.length ? disclaimerParas : [legal]).map((p) => copyInline(p, document.createElement("p")));
      disclaimerCell = hinted4(document, "disclaimer", out);
    }
    return [imageCell, textCell2, disclaimerCell];
  }
  function parse6(element, { document }) {
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

  // tools/importer/transformers/audi-cleanup.js
  var SOURCE_ORIGIN = "https://www.audi.de";
  var AUDI_HOSTS = ["www.audi.de", "audi.de"];
  var MIGRATED_PATHS = [
    "/de/",
    "/de/neuwagen/",
    "/de/elektromobilitaet/",
    "/de/neuwagen/a3/a3-limousine/",
    "/de/neuwagen/a3/a3-allstreet/",
    "/de/neuwagen/a3/a3-sportback-e-hybrid/",
    "/de/neuwagen/a3/a3-sportback/",
    "/de/neuwagen/a2-e-tron/a2-e-tron/",
    "/de/neuwagen/q5/q5-suv/",
    "/de/neuwagen/q5/q5-suv-e-hybrid/",
    "/de/neuwagen/q5/q5-sportback/",
    "/de/neuwagen/q5/q5-sportback-e-hybrid/"
  ];
  var CONTENT_ROOT = "/language-masters";
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
      const migrated = !url.search && MIGRATED_PATHS.some((p) => normalizePath(url.pathname) === normalizePath(p));
      if (migrated) {
        a.setAttribute("href", `${SOURCE_ORIGIN}${CONTENT_ROOT}${url.pathname}${url.search}${url.hash}`);
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
      const apps = [...element.querySelectorAll("feature-app[id]")];
      apps.forEach((app, i) => {
        if (!app.id.startsWith("e7de798a")) return;
        const next = apps.slice(i + 1).find((a) => !a.id.startsWith("970c9160"));
        if (next) app.setAttribute("data-heading-for", next.id.slice(0, 8));
      });
      removeFeatureApps(element, 'feature-app[data-heading-for="7f5cb958"]');
      removeFeatureApps(element, 'feature-app[id^="7f5cb958"]');
      removeFeatureApps(element, 'feature-app[id^="0d76e233"]');
      element.querySelectorAll('feature-app[id^="fa9786fe"]').forEach((app) => {
        let fields = {};
        try {
          fields = JSON.parse(app.getAttribute("data-content") || "{}").fields || {};
        } catch (e) {
        }
        const wrap = document.createElement("div");
        const img = fields.fallbackImageUrl && fields.fallbackImageUrl.path;
        if (img) {
          const pic = document.createElement("p");
          const im = document.createElement("img");
          im.setAttribute("src", img);
          im.setAttribute("alt", fields.fallbackImageUrl.title || "");
          pic.append(im);
          wrap.append(pic);
        }
        if (fields.headLine) {
          const h2 = document.createElement("h2");
          h2.textContent = fields.headLine;
          wrap.append(h2);
        }
        [["Neuwagen", fields.newCarsCtaFallbackUrl, "strong"], ["Gebrauchtwagen", fields.usedCarsCtaFallbackUrl, "em"]].forEach(([label, href, tag]) => {
          if (!href) return;
          const para = document.createElement("p");
          const fmt = document.createElement(tag);
          const a = document.createElement("a");
          a.setAttribute("href", href);
          a.textContent = label;
          fmt.append(a);
          para.append(fmt);
          wrap.append(para);
        });
        app.replaceChildren(wrap);
      });
      element.querySelectorAll('feature-app[id^="92c3930b"]').forEach((app) => {
        const links = [...app.querySelectorAll("a[href]")];
        if (!links.length) return;
        const wrap = document.createElement("div");
        links.forEach((a, i) => {
          const link = document.createElement("a");
          link.setAttribute("href", a.getAttribute("href"));
          link.textContent = a.textContent.trim();
          const fmt = document.createElement(links.length > 1 && i === 0 ? "strong" : "em");
          fmt.append(link);
          const para = document.createElement("p");
          para.append(fmt);
          wrap.append(para);
        });
        app.replaceChildren(wrap);
      });
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

  // tools/importer/transformers/audi-dam-assets.js
  var DAM_FOLDER = "/content/dam/audidemo";
  var DAM_ASSET_RE = /^(https?:\/\/[^/]+\/adobe\/assets\/urn:[^/]+)\/(?:original\/)?as\/([^?#]+)/i;
  function toDamPath(url, assets) {
    const m = (url || "").trim().match(DAM_ASSET_RE);
    if (!m) return null;
    let file = m[2].split("/").pop();
    try {
      file = decodeURIComponent(file);
    } catch (e) {
    }
    const safe = file.replace(/[()]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-");
    assets[safe] = `${m[1]}/original/as/${m[2]}`;
    return `${DAM_FOLDER}/${safe}`;
  }
  function toNamedDamPath(img, assets) {
    const name = img.getAttribute("data-dam-name");
    if (!name) return null;
    img.removeAttribute("data-dam-name");
    const src = (img.getAttribute("src") || "").trim();
    if (!/^https?:/i.test(src)) return null;
    const ext = (src.split("?")[0].match(/\.(png|jpe?g|webp|gif|svg)$/i) || [null, "png"])[1].toLowerCase();
    const safe = name.split("/").map((part) => part.replace(/[^A-Za-z0-9._-]+/g, "-")).join("/");
    const key = `${safe}.${ext}`;
    assets[key] = src;
    return `${DAM_FOLDER}/${key}`;
  }
  function rewrite(root, document, origin) {
    const report = document.excatCleanupReport || {};
    const assets = report.damAssets || {};
    root.querySelectorAll("img[src]").forEach((img) => {
      const dam = toNamedDamPath(img, assets) || toDamPath(img.getAttribute("src"), assets);
      if (dam) img.setAttribute("src", dam);
    });
    root.querySelectorAll("source[srcset], img[srcset]").forEach((el) => {
      const first = (el.getAttribute("srcset") || "").split(",")[0].trim().split(" ")[0];
      const dam = toDamPath(first, assets);
      if (dam) el.setAttribute("srcset", dam);
    });
    root.querySelectorAll("video[src], video source[src]").forEach((el) => {
      const dam = toDamPath(el.getAttribute("src"), assets);
      if (dam) el.setAttribute("src", dam);
    });
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      const dam = toDamPath(href, assets);
      if (!dam) return;
      if (/^(https?:|\/)/.test(a.textContent.trim())) a.textContent = dam.split("/").pop();
      a.setAttribute("href", origin ? `${origin}${dam}` : dam);
      const parent = a.parentElement;
      if (parent && !parent.closest("p, li, h1, h2, h3, h4, h5, h6")) {
        const p = document.createElement("p");
        a.replaceWith(p);
        p.append(a);
      }
    });
    document.excatCleanupReport = __spreadProps(__spreadValues({}, report), { damAssets: assets });
  }
  function transform3(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const document = payload && payload.document || element.ownerDocument;
    let origin = "";
    try {
      origin = new URL(payload.params.originalURL).origin;
    } catch (e) {
    }
    rewrite(element, document, origin);
  }

  // tools/importer/import-neuwagen-model.js
  var PAGE_TEMPLATE = {
    "name": "neuwagen-model",
    "urls": [
      "https://www.audi.de/de/neuwagen/a3/a3-limousine/",
      "https://www.audi.de/de/neuwagen/a3/a3-allstreet/",
      "https://www.audi.de/de/neuwagen/a3/a3-sportback-e-hybrid/",
      "https://www.audi.de/de/neuwagen/a3/a3-sportback/",
      "https://www.audi.de/de/neuwagen/a2-e-tron/a2-e-tron/",
      "https://www.audi.de/de/neuwagen/q5/q5-suv/",
      "https://www.audi.de/de/neuwagen/q5/q5-suv-e-hybrid/",
      "https://www.audi.de/de/neuwagen/q5/q5-sportback/",
      "https://www.audi.de/de/neuwagen/q5/q5-sportback-e-hybrid/"
    ],
    "representativeUrl": "https://www.audi.de/de/neuwagen/a3/a3-limousine/",
    "description": "Audi car model page (e.g. A3 Limousine)",
    "blocks": [
      {
        "name": "hero-video",
        "instances": [
          "[class*='StageContainer__StageContainerWrap']"
        ]
      },
      {
        "name": "cards-stats",
        "instances": [
          "[class*='EditorialColumns-style__EditorialColumnsContainer']:has([class*='NumbersMode-style'])"
        ]
      },
      {
        "name": "carousel-cards",
        "instances": [
          ".faCarousel"
        ]
      },
      {
        "name": "columns-gallery",
        "instances": [
          "[class*='StyledEditorialMediaContainer']"
        ]
      },
      {
        "name": "columns-media-text",
        "instances": [
          "[class*='BasicTeaser__StyledContainer']"
        ]
      },
      {
        "name": "cards-teaser",
        "instances": [
          "feature-app:has([class*='EditorialTeaserContainer'])",
          "[class*='EditorialTeaserContainer']"
        ]
      }
    ],
    "urlPattern": "/de/neuwagen/*/*/",
    "sections": [
      {
        "id": "section-1",
        "name": "Stage / Hero mit Video",
        "selector": [
          "feature-app[id^='5d9c657e']"
        ],
        "style": null,
        "blocks": [
          "hero-video"
        ],
        "defaultContent": []
      },
      {
        "id": "section-2",
        "name": "Produktbild",
        "selector": [
          "feature-app[id^='737220be']"
        ],
        "style": null,
        "blocks": [],
        "defaultContent": [
          "feature-app[id^='737220be'] img"
        ]
      },
      {
        "id": "section-3",
        "name": "Key Facts",
        "selector": [
          "feature-app[id^='55e1dd15']"
        ],
        "style": null,
        "blocks": [
          "cards-stats"
        ],
        "defaultContent": [
          "feature-app[id^='92c3930b'] a"
        ]
      },
      {
        "id": "section-4",
        "name": "Fakten, die begeistern",
        "selector": [
          "feature-app[data-heading-for='3f189a36']",
          "feature-app[id^='3f189a36']"
        ],
        "style": null,
        "blocks": [
          "carousel-cards"
        ],
        "defaultContent": [
          "feature-app[data-heading-for='3f189a36'] h2",
          "feature-app[data-heading-for='3f189a36'] p",
          "feature-app[id^='92c3930b'] a"
        ]
      },
      {
        "id": "section-5",
        "name": "Design-Galerie",
        "selector": [
          "feature-app[id^='42bb6519']"
        ],
        "style": null,
        "blocks": [
          "columns-gallery"
        ],
        "defaultContent": [
          "feature-app[id^='42bb6519'] img"
        ]
      },
      {
        "id": "section-6",
        "name": "Konfigurator-Teaser",
        "selector": [
          "feature-app[id^='4017639b']"
        ],
        "style": null,
        "blocks": [
          "columns-media-text"
        ],
        "defaultContent": []
      },
      {
        "id": "section-6b",
        "name": "H\xE4ndlerbestand (Vehicle Stock Teaser)",
        "selector": [
          "feature-app[id^='fa9786fe']"
        ],
        "style": "split",
        "blocks": [],
        "defaultContent": [
          "feature-app[id^='fa9786fe'] img",
          "feature-app[id^='fa9786fe'] h2",
          "feature-app[id^='fa9786fe'] a"
        ]
      },
      {
        "id": "section-7",
        "name": "\xC4hnliche Modelle im Vergleich",
        "selector": [
          "feature-app[data-heading-for='a68d1551']",
          "feature-app[id^='a68d1551']"
        ],
        "style": null,
        "blocks": [
          "cards-teaser"
        ],
        "defaultContent": [
          "feature-app[data-heading-for='a68d1551'] h2"
        ]
      },
      {
        "id": "section-8",
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
    "hero-video": parse,
    "cards-stats": parse2,
    "carousel-cards": parse3,
    "columns-gallery": parse4,
    "columns-media-text": parse5,
    "cards-teaser": parse6
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
  var import_neuwagen_model_default = {
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
      try {
        transform3("afterTransform", main, __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE }));
      } catch (e) {
        console.error("DAM asset transformer failed:", e);
      }
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(`/language-masters${rawPath === "" ? "/index" : rawPath}`);
      const cleanupReport = document.excatCleanupReport || {};
      const livechatWidgetsRemoved = (_b = (_a = cleanupReport.livechatWidgetsRemoved) != null ? _a : params && params.livechatWidgetsRemoved) != null ? _b : 0;
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: [...new Set(pageBlocks.map((b) => b.name))],
          livechatWidgetsRemoved,
          damAssets: JSON.stringify(cleanupReport.damAssets || {})
        }
      }];
    }
  };
  return __toCommonJS(import_neuwagen_model_exports);
})();
