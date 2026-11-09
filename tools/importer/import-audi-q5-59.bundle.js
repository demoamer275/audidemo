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

  // tools/importer/import-audi-q5-59.js
  var import_audi_q5_59_exports = {};
  __export(import_audi_q5_59_exports, {
    default: () => import_audi_q5_59_default
  });

  // tools/importer/parsers/cards-model.js
  var ORIGIN = "https://www.audi.de";
  var AUDICOM_ORIGIN = "https://www.audi.com";
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function slugify(text) {
    return cleanText(text).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function hinted(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function absolutize(href) {
    const h = (href || "").trim();
    if (!h || h.startsWith("#")) return "";
    if (/^https?:\/\//i.test(h)) return h;
    if (h.startsWith("//")) return `https:${h}`;
    if (h.startsWith("/")) return `${ORIGIN}${h}`;
    return h;
  }
  function imageUrl(img) {
    const src = (img.getAttribute("src") || "").trim();
    if (/^https?:\/\//i.test(src) && !/placeholder/i.test(src)) return src;
    const candidates = (img.getAttribute("srcset") || "").split(/,\s+/).map((s) => s.trim().split(/\s+/)).filter(([u]) => /^https?:\/\//i.test(u || "")).map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 })).sort((a, b) => b.w - a.w);
    if (candidates.length) return candidates[0].u.split("?")[0];
    return "";
  }
  function appendInline(source, target, document) {
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const text = node.textContent.replace(/\s+/g, " ");
        if (text) target.appendChild(document.createTextNode(text));
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toUpperCase();
      if (["IMG", "SVG", "SCRIPT", "STYLE", "PICTURE", "INPUT", "BUTTON"].includes(tag)) return;
      if (tag === "SUP") {
        const t = cleanText(node.textContent);
        if (!t) return;
        const sup = document.createElement("sup");
        sup.textContent = t;
        target.appendChild(sup);
        return;
      }
      if (tag === "BR") {
        target.appendChild(document.createElement("br"));
        return;
      }
      if (["STRONG", "B", "EM", "I", "SUB"].includes(tag)) {
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
    while (el.firstChild && el.firstChild.nodeType === 3 && !el.firstChild.textContent.trim()) el.firstChild.remove();
    while (el.lastChild && el.lastChild.nodeType === 3 && !el.lastChild.textContent.trim()) el.lastChild.remove();
    if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.textContent = el.firstChild.textContent.replace(/^\s+/, "");
    if (el.lastChild && el.lastChild.nodeType === 3) el.lastChild.textContent = el.lastChild.textContent.replace(/\s+$/, "");
    el.querySelectorAll("sup").forEach((sup) => {
      const prev = sup.previousSibling;
      if (prev && prev.nodeType === 3) prev.textContent = prev.textContent.replace(/\s+$/, "");
    });
    return el;
  }
  function getCards(element) {
    let cards = [...element.querySelectorAll('[class*="CarlineCard__CardWrapper"]')];
    if (!cards.length) cards = [...element.querySelectorAll('[data-testid^="carCard-"]')];
    if (!cards.length) cards = [...element.querySelectorAll('[class*="CardList__CardListItem"]')];
    return cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)));
  }
  function linkPara(document, href, text, wrapTag) {
    const p = document.createElement("p");
    const a = document.createElement("a");
    a.setAttribute("href", href);
    a.textContent = text;
    if (wrapTag) {
      const w = document.createElement(wrapTag);
      w.appendChild(a);
      p.appendChild(w);
    } else {
      p.appendChild(a);
    }
    return p;
  }
  function buildCard(card, document) {
    const titleEl = card.querySelector('h2, h3, [class*="CarlineCard__Title"]');
    const title = cleanText(titleEl ? titleEl.textContent : "");
    const srcImg = card.querySelector('[class*="CardImage"] img') || card.querySelector("img");
    let imageCell = "";
    const url = srcImg ? imageUrl(srcImg) : "";
    if (url) {
      const img = document.createElement("img");
      img.setAttribute("src", url);
      const alt = cleanText(srcImg.getAttribute("alt")) || title;
      img.setAttribute("alt", alt);
      const slug = slugify(title || alt);
      if (slug) img.setAttribute("data-dam-name", `cards/${slug}`);
      imageCell = hinted(document, "image", [img]);
    }
    const textNodes = [];
    const badges = [...card.querySelectorAll('[data-testid="frostyBadge"]')].map((b) => cleanText(b.textContent)).filter(Boolean);
    if (badges.length) {
      const ul = document.createElement("ul");
      badges.forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        ul.appendChild(li);
      });
      textNodes.push(ul);
    }
    if (title) {
      const h2 = document.createElement("h2");
      h2.textContent = title;
      textNodes.push(h2);
    }
    let priceParts = [...card.querySelectorAll('[class*="Price__StyledPrice"]')];
    if (!priceParts.length) priceParts = [...card.querySelectorAll('[data-testid="price"]')];
    priceParts = priceParts.filter((p) => !priceParts.some((o) => o !== p && o.contains(p)));
    if (priceParts.length) {
      const p = document.createElement("p");
      priceParts.forEach((part, i) => {
        if (i > 0) p.appendChild(document.createTextNode(" "));
        appendInline(part, p, document);
      });
      trimEdges(p);
      if (cleanText(p.textContent)) textNodes.push(p);
    }
    const primary = card.querySelector('a[data-testid="primaryCta"][href]');
    if (primary && absolutize(primary.getAttribute("href"))) {
      textNodes.push(linkPara(document, absolutize(primary.getAttribute("href")), cleanText(primary.textContent) || "Konfigurieren", "strong"));
    }
    const secondary = card.querySelector('a[data-testid="secondaryCta"][href]');
    if (secondary && absolutize(secondary.getAttribute("href"))) {
      textNodes.push(linkPara(document, absolutize(secondary.getAttribute("href")), cleanText(secondary.textContent) || "Entdecken", "em"));
    }
    ["newCarsVtpLink", "usedCarsVtpLink"].forEach((id) => {
      const a = card.querySelector(`a[data-testid="${id}"][href]`);
      const href = a ? absolutize(a.getAttribute("href")) : "";
      if (!href) return;
      const text = cleanText(a.textContent).replace(/\s*\(\s*\d[\d.]*\s*\)\s*$/, "");
      if (text) textNodes.push(linkPara(document, href, text));
    });
    const textCell = textNodes.length ? hinted(document, "text", textNodes) : "";
    let consumptionCell = "";
    const caeEls = [...card.querySelectorAll('[data-testid="cae"]')];
    const caeParas = (caeEls.length ? caeEls : [...card.querySelectorAll('[class*="CarlineCard__DisclaimerWrapper"] p')]).map((el) => trimEdges(appendInline(el, document.createElement("p"), document))).filter((p) => cleanText(p.textContent));
    if (caeParas.length) consumptionCell = hinted(document, "consumption", caeParas);
    if (!imageCell && !textCell && !consumptionCell) return null;
    return [imageCell, textCell, consumptionCell];
  }
  function absolutizeAudiCom(href) {
    const h = (href || "").trim();
    if (!h || h.startsWith("#")) return "";
    try {
      return new URL(h, AUDICOM_ORIGIN).href;
    } catch (e) {
      return h;
    }
  }
  function buildAudiComTile(tile, document) {
    const titleEl = tile.querySelector(".cars-overview-tile-content-body--header h4, h4, h3, h2");
    const title = cleanText(titleEl ? titleEl.textContent : "");
    const href = absolutizeAudiCom(tile.getAttribute("href"));
    let imageCell = "";
    const srcImg = tile.querySelector(".cars-overview-tile-content--image img") || tile.querySelector("img");
    const src = srcImg ? (srcImg.getAttribute("src") || "").trim() : "";
    if (src) {
      const img = document.createElement("img");
      img.setAttribute("src", src);
      img.setAttribute("alt", cleanText(srcImg.getAttribute("alt")) || title);
      imageCell = hinted(document, "image", [img]);
    }
    const textNodes = [];
    const badges = [...tile.querySelectorAll(".cars-overview-tile-content--type-badge .tag")].map((b) => cleanText(b.textContent)).filter(Boolean);
    if (badges.length) {
      const ul = document.createElement("ul");
      badges.forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        ul.appendChild(li);
      });
      textNodes.push(ul);
    }
    if (title) {
      const h4 = document.createElement("h4");
      if (href) {
        const a = document.createElement("a");
        a.setAttribute("href", href);
        a.textContent = title;
        h4.appendChild(a);
      } else {
        h4.textContent = title;
      }
      textNodes.push(h4);
    }
    const textCell = textNodes.length ? hinted(document, "text", textNodes) : "";
    let consumptionCell = "";
    const consumption = tile.querySelector(".cars-overview-tile-content-body--consumption-data");
    if (consumption) {
      let paras = [...consumption.querySelectorAll("p")];
      if (!paras.length) paras = [consumption];
      const out = paras.map((el) => trimEdges(appendInline(el, document.createElement("p"), document))).filter((p) => cleanText(p.textContent));
      if (out.length) consumptionCell = hinted(document, "consumption", out);
    }
    if (!imageCell && !textCell && !consumptionCell) return null;
    return [imageCell, textCell, consumptionCell];
  }
  function parse(element, { document }) {
    const cells = [];
    const audiComTiles = element.matches("a.overview-car-tile") ? [element] : [...element.querySelectorAll("a.overview-car-tile")];
    if (audiComTiles.length) {
      audiComTiles.forEach((tile) => {
        const row = buildAudiComTile(tile, document);
        if (row) cells.push(row);
      });
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-model", cells });
      element.replaceWith(block2);
      return;
    }
    getCards(element).forEach((card) => {
      const row = buildCard(card, document);
      if (row) cells.push(row);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-model", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-cards.js
  var AUDICOM_ORIGIN2 = "https://www.audi.com";
  var PLACEHOLDER_RE = /\/PH-[^/]*\.(jpe?g|png|webp)$/i;
  function cleanText2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function cleanMediaUrl(url) {
    return (url || "").trim().split("#")[0].split("?")[0];
  }
  function isPlaceholder(src, alt) {
    const url = cleanMediaUrl(src);
    return !url || url.startsWith("data:") || PLACEHOLDER_RE.test(url) || (alt || "").trim() === "#";
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
  function inline(source, tagName, document) {
    const el = appendInline2(source, document.createElement(tagName), document);
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
      const url = cleanMediaUrl(asset && (asset.path || asset));
      if (typeof url === "string" && /\.(mp4|webm|mov|m4v)$/i.test(url)) return url;
    }
    return "";
  }
  function absolutizeAudiCom2(href) {
    const h = (href || "").trim();
    if (!h || h.startsWith("#")) return "";
    try {
      return new URL(h, AUDICOM_ORIGIN2).href;
    } catch (e) {
      return h;
    }
  }
  function buildAudiComSlide(card, document) {
    let imageCell = "";
    const img = card.querySelector(".teaser-card--image img") || card.querySelector("img");
    const src = img ? (img.getAttribute("src") || "").trim() : "";
    if (src) {
      const out = document.createElement("img");
      out.setAttribute("src", src);
      out.setAttribute("alt", cleanText2(img.getAttribute("alt")));
      imageCell = hinted2(document, "image", [out]);
    }
    const textNodes = [];
    [...card.querySelectorAll(".teaser-card--tags .tag")].map((t) => cleanText2(t.textContent)).filter(Boolean).forEach((t) => {
      const p = document.createElement("p");
      p.textContent = t;
      textNodes.push(p);
    });
    const meta = [...card.querySelectorAll(".teaser-card--meta .meta--item")].map((m) => cleanText2(m.textContent)).filter(Boolean);
    if (meta.length) {
      const p = document.createElement("p");
      p.textContent = meta.join(" \xB7 ");
      textNodes.push(p);
    }
    const titleEl = card.querySelector(".teaser-card--title");
    const title = cleanText2(titleEl ? titleEl.textContent : "");
    if (title) {
      const link = titleEl.querySelector("a[href]") || card.querySelector(".teaser-card--image a[href]");
      const href = link ? absolutizeAudiCom2(link.getAttribute("href")) : "";
      const h3 = document.createElement("h3");
      if (href) {
        const a = document.createElement("a");
        a.setAttribute("href", href);
        a.textContent = title;
        h3.appendChild(a);
      } else {
        h3.textContent = title;
      }
      textNodes.push(h3);
    }
    const contentCell = textNodes.length ? hinted2(document, "content_text", textNodes) : "";
    if (!imageCell && !contentCell) return null;
    return [imageCell, "", contentCell];
  }
  function parse2(element, { document }) {
    const teaserCards = element.querySelectorAll(".teaser-card");
    if (teaserCards.length) {
      const cells2 = [];
      [...element.querySelectorAll(".splide__slide")].filter((slide) => !slide.classList.contains("splide__slide--clone")).map((slide) => slide.querySelector(".teaser-card")).filter(Boolean).forEach((card) => {
        const row = buildAudiComSlide(card, document);
        if (row) cells2.push(row);
      });
      if (!cells2.length) {
        [...teaserCards].forEach((card) => {
          const row = buildAudiComSlide(card, document);
          if (row) cells2.push(row);
        });
      }
      const block2 = WebImporter.Blocks.createBlock(document, { name: "carousel-cards", cells: cells2 });
      element.replaceWith(block2);
      return;
    }
    const slideData = readSlideData(element);
    const slides = [...element.querySelectorAll("li.splide__slide")].filter((li) => !li.classList.contains("splide__slide--clone"));
    const cells = [];
    slides.forEach((li, index) => {
      const titleEl2 = li.querySelector(".faCarousel__slideTitle");
      const title = titleEl2 ? cleanText2(titleEl2.textContent) : "";
      const data = slideData.find((d) => cleanText2(d.slideTitle) === title) || slideData[index];
      let imageCell = "";
      const img = [...li.querySelectorAll("img[src]")].find((i) => !isPlaceholder(i.getAttribute("src"), i.getAttribute("alt")));
      if (img) {
        const out = document.createElement("img");
        out.setAttribute("src", cleanMediaUrl(img.getAttribute("src")));
        out.setAttribute("alt", img.getAttribute("alt") || "");
        imageCell = hinted2(document, "image", [out]);
      }
      let videoCell = "";
      const domVideo = li.querySelector("video source[src], video[src]");
      const videoUrl = domVideo && cleanMediaUrl(domVideo.getAttribute("src")) || videoUrlOf(data);
      if (videoUrl) {
        const a = document.createElement("a");
        a.setAttribute("href", videoUrl);
        a.textContent = videoUrl;
        videoCell = hinted2(document, "video", [a]);
      }
      const content = [];
      if (title) {
        const h3 = document.createElement("h3");
        h3.textContent = title;
        content.push(hinted2(document, "content_title", [h3]));
      }
      const desc = li.querySelector(".faCarousel__slideDescription");
      const paras = desc ? [...desc.querySelectorAll("p")].filter((p) => cleanText2(p.textContent)) : [];
      const textNodes = paras.length ? paras.map((p) => inline(p, "p", document)) : desc && cleanText2(desc.textContent) ? [inline(desc, "p", document)] : [];
      const cta = li.querySelector('a[data-testid$="-item-cta"]');
      if (cta && cleanText2(cta.textContent) && cta.getAttribute("href")) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.setAttribute("href", cta.getAttribute("href"));
        a.textContent = cleanText2(cta.textContent);
        p.appendChild(a);
        textNodes.push(p);
      }
      const wltp = li.querySelector('[data-testid$="-item-wltp"]');
      if (wltp && cleanText2(wltp.textContent)) {
        const line = inline(wltp, "p", document);
        line.innerHTML = line.innerHTML.replace(/;(?!\s|$)/g, "; ");
        textNodes.push(line);
      }
      if (textNodes.length) content.push(hinted2(document, "content_text", textNodes));
      const row = [imageCell, videoCell, content.length ? content : ""];
      if (row.some((c) => c !== "")) cells.push(row);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-cards", cells });
    const app = element.closest("feature-app[id]");
    const tagged = app && document.querySelector(`feature-app[data-heading-for="${app.id.slice(0, 8)}"]`);
    const titleEl = [...element.querySelectorAll("h2")].find((h) => !h.closest("li"));
    if (titleEl && !tagged && cleanText2(titleEl.textContent)) {
      const h2 = document.createElement("h2");
      h2.textContent = cleanText2(titleEl.textContent);
      element.replaceWith(h2, block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/parsers/cards-list.js
  var AUDICOM_ORIGIN3 = "https://www.audi.com";
  function cleanText3(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function hinted3(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function absolutize2(href) {
    const h = (href || "").trim();
    if (!h || h.startsWith("#")) return "";
    try {
      return new URL(h, AUDICOM_ORIGIN3).href;
    } catch (e) {
      return h;
    }
  }
  function buildItem(item, document) {
    const titleLink = item.querySelector("a.detailed-page-list-item--title[href]");
    const titleEl = item.querySelector(".detailed-page-list-item--title h3, .detailed-page-list-item--title, h3");
    const title = cleanText3(titleEl ? titleEl.textContent : "");
    const imageLink = item.querySelector("a.detailed-page-list-item--image[href]");
    const href = absolutize2((titleLink || imageLink || { getAttribute: () => "" }).getAttribute("href"));
    let imageCell = "";
    const srcImg = item.querySelector(".detailed-page-list-item--image img") || item.querySelector("img");
    const src = srcImg ? (srcImg.getAttribute("src") || "").trim() : "";
    if (src) {
      const img = document.createElement("img");
      img.setAttribute("src", src);
      img.setAttribute("alt", cleanText3(srcImg.getAttribute("alt")) || title);
      imageCell = hinted3(document, "image", [img]);
    }
    const textNodes = [];
    [...item.querySelectorAll(".detailed-page-list-item--tags .tag")].map((t) => cleanText3(t.textContent)).filter(Boolean).forEach((t) => {
      const p = document.createElement("p");
      p.textContent = t;
      textNodes.push(p);
    });
    const meta = [...item.querySelectorAll(".detailed-page-list-item--meta .meta--item")].map((m) => cleanText3(m.textContent)).filter(Boolean);
    if (meta.length) {
      const p = document.createElement("p");
      p.textContent = meta.join(" \xB7 ");
      textNodes.push(p);
    }
    if (title) {
      const h3 = document.createElement("h3");
      if (href) {
        const a = document.createElement("a");
        a.setAttribute("href", href);
        a.textContent = title;
        h3.appendChild(a);
      } else {
        h3.textContent = title;
      }
      textNodes.push(h3);
    }
    const intro = item.querySelector(".detailed-page-list-item--intro");
    const introText = cleanText3(intro ? intro.textContent : "");
    if (introText) {
      const paras = [...intro.querySelectorAll("p")].map((p) => cleanText3(p.textContent)).filter(Boolean);
      (paras.length ? paras : [introText]).forEach((t) => {
        const p = document.createElement("p");
        p.textContent = t;
        textNodes.push(p);
      });
    }
    const textCell = textNodes.length ? hinted3(document, "text", textNodes) : "";
    if (!imageCell && !textCell) return null;
    return [imageCell, textCell];
  }
  function parse3(element, { document }) {
    const cells = [];
    let items = [...element.querySelectorAll("li.detailed-page-list-item")];
    if (!items.length) items = [...element.querySelectorAll(":scope > li")];
    items.forEach((item) => {
      const row = buildItem(item, document);
      if (row) cells.push(row);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-list", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-panels.js
  var AUDICOM_ORIGIN4 = "https://www.audi.com";
  function cleanText4(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function absolutize3(href) {
    const h = (href || "").trim();
    if (!h || h.startsWith("#")) return "";
    if (/^(tel|mailto):/i.test(h)) return h;
    try {
      return new URL(h, AUDICOM_ORIGIN4).href;
    } catch (e) {
      return h;
    }
  }
  function heading(document, el, tag = "h3") {
    const text = cleanText4(el ? el.textContent : "");
    if (!text) return null;
    const h = document.createElement(tag);
    h.textContent = text;
    return h;
  }
  function textPara(document, text) {
    const t = cleanText4(text);
    if (!t) return null;
    const p = document.createElement("p");
    p.textContent = t;
    return p;
  }
  function linkPara2(document, link) {
    if (!link) return null;
    const href = absolutize3(link.getAttribute("href"));
    const text = cleanText4(link.textContent);
    if (!text) return null;
    if (!href) return textPara(document, text);
    const p = document.createElement("p");
    const a = document.createElement("a");
    a.setAttribute("href", href);
    const title = cleanText4(link.getAttribute("title"));
    if (title) a.setAttribute("title", title);
    a.textContent = text;
    p.appendChild(a);
    return p;
  }
  function contactsColumn(root, document) {
    const nodes = [];
    const list = root.querySelector(".media-contacts-list") || root.querySelector(".media-contacts--contacts") || root;
    nodes.push(heading(document, list.querySelector(".media-contacts-list--title, h3")));
    list.querySelectorAll(".media-contact").forEach((contact) => {
      const srcImg = contact.querySelector(".media-contact--image img") || contact.querySelector("img");
      const src = srcImg ? (srcImg.getAttribute("src") || "").trim() : "";
      const imageLink = contact.querySelector("a.media-contact--image");
      const nameEl = contact.querySelector(".media-contact--name") || (imageLink && cleanText4(imageLink.textContent) ? imageLink : null);
      const name = cleanText4(nameEl ? nameEl.textContent : "");
      if (src) {
        const p = document.createElement("p");
        const img = document.createElement("img");
        img.setAttribute("src", src);
        img.setAttribute("alt", cleanText4(srcImg.getAttribute("alt")) || name);
        p.appendChild(img);
        nodes.push(p);
      }
      if (nameEl) {
        nodes.push(nameEl.matches("a[href]") ? linkPara2(document, nameEl) : textPara(document, name));
      }
      const position = contact.querySelector(".media-contact--position");
      if (position) nodes.push(textPara(document, position.textContent));
      contact.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').forEach((a) => {
        nodes.push(linkPara2(document, a));
      });
    });
    nodes.push(linkPara2(document, list.querySelector("a.media-contacts-list--button")));
    return nodes.filter(Boolean);
  }
  function serviceColumn(root, document) {
    const banner = root.querySelector(".not-a-journalist-banner") || root.querySelector(".media-contacts--not-a-journalist");
    if (!banner) return [];
    const nodes = [];
    nodes.push(heading(document, banner.querySelector(".not-a-journalist-banner--title, h3")));
    let paras = [...banner.querySelectorAll(".not-a-journalist-banner--paragraph")];
    if (!paras.length) paras = [...banner.querySelectorAll("p")];
    paras.forEach((p) => nodes.push(textPara(document, p.textContent)));
    banner.querySelectorAll(".not-a-journalist-banner--action-button a[href]").forEach((a) => {
      nodes.push(linkPara2(document, a));
    });
    return nodes.filter(Boolean);
  }
  function parse4(element, { document }) {
    const col1 = contactsColumn(element, document);
    const col2 = serviceColumn(element, document);
    const cells = [[col1.length ? col1 : "", col2.length ? col2 : ""]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-panels", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/audicom-cleanup.js
  var SOURCE_ORIGIN = "https://www.audi.com";
  var AUDI_COM_HOST_RE = /(^|\.)audi\.com$/i;
  var UI_ASSET_RE = /^https?:\/\/static\.audi\.com\/assets\/(?:images\/(?:frontend\/|blank-)|[^/]+\.(?:css|js)(?:[?#]|$))/i;
  var TRACKING_ATTR_RE = /^(data-track|data-tracking|data-gtm|data-analytics|amtv-tracking|onclick|onload|up-)/i;
  function setReport(document, payload, key, value) {
    if (document) {
      document.excatCleanupReport = __spreadProps(__spreadValues({}, document.excatCleanupReport || {}), { [key]: value });
    }
    if (payload) {
      payload[key] = value;
      if (payload.params && typeof payload.params === "object") payload.params[key] = value;
    }
  }
  function isAudiComPage(element, document, payload) {
    try {
      const u = new URL(payload && payload.params && payload.params.originalURL);
      if (AUDI_COM_HOST_RE.test(u.hostname)) return true;
      if (u.hostname) return false;
    } catch (e) {
    }
    const body = document && document.body || element;
    const base = body && body.getAttribute && body.getAttribute("data-base-url") || "";
    if (/^https?:\/\/(www\.)?audi\.com\//i.test(base)) return true;
    return !!element.querySelector("header.layout--header, footer.layout--footer, .main-content > .page-row");
  }
  function removeAll(root, selectors) {
    let count = 0;
    selectors.forEach((sel) => {
      let nodes = [];
      try {
        nodes = [...root.querySelectorAll(sel)];
      } catch (e) {
        return;
      }
      nodes.forEach((el) => {
        if (el.parentNode) {
          el.remove();
          count += 1;
        }
      });
    });
    return count;
  }
  function isPlaceholder2(url) {
    return !url || /^data:/i.test(url) || UI_ASSET_RE.test(url) || /\/blank[-.]/i.test(url);
  }
  function absolute(url) {
    try {
      return new URL(url, SOURCE_ORIGIN).href;
    } catch (e) {
      return url;
    }
  }
  function renditionSize(url) {
    const file = url.split("?")[0].split("/").pop() || "";
    const m = file.match(/(?:^|_)web_(\d+)(?:_|\.)/i);
    if (m) return parseInt(m[1], 10);
    if (/^thumb_/i.test(file)) return 1;
    return null;
  }
  var MAX_RENDITION = 2880;
  var DOWNLOAD_VARIANT_RE = /(?:_(?:small|medium|large)\.[a-z0-9]+(?:[?#]|$)|[?&]disposition=attachment)/i;
  function rank(size) {
    if (size > MAX_RENDITION) return MAX_RENDITION / size;
    return size;
  }
  function parseSrcset(value) {
    return (value || "").split(/,\s+/).map((part) => {
      const [url, desc] = part.trim().split(/\s+/);
      return { url, w: parseInt(desc, 10) || 0 };
    }).filter((c) => c.url && !isPlaceholder2(c.url));
  }
  function bestImageUrl(img) {
    const cands = [];
    ["src", "data-src"].forEach((attr) => {
      var _a;
      const url = (img.getAttribute(attr) || "").trim();
      if (!isPlaceholder2(url)) cands.push({ url, score: rank((_a = renditionSize(url)) != null ? _a : 1e6), pri: attr === "src" ? 2 : 1 });
    });
    ["data-srcset", "srcset"].forEach((attr) => {
      parseSrcset(img.getAttribute(attr)).forEach((c) => {
        cands.push({ url: c.url, score: rank(Math.max(c.w, renditionSize(c.url) || 0)), pri: 0 });
      });
    });
    cands.forEach((c) => {
      if (DOWNLOAD_VARIANT_RE.test(c.url)) c.score = -1;
    });
    if (!cands.length) return "";
    cands.sort((a, b) => b.score - a.score || b.pri - a.pri);
    return cands[0].url;
  }
  function resolveImages(root) {
    root.querySelectorAll("img").forEach((img) => {
      const best = bestImageUrl(img);
      if (!best) {
        img.remove();
        return;
      }
      img.setAttribute("src", /^\.?\.?\//.test(best) && !best.startsWith("/") ? best : absolute(best));
      ["srcset", "data-srcset", "data-src", "data-sizes", "sizes", "loading", "decoding", "style", "class"].forEach((a) => img.removeAttribute(a));
      if (!img.hasAttribute("alt")) img.setAttribute("alt", "");
    });
    root.querySelectorAll("picture source").forEach((s) => s.remove());
  }
  function isIntroCompanionRow(row) {
    const items = [...row.querySelectorAll('[class*="page-item--"]')].filter((el) => [...el.classList].some((c) => c.startsWith("page-item--")));
    return items.length > 0 && items.every((el) => el.matches(".page-item--image, .page-item--intro, .page-item--markup"));
  }
  function mergeIntoHeadlineRows(root) {
    root.querySelectorAll(".main-content > .page-row").forEach((row) => {
      if (!row.parentNode || !row.querySelector(".page-item--headline")) return;
      const isH1Row = !!row.querySelector(".page-item--headline h1");
      for (; ; ) {
        let next = row.nextElementSibling;
        while (next && next.classList.contains("page-row-spacer")) next = next.nextElementSibling;
        if (!next || !next.classList.contains("page-row")) return;
        if (next.querySelector(".page-item--headline")) return;
        const isIntro = !!next.querySelector(".page-item--intro");
        if (!isIntro && !(isH1Row && isIntroCompanionRow(next))) return;
        while (next.firstChild) row.append(next.firstChild);
        next.remove();
        if (!isH1Row) return;
      }
    });
  }
  function rewriteLinks(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (href.startsWith("/") && !href.startsWith("//")) a.setAttribute("href", absolute(href));
    });
  }
  function stripAttributes(root) {
    root.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (TRACKING_ATTR_RE.test(attr.name)) el.removeAttribute(attr.name);
      });
    });
  }
  function transform(hookName, element, payload) {
    const document = payload && payload.document || element.ownerDocument;
    if (!isAudiComPage(element, document, payload)) return;
    if (hookName === "beforeTransform") {
      const removed = removeAll(element, [
        // header / navigation, breadcrumb + DE/EN language switch, footer
        "header.layout--header",
        // main menu layers, search bar and overlay (siblings of the header)
        ".main-menu",
        ".header-search-bar",
        "form.search-overlay",
        "nav.layout--breadcrumb-bar",
        ".frontend-locale-switcher",
        "footer.layout--footer",
        // hidden footnote container (consumption data banner, filled by JS)
        ".consumption-data-banner",
        // cookie / consent (Ensighten)
        "#ensModalWrapper",
        "#ensModalBackdrop",
        ".ensPrivacyManager",
        "cookie-consent-change",
        // Sprinklr live chat, injected after consent (its empty <audio src> becomes an empty link)
        "#spr-live-chat-app",
        "#spr-lc-announcements",
        "#spr-live-chat-frame",
        // layout helpers without authorable content
        ".layout--banner",
        ".layout--flashes",
        ".chatbot-indicator",
        "#screen-reader-announcements-container",
        ".resize-observer",
        "[amtv-tracking]",
        // slider UI chrome
        ".splide__arrows",
        ".splide__arrow",
        ".splide__pagination",
        // model pages (audicom-model): gallery category tabs + "Load more", data-sheet
        // download cart, duplicated mobile-only data-sheet cells, download icons,
        // WLTP footnote badges laid over images (their <noscript> copies go with them)
        ".gallery-panel--tablist",
        ".tablist",
        ".load-more-button",
        ".motorization--add-all-to-cart-button",
        "td.-mobile",
        ".download--icon",
        ".badge-wrapper--layer",
        // inline WLTP footnote markers in text (e.g. "SQ5<sup>2</sup>"), numbered by the site's script
        "sup.inline-consumption-data",
        // technical
        "script",
        "style",
        "noscript",
        "iframe",
        "link",
        "dialog",
        "[hidden]"
      ]);
      let cartRemoved = 0;
      element.querySelectorAll(".icon.-cart-button").forEach((icon) => {
        const button = icon.closest("button");
        if (!button || !button.parentNode) return;
        const cell = button.parentElement && button.parentElement.closest("td, th");
        button.remove();
        cartRemoved += 1;
        if (cell && !cell.textContent.trim() && !cell.querySelector("img, a, picture, video")) cell.remove();
      });
      setReport(document, payload, "audicomChromeRemoved", removed + cartRemoved);
      element.querySelectorAll(".page-row-spacer").forEach((el) => {
        if (!el.textContent.trim() && !el.querySelector("img, video, picture")) el.remove();
      });
      element.querySelectorAll("span.icon").forEach((el) => {
        if (!el.textContent.trim() && !el.querySelector("img, svg")) el.remove();
      });
      element.querySelectorAll(".download--consumption-data").forEach((el) => {
        if (el.querySelector("p, div")) return;
        const p = document.createElement("p");
        while (el.firstChild) p.append(el.firstChild);
        el.append(p);
      });
      mergeIntoHeadlineRows(element);
      resolveImages(element);
      rewriteLinks(element);
    }
    if (hookName === "afterTransform") {
      resolveImages(element);
      rewriteLinks(element);
      stripAttributes(element);
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
  var AUDI_COM_ASSET_RE = /^https?:\/\/(?:uploads|static)\.audi\.com\/[^?#]+\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm|m4v|mov)(?:[?#]|$)/i;
  var AUDI_COM_UI_RE = /^https?:\/\/static\.audi\.com\/assets\/images\/(?:frontend\/|blank-)/i;
  var VIDEO_EXT_RE = /\.(?:mp4|webm|m4v|mov)(?:[?#]|$)/i;
  var opts = { folder: "", audiCom: false };
  function damKey(name) {
    return opts.folder ? `${opts.folder}/${name}` : name;
  }
  function safeFileName(file) {
    let name = file;
    try {
      name = decodeURIComponent(name);
    } catch (e) {
    }
    return name.replace(/[()]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-");
  }
  function toDamPath(url, assets) {
    const raw = (url || "").trim();
    const m = raw.match(DAM_ASSET_RE);
    if (!m) return toAudiComDamPath(raw, assets);
    const key = damKey(safeFileName(m[2].split("/").pop()));
    assets[key] = `${m[1]}/original/as/${m[2]}`;
    return `${DAM_FOLDER}/${key}`;
  }
  function isAudiComAsset(url) {
    return opts.audiCom && AUDI_COM_ASSET_RE.test(url || "") && !AUDI_COM_UI_RE.test(url || "");
  }
  function toAudiComDamPath(url, assets) {
    if (!isAudiComAsset(url)) return null;
    const key = damKey(safeFileName(url.split(/[?#]/)[0].split("/").pop()));
    assets[key] = url;
    return `${DAM_FOLDER}/${key}`;
  }
  function renditionSize2(url) {
    const file = url.split("?")[0].split("/").pop() || "";
    const m = file.match(/(?:^|_)web_(\d+)(?:_|\.)/i);
    if (m) return parseInt(m[1], 10);
    return /^thumb_/i.test(file) ? 1 : null;
  }
  var MAX_RENDITION2 = 2880;
  var DOWNLOAD_VARIANT_RE2 = /(?:_(?:small|medium|large)\.[a-z0-9]+(?:[?#]|$)|[?&]disposition=attachment)/i;
  var rank2 = (size) => size > MAX_RENDITION2 ? MAX_RENDITION2 / size : size;
  function bestAudiComUrl(img) {
    const cands = [];
    ["src", "data-src"].forEach((attr) => {
      var _a;
      const url = (img.getAttribute(attr) || "").trim();
      if (isAudiComAsset(url)) cands.push({ url, score: rank2((_a = renditionSize2(url)) != null ? _a : 1e6), pri: attr === "src" ? 2 : 1 });
    });
    ["data-srcset", "srcset"].forEach((attr) => {
      (img.getAttribute(attr) || "").split(/,\s+/).forEach((part) => {
        const [url, desc] = part.trim().split(/\s+/);
        if (isAudiComAsset(url)) cands.push({ url, score: rank2(Math.max(parseInt(desc, 10) || 0, renditionSize2(url) || 0)), pri: 0 });
      });
    });
    cands.forEach((c) => {
      if (DOWNLOAD_VARIANT_RE2.test(c.url)) c.score = -1;
    });
    cands.sort((a, b) => b.score - a.score || b.pri - a.pri);
    return cands.length ? cands[0].url : "";
  }
  function resolveAudiComImages(root) {
    if (!opts.audiCom) return;
    root.querySelectorAll("img").forEach((img) => {
      const src = (img.getAttribute("src") || "").trim();
      if (AUDI_COM_UI_RE.test(src) && !bestAudiComUrl(img)) {
        img.remove();
        return;
      }
      const best = bestAudiComUrl(img);
      if (!best) return;
      img.setAttribute("src", best);
      img.removeAttribute("data-dam-name");
      ["srcset", "data-srcset", "data-src", "data-sizes", "sizes"].forEach((a) => img.removeAttribute(a));
    });
    root.querySelectorAll("source[srcset]").forEach((el) => {
      const best = bestAudiComUrl({ getAttribute: (a) => a === "srcset" ? el.getAttribute("srcset") : "" });
      if (best) el.setAttribute("srcset", best);
    });
  }
  function toNamedDamPath(img, assets) {
    const name = img.getAttribute("data-dam-name");
    if (!name) return null;
    img.removeAttribute("data-dam-name");
    const src = (img.getAttribute("src") || "").trim();
    if (!/^https?:/i.test(src)) return null;
    const ext = (src.split("?")[0].match(/\.(png|jpe?g|webp|gif|svg)$/i) || [null, "png"])[1].toLowerCase();
    const safe = name.split("/").map((part) => part.replace(/[^A-Za-z0-9._-]+/g, "-")).join("/");
    const key = damKey(`${safe}.${ext}`);
    assets[key] = src;
    return `${DAM_FOLDER}/${key}`;
  }
  function rewrite(root, document, origin) {
    const report = document.excatCleanupReport || {};
    const assets = report.damAssets || {};
    resolveAudiComImages(root);
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
    if (opts.audiCom) {
      root.querySelectorAll("video[poster]").forEach((el) => {
        const dam = toAudiComDamPath(el.getAttribute("poster"), assets);
        if (dam) el.setAttribute("poster", dam);
      });
    }
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!DAM_ASSET_RE.test(href) && !VIDEO_EXT_RE.test(href)) return;
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
    let host = "";
    try {
      const u = new URL(payload.params.originalURL);
      origin = u.origin;
      host = u.hostname;
    } catch (e) {
    }
    const p = payload || {};
    const folder = String(p.damFolder || p.params && p.params.damFolder || p.template && p.template.damFolder || "").replace(/^\/+|\/+$/g, "").split("/").map((part) => part.replace(/[^A-Za-z0-9._-]+/g, "-")).filter((part) => part && !/^\.+$/.test(part)).join("/");
    opts = { folder, audiCom: !!folder || /(^|\.)audi\.com$/i.test(host) };
    rewrite(element, document, origin);
  }

  // tools/importer/transformers/audicom-page-links.js
  var SOURCE_ORIGIN2 = "https://www.audi.com";
  var AUDI_COM_HOST_RE2 = /^(?:www\.)?audi\.com$/i;
  var AUDICOM_PAGE_LINKS = {
    "/en/audi-q5-59": "/master/en/audi-q5-59",
    "/en/audi-q5-suv-12871": "/master/en/audi-q5-59/audi-q5-suv-12871",
    "/en/audi-q5-sportback-13207": "/master/en/audi-q5-59/audi-q5-sportback-13207",
    "/en/audi-q5-suv-e-hybrid-quattro-16677": "/master/en/audi-q5-59/audi-q5-suv-e-hybrid-quattro-16677",
    "/en/audi-q5-sportback-e-hybrid-quattro-16678": "/master/en/audi-q5-59/audi-q5-sportback-e-hybrid-quattro-16678",
    "/en/audi-sq5-suv-11326": "/master/en/audi-q5-59/audi-sq5-suv-11326",
    "/en/audi-sq5-sportback-13378": "/master/en/audi-q5-59/audi-sq5-sportback-13378"
  };
  function localPagePath(urlOrPath) {
    let u;
    try {
      u = new URL(urlOrPath, SOURCE_ORIGIN2);
    } catch (e) {
      return null;
    }
    if (!AUDI_COM_HOST_RE2.test(u.hostname)) return null;
    const p = u.pathname.replace(/\/+$/, "") || "/";
    return Object.prototype.hasOwnProperty.call(AUDICOM_PAGE_LINKS, p) ? AUDICOM_PAGE_LINKS[p] : null;
  }
  function pageOrigin(payload) {
    try {
      const u = new URL(payload && payload.params && payload.params.originalURL);
      if (u.origin && u.origin !== "null") return u.origin;
    } catch (e) {
    }
    return SOURCE_ORIGIN2;
  }
  function transform4(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const document = payload && payload.document || element.ownerDocument;
    const origin = pageOrigin(payload);
    let count = 0;
    element.querySelectorAll("a[href]").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!/^https?:\/\//i.test(href) && !(href.startsWith("/") && !href.startsWith("//"))) return;
      let u;
      try {
        u = new URL(href, origin);
      } catch (e) {
        return;
      }
      const local = localPagePath(u.href);
      if (!local) return;
      a.setAttribute("href", `${SOURCE_ORIGIN2}${local}${u.search}${u.hash}`);
      count += 1;
    });
    if (document) {
      const report = document.excatCleanupReport || {};
      document.excatCleanupReport = __spreadProps(__spreadValues({}, report), { audicomPageLinks: (report.audicomPageLinks || 0) + count });
    }
  }
  transform4.pageLinks = AUDICOM_PAGE_LINKS;
  transform4.localPagePath = localPagePath;

  // tools/importer/import-audi-q5-59.js
  var PAGE_TEMPLATE = {
    "name": "audi-q5-59",
    "urls": [
      "https://www.audi.com/en/audi-q5-59"
    ],
    "representativeUrl": "https://www.audi.com/en/audi-q5-59",
    "description": "audi.com model page (EN, dark): H1 intro, model line-up tiles, external teaser panel, media-release slider, related article and media-set lists, registration panel, media contacts",
    "blocks": [
      {
        "name": "cards-model",
        "instances": [
          ".page-item--cars-overview .cars-overview-list"
        ]
      },
      {
        "name": "carousel-cards",
        "instances": [
          ".page-list.-teaser > .page-list--items"
        ]
      },
      {
        "name": "cards-list",
        "instances": [
          ".page-list.-detailed > .page-list--items"
        ]
      },
      {
        "name": "columns-panels",
        "instances": [
          ".page-item--contacts .media-contacts"
        ]
      }
    ],
    "urlPattern": "/en/*",
    "sections": [
      {
        "id": "section-1",
        "name": "Intro (H1 + lead paragraph)",
        "selector": [
          ".main-content > .page-row:has(.page-item--headline)"
        ],
        "style": "centered",
        "blocks": [],
        "defaultContent": [
          ".page-item--headline h1",
          ".page-item--intro"
        ]
      },
      {
        "id": "section-2",
        "name": "Model line-up (6 car tiles)",
        "selector": [
          ".main-content > .page-row:has(.full-width-section.is-gray)"
        ],
        "style": "grey",
        "blocks": [
          "cards-model"
        ],
        "defaultContent": []
      },
      {
        "id": "section-3",
        "name": "Audi models worldwide teaser",
        "selector": [
          ".main-content > .page-row:has(.full-width-section.is-card)"
        ],
        "style": "grey-panel",
        "blocks": [],
        "defaultContent": [
          ".page-item--external-page"
        ]
      },
      {
        "id": "section-4",
        "name": "Media releases carousel",
        "selector": [
          ".main-content > .page-row:has(.page-list.-teaser)"
        ],
        "style": null,
        "blocks": [
          "carousel-cards"
        ],
        "defaultContent": [
          ".page-list.-teaser > .page-list--title"
        ]
      },
      {
        "id": "section-5",
        "name": "You might also be interested in",
        "selector": [
          ".main-content > .page-row:has(.page-list.-detailed)"
        ],
        "style": null,
        "blocks": [
          "cards-list"
        ],
        "defaultContent": [
          ".page-list.-detailed > .page-list--title"
        ]
      },
      {
        "id": "section-6",
        "name": "Media set",
        "selector": [
          ".main-content > .page-row:has(.page-list.-detailed) ~ .page-row:has(.page-list.-detailed)"
        ],
        "style": null,
        "blocks": [
          "cards-list"
        ],
        "defaultContent": [
          ".page-list.-detailed > .page-list--title"
        ]
      },
      {
        "id": "section-7",
        "name": "Newsletter / accreditation registration",
        "selector": [
          ".bottom-content > .page-row:has(.page-item--registration)"
        ],
        "style": "grey-panel",
        "blocks": [],
        "defaultContent": [
          ".page-item--registration"
        ]
      },
      {
        "id": "section-8",
        "name": "Media contacts / customer service",
        "selector": [
          ".bottom-content > .page-row:has(.page-item--contacts)"
        ],
        "style": null,
        "blocks": [
          "columns-panels"
        ],
        "defaultContent": []
      }
    ]
  };
  var DAM_FOLDER2 = "q5";
  var parsers = {
    "cards-model": parse,
    "carousel-cards": parse2,
    "cards-list": parse3,
    "columns-panels": parse4
  };
  var transformers = [transform, transform2, transform4];
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
  var import_audi_q5_59_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
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
        transform3("afterTransform", main, __spreadProps(__spreadValues({}, payload), {
          template: PAGE_TEMPLATE,
          damFolder: DAM_FOLDER2
        }));
      } catch (e) {
        console.error("DAM asset transformer failed:", e);
      }
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(`/master${rawPath === "" ? "/index" : rawPath}`);
      const cleanupReport = document.excatCleanupReport || {};
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: [...new Set(pageBlocks.map((b) => b.name))],
          audicomChromeRemoved: cleanupReport.audicomChromeRemoved || 0,
          audicomPageLinks: cleanupReport.audicomPageLinks || 0,
          damAssets: JSON.stringify(cleanupReport.damAssets || {})
        }
      }];
    }
  };
  return __toCommonJS(import_audi_q5_59_exports);
})();
