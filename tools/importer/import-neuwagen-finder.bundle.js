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

  // tools/importer/import-neuwagen-finder.js
  var import_neuwagen_finder_exports = {};
  __export(import_neuwagen_finder_exports, {
    default: () => import_neuwagen_finder_default
  });

  // tools/importer/parsers/model-filter.js
  var ORIGIN = "https://www.audi.de";
  var SECTION_SEL = '[class*="styles__FilterSection"]';
  var VTP_SEL = '[class*="VtpLinks__VtpLinksWrapper"]';
  var DEFAULT_LINKS = [
    { text: "Zur Neuwagenb\xF6rse", href: `${ORIGIN}/de/neuwagenboerse/` },
    { text: "Zur Gebrauchtwagenb\xF6rse", href: `${ORIGIN}/de/gebrauchtwagenboerse/` }
  ];
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function hinted(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function absolutize(href) {
    const h = (href || "").trim();
    if (!h) return "";
    if (/^https?:\/\//i.test(h)) return h;
    if (h.startsWith("//")) return `https:${h}`;
    if (h.startsWith("/")) return `${ORIGIN}${h}`;
    return h;
  }
  function getPills(group) {
    const names = [...group.querySelectorAll(".name")];
    if (names.length) {
      return names.map((name) => {
        let pill = name.parentElement;
        while (pill && pill !== group && !pill.querySelector("input") && pill.tagName !== "LABEL") {
          pill = pill.parentElement;
        }
        return { el: pill && pill !== group ? pill : name, name };
      });
    }
    return [...group.querySelectorAll("label")].map((el) => ({ el, name: el }));
  }
  function pillLabel(pill) {
    return cleanText(pill.name.textContent);
  }
  function isElectricPill(pill, label) {
    const { el } = pill;
    return !!el.querySelector('use[href*="charging"], [href*="charging"]') || el.querySelector("input") && el.querySelector("input").value === "BEV" || /^Elektromodelle$/i.test(label);
  }
  function buildGroup(group, document) {
    const legend = group.querySelector("legend");
    const label = cleanText(legend ? legend.textContent : "");
    const ul = document.createElement("ul");
    getPills(group).forEach((pill) => {
      const text = pillLabel(pill);
      if (!text) return;
      const li = document.createElement("li");
      li.textContent = isElectricPill(pill, text) ? `:charging: ${text}` : text;
      ul.appendChild(li);
    });
    if (!label && !ul.children.length) return null;
    const labelCell = label ? hinted(document, "label", [document.createTextNode(label)]) : "";
    const buttonsCell = ul.children.length ? hinted(document, "buttons", [ul]) : "";
    return [labelCell, buttonsCell];
  }
  function findVtpLinks(element) {
    const parent = element.parentElement;
    if (parent) {
      const sibling = [...parent.children].find((c) => c !== element && c.matches(VTP_SEL));
      if (sibling) return sibling;
    }
    return element.querySelector(VTP_SEL);
  }
  function buildLinks(element, document) {
    const vtp = findVtpLinks(element);
    let links = DEFAULT_LINKS;
    if (vtp) {
      const found = [...vtp.querySelectorAll("a[href]")].map((a) => ({ text: cleanText(a.textContent), href: absolutize(a.getAttribute("href")) })).filter((l) => l.text && l.href);
      if (found.length) links = found;
      vtp.remove();
    }
    const paras = links.map((l) => {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.setAttribute("href", l.href);
      a.textContent = l.text;
      p.appendChild(a);
      return p;
    });
    return ["", hinted(document, "buttons", paras)];
  }
  function parse(element, { document }) {
    let groups = [...element.querySelectorAll(SECTION_SEL)].filter((s, i, all) => !all.some((o) => o !== s && o.contains(s)));
    if (!groups.length) groups = [...element.querySelectorAll("fieldset")];
    const cells = [];
    groups.forEach((group) => {
      const row = buildGroup(group, document);
      if (row) cells.push(row);
    });
    cells.push(buildLinks(element, document));
    const block = WebImporter.Blocks.createBlock(document, { name: "model-filter", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/model-filter-fragment.js
  var FRAGMENT_PATH = "/language-masters/de/neuwagen/fragments/model-filter";
  var FRAGMENT_URL = `https://www.audi.de${FRAGMENT_PATH}`;
  var VTP_SEL2 = '[class*="VtpLinks__VtpLinksWrapper"]';
  function parse2(element, { document }) {
    const parent = element.parentElement;
    if (parent) {
      [...parent.children].filter((c) => c !== element && c.matches(VTP_SEL2)).forEach((c) => c.remove());
    }
    const p = document.createElement("p");
    const a = document.createElement("a");
    a.setAttribute("href", FRAGMENT_URL);
    a.textContent = FRAGMENT_PATH;
    p.appendChild(a);
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(" field:reference "));
    frag.appendChild(p);
    const cells = [[frag]];
    const block = WebImporter.Blocks.createBlock(document, { name: "fragment", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-carline.js
  var ORIGIN2 = "https://www.audi.de";
  var CONTENT_ROOT = "/language-masters/de/neuwagen";
  var CARLINE_GROUPS = {
    "Audi A2 e-tron": "a2etron",
    "Audi A3": "a3",
    "Audi A5": "a5",
    "Audi A6": "a6",
    "Audi A6 e-tron": "a6etron",
    "Audi Q3": "q3",
    "Audi Q4 e-tron": "q4",
    "Audi Q5": "q5",
    "Audi Q6 e-tron": "q6",
    "Audi Q7": "q7",
    "Audi Q8": "q8",
    "Audi Q9": "q9",
    "Audi e-tron GT": "etrongt",
    "Audi Nuvolari": "nuvolari",
    "Audi F1": "f1"
  };
  var PAGE_NAMES = {
    a2etron: "a2-e-tron"
  };
  function carlinePageName(value) {
    return PAGE_NAMES[value] || value;
  }
  function cleanText2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function slugify(text) {
    return cleanText2(text).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function hinted2(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function imageUrl(img) {
    const src = (img.getAttribute("src") || "").trim();
    if (/^https?:\/\//i.test(src) && !/placeholder/i.test(src)) return src;
    const candidates = (img.getAttribute("srcset") || "").split(/,\s+/).map((s) => s.trim().split(/\s+/)).filter(([u]) => /^https?:\/\//i.test(u || "")).map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 })).sort((a, b) => b.w - a.w);
    if (candidates.length) return candidates[0].u.split("?")[0];
    return "";
  }
  function getCards(element) {
    let cards = [...element.querySelectorAll('button[data-testid^="cargroupCard-"]')];
    if (!cards.length) cards = [...element.querySelectorAll('[data-testid^="cargroupCard-"]')];
    if (!cards.length) cards = [...element.querySelectorAll(":scope > button, :scope > a, :scope > div")];
    return cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)));
  }
  function buildCard(card, document) {
    const header = card.querySelector('[class*="CargroupCard_alpha__HeaderRow"]');
    const bottom = card.querySelector('[class*="CargroupCard_alpha__BottomRow"]');
    const paras = [...card.querySelectorAll("p")];
    const titleEl = header && header.querySelector("p, h2, h3, h4") || paras[0];
    const countEl = bottom && bottom.querySelector("p") || (paras.length > 1 ? paras[paras.length - 1] : null);
    const srcImg = card.querySelector('[class*="CardImage__Wrapper"] img') || card.querySelector("img");
    const title = cleanText2(titleEl ? titleEl.textContent : "") || cleanText2(srcImg ? srcImg.getAttribute("alt") : "");
    const count = cleanText2(countEl ? countEl.textContent : "");
    const testId = (card.getAttribute("data-testid") || "").replace(/^cargroupCard-/, "");
    const value = CARLINE_GROUPS[title] || testId;
    let imageCell = "";
    const url = srcImg ? imageUrl(srcImg) : "";
    if (url) {
      const img = document.createElement("img");
      img.setAttribute("src", url);
      img.setAttribute("alt", cleanText2(srcImg.getAttribute("alt")) || title);
      const slug = slugify(title || srcImg.getAttribute("alt"));
      if (slug) img.setAttribute("data-dam-name", `cards/${slug}`);
      imageCell = hinted2(document, "image", [img]);
    }
    const textNodes = [];
    if (title) {
      const h2 = document.createElement("h2");
      h2.textContent = title;
      textNodes.push(h2);
    }
    if (count) {
      const p = document.createElement("p");
      if (value) {
        const a = document.createElement("a");
        a.setAttribute("href", `${ORIGIN2}${CONTENT_ROOT}/${carlinePageName(value)}`);
        a.textContent = count;
        p.appendChild(a);
      } else {
        p.textContent = count;
      }
      textNodes.push(p);
    }
    const textCell = textNodes.length ? hinted2(document, "text", textNodes) : "";
    const electric = !!card.querySelector('use[href*="charging"], [data-testid="frostyBadge"]');
    const electricCell = hinted2(document, "electric", [document.createTextNode(electric ? "true" : "false")]);
    if (!imageCell && !textCell) return null;
    return [imageCell, textCell, electricCell];
  }
  function parse3(element, { document }) {
    const cells = [];
    getCards(element).forEach((card) => {
      const row = buildCard(card, document);
      if (row) cells.push(row);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-carline", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-model.js
  var ORIGIN3 = "https://www.audi.de";
  function cleanText3(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function slugify2(text) {
    return cleanText3(text).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
    if (/^https?:\/\//i.test(h)) return h;
    if (h.startsWith("//")) return `https:${h}`;
    if (h.startsWith("/")) return `${ORIGIN3}${h}`;
    return h;
  }
  function imageUrl2(img) {
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
        const t = cleanText3(node.textContent);
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
  function getCards2(element) {
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
  function buildCard2(card, document) {
    const titleEl = card.querySelector('h2, h3, [class*="CarlineCard__Title"]');
    const title = cleanText3(titleEl ? titleEl.textContent : "");
    const srcImg = card.querySelector('[class*="CardImage"] img') || card.querySelector("img");
    let imageCell = "";
    const url = srcImg ? imageUrl2(srcImg) : "";
    if (url) {
      const img = document.createElement("img");
      img.setAttribute("src", url);
      const alt = cleanText3(srcImg.getAttribute("alt")) || title;
      img.setAttribute("alt", alt);
      const slug = slugify2(title || alt);
      if (slug) img.setAttribute("data-dam-name", `cards/${slug}`);
      imageCell = hinted3(document, "image", [img]);
    }
    const textNodes = [];
    const badges = [...card.querySelectorAll('[data-testid="frostyBadge"]')].map((b) => cleanText3(b.textContent)).filter(Boolean);
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
      if (cleanText3(p.textContent)) textNodes.push(p);
    }
    const primary = card.querySelector('a[data-testid="primaryCta"][href]');
    if (primary && absolutize2(primary.getAttribute("href"))) {
      textNodes.push(linkPara(document, absolutize2(primary.getAttribute("href")), cleanText3(primary.textContent) || "Konfigurieren", "strong"));
    }
    const secondary = card.querySelector('a[data-testid="secondaryCta"][href]');
    if (secondary && absolutize2(secondary.getAttribute("href"))) {
      textNodes.push(linkPara(document, absolutize2(secondary.getAttribute("href")), cleanText3(secondary.textContent) || "Entdecken", "em"));
    }
    ["newCarsVtpLink", "usedCarsVtpLink"].forEach((id) => {
      const a = card.querySelector(`a[data-testid="${id}"][href]`);
      const href = a ? absolutize2(a.getAttribute("href")) : "";
      if (!href) return;
      const text = cleanText3(a.textContent).replace(/\s*\(\s*\d[\d.]*\s*\)\s*$/, "");
      if (text) textNodes.push(linkPara(document, href, text));
    });
    const textCell = textNodes.length ? hinted3(document, "text", textNodes) : "";
    let consumptionCell = "";
    const caeEls = [...card.querySelectorAll('[data-testid="cae"]')];
    const caeParas = (caeEls.length ? caeEls : [...card.querySelectorAll('[class*="CarlineCard__DisclaimerWrapper"] p')]).map((el) => trimEdges(appendInline(el, document.createElement("p"), document))).filter((p) => cleanText3(p.textContent));
    if (caeParas.length) consumptionCell = hinted3(document, "consumption", caeParas);
    if (!imageCell && !textCell && !consumptionCell) return null;
    return [imageCell, textCell, consumptionCell];
  }
  function parse4(element, { document }) {
    const cells = [];
    getCards2(element).forEach((card) => {
      const row = buildCard2(card, document);
      if (row) cells.push(row);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-model", cells });
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
  var CONTENT_ROOT2 = "/language-masters";
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
        a.setAttribute("href", `${SOURCE_ORIGIN}${CONTENT_ROOT2}${url.pathname}${url.search}${url.hash}`);
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

  // tools/importer/import-neuwagen-finder.js
  var PAGE_TEMPLATE = {
    "name": "neuwagen-finder",
    "urls": [
      "https://www.audi.de/de/neuwagen/",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=a2etron",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=a3",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=a5",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=a6",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=a6etron",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=q3",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=q4",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=q5",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=q6",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=q7",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=q8",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=q9",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=etrongt",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=nuvolari",
      "https://www.audi.de/de/neuwagen/?bycarlinegroup=f1"
    ],
    "representativeUrl": "https://www.audi.de/de/neuwagen/",
    "description": "Audi model finder: overview of model lines and one filtered page per model line (bycarlinegroup); shared static filter rail fragment",
    "urlPattern": "/de/neuwagen/",
    "blocks": [
      {
        "name": "fragment",
        "instances": [
          "[class*='FeatureApp__FilterWrapperDesktop']"
        ]
      },
      {
        "name": "cards-carline",
        "instances": [
          "[class*='Results__GroupCardGrid']"
        ]
      },
      {
        "name": "cards-model",
        "instances": [
          "[class*='CardList__CardListWrapper']"
        ]
      }
    ],
    "sections": [
      {
        "id": "section-1",
        "name": "Modellfinder (Filterleiste + Ergebnisse)",
        "selector": [
          "feature-app[base-url*='fa-model-selector']",
          "#main-content"
        ],
        "style": "filter-rail",
        "blocks": [
          "fragment",
          "cards-carline",
          "cards-model"
        ],
        "defaultContent": [
          "[class*='ResultCountHeader__CountWrapper']",
          "[class*='Disclaimer__StyledDisclaimer']"
        ]
      },
      {
        "id": "section-2",
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
    ],
    "carlineGroups": {
      "Audi A2 e-tron": "a2etron",
      "Audi A3": "a3",
      "Audi A5": "a5",
      "Audi A6": "a6",
      "Audi A6 e-tron": "a6etron",
      "Audi Q3": "q3",
      "Audi Q4 e-tron": "q4",
      "Audi Q5": "q5",
      "Audi Q6 e-tron": "q6",
      "Audi Q7": "q7",
      "Audi Q8": "q8",
      "Audi Q9": "q9",
      "Audi e-tron GT": "etrongt",
      "Audi Nuvolari": "nuvolari",
      "Audi F1": "f1"
    }
  };
  var parsers = {
    fragment: parse2,
    "cards-carline": parse3,
    "cards-model": parse4
  };
  var FRAGMENT_PARAM = "excat-fragment";
  var FRAGMENT_PATH2 = "/language-masters/de/neuwagen/fragments/model-filter";
  var FINDER_PATH = "/language-masters/de/neuwagen";
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
  var import_neuwagen_finder_default = {
    transform: (payload) => {
      var _a, _b;
      const { document, url, params } = payload;
      const main = document.body;
      if (isConfiguratorUrl2(params.originalURL)) {
        throw new Error(`Skipped: configurator (${params.originalURL})`);
      }
      const source = new URL(params.originalURL);
      const fragmentMode = source.searchParams.get(FRAGMENT_PARAM) === "model-filter";
      executeTransformers("beforeTransform", main, payload);
      if (fragmentMode) {
        const rail = document.querySelector(PAGE_TEMPLATE.blocks.find((b) => b.name === "fragment").instances[0]);
        if (!rail) throw new Error("filter rail not found");
        const holder = document.createElement("div");
        rail.replaceWith(holder);
        holder.append(rail);
        parse(rail, { document, url, params });
        main.replaceChildren(...holder.childNodes);
        executeTransformers("afterTransform", main, payload);
        return [{
          element: main,
          path: FRAGMENT_PATH2,
          report: { title: "model-filter fragment", template: PAGE_TEMPLATE.name, blocks: ["model-filter"], livechatWidgetsRemoved: 0, damAssets: "{}" }
        }];
      }
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
      main.querySelectorAll('a[href^="https://www.audi.de/language-masters/"]').forEach((a) => {
        const href = a.getAttribute("href");
        const [path2, rest = ""] = href.split(/(?=[?#])/);
        if (path2.length > "https://www.audi.de/".length && path2.endsWith("/")) a.setAttribute("href", path2.replace(/\/+$/, "") + rest);
      });
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      try {
        transform3("afterTransform", main, __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE }));
      } catch (e) {
        console.error("DAM asset transformer failed:", e);
      }
      const group = (source.searchParams.get("bycarlinegroup") || "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
      const path = WebImporter.FileUtils.sanitizePath(group ? `${FINDER_PATH}/${carlinePageName(group)}` : FINDER_PATH);
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
  return __toCommonJS(import_neuwagen_finder_exports);
})();
