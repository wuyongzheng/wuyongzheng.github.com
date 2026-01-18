const STATUS = document.getElementById("status");
const SEARCH = document.getElementById("search");
const RESULTS = document.getElementById("results");
const SELECTED = document.getElementById("selected");
const TREE = document.getElementById("tree");
const TAX_LINK = document.getElementById("tax-link");
const PAGE_LINK = document.getElementById("page-link");
const LANGUAGE_LABEL = document.getElementById("language");
const COPY_LINK = document.getElementById("copy-link");

const CONFIG = window.APP_CONFIG || {};
const WIKI_PAGE = CONFIG.WIKI_PAGE || "https://en.wikipedia.org/wiki/";
const WIKI_FILE = CONFIG.WIKI_FILE || "https://en.wikipedia.org/wiki/Special:FilePath/";
const TAX_TSV = CONFIG.TAX_TSV || "tax-en.tsv";
const PAGE_TSV = CONFIG.PAGE_TSV || "page-en.tsv";
const LANGUAGE = CONFIG.LANGUAGE || "English";
const TAX_TSV_GZ = `${TAX_TSV}.gz`;
const PAGE_TSV_GZ = `${PAGE_TSV}.gz`;
const SEARCH_LENGTH_WEIGHT = 1;
const SEARCH_REDIR_WEIGHT = 1000;
const IMAGE_WIDTH = 250;
const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
      <defs>
        <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stop-color='#d6e7c8'/>
          <stop offset='100%' stop-color='#f1e1cf'/>
        </linearGradient>
      </defs>
      <rect width='200' height='200' rx='32' fill='url(#g)'/>
      <path d='M100 40c25 28 40 47 40 70 0 30-20 50-40 50s-40-20-40-50c0-23 15-42 40-70z' fill='#3f7b5a' opacity='0.85'/>
    </svg>`
  );

const state = {
  taxByName: new Map(),
  pageByName: new Map(),
  searchIndex: [],
  selected: new Set(),
  ready: false,
};

function getSelectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("pages");
  if (!raw) return [];
  return decodePlantList(raw);
}

function encodePlantName(name) {
  return name.replace(/~/g, "~~").replace(/_/g, "~_");
}

function decodePlantList(value) {
  const plants = [];
  let current = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "_") {
      if (current) plants.push(current);
      current = "";
      continue;
    }
    if (char === "~") {
      const next = value[i + 1];
      if (next === "_" || next === "~") {
        current += next;
        i += 1;
        continue;
      }
    }
    current += char;
  }
  if (current) plants.push(current);
  return plants;
}

function syncUrlFromSelection() {
  const params = new URLSearchParams(window.location.search);
  const names = [...state.selected];
  if (!names.length) {
    params.delete("pages");
  } else {
    const encoded = names.map(encodePlantName).join("_");
    params.set("pages", encoded);
  }
  const query = params.toString();
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, "", next);
}

async function copyShareLink() {
  const url = window.location.href;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return true;
  }
  window.prompt("Copy share link:", url);
  return false;
}

function parseTSV(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split("\t"));
}

function normalizeField(value) {
  if (value === "-") return "";
  return value ?? "";
}

function supportsDecompression(format) {
  if (typeof DecompressionStream === "undefined") return false;
  try {
    new DecompressionStream(format);
    return true;
  } catch (error) {
    return false;
  }
}

async function fetchCompressedText(gzPath, rawPath) {
  if (supportsDecompression("gzip")) {
    const response = await fetch(gzPath);
    if (response.ok) {
      const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
      return new Response(stream).text();
    }
  }

  const fallback = await fetch(rawPath);
  if (!fallback.ok) {
    throw new Error(`Failed to fetch ${gzPath} or ${rawPath}`);
  }
  return fallback.text();
}

async function loadData() {
  const [taxText, pageText] = await Promise.all([
    fetchCompressedText(TAX_TSV_GZ, TAX_TSV),
    fetchCompressedText(PAGE_TSV_GZ, PAGE_TSV),
  ]);

  parseTSV(taxText).forEach(([name, parent, rank, page]) => {
    name = normalizeField(name);
    parent = normalizeField(parent);
    rank = normalizeField(rank);
    page = normalizeField(page);
    if (!name) return;
    const alwaysDisplay = rank?.endsWith("!") || false;
    const cleanRank = alwaysDisplay ? rank.slice(0, -1) : rank || "";
    state.taxByName.set(name, {
      name,
      parent: parent || null,
      rank: cleanRank,
      alwaysDisplay,
      page: page || name,
    });
  });

  parseTSV(pageText).forEach((fields) => {
    if (!fields.length) return;
    const [name, length, taxonomy, image, ...redir] = fields.map(normalizeField);
    if (!name) return;
    const entry = {
      name,
      length: Number(length) || 0,
      taxonomy: taxonomy || "",
      image: image || "",
      redir: redir.filter(Boolean),
    };
    const score =
      entry.length * SEARCH_LENGTH_WEIGHT +
      entry.redir.length * SEARCH_REDIR_WEIGHT;
    state.pageByName.set(name, entry);
    state.searchIndex.push({
      name,
      length: entry.length,
      score,
      keys: [name, ...entry.redir].map((key) => key.toLowerCase()),
    });
  });

  state.searchIndex.sort((a, b) => b.score - a.score);
  state.ready = true;
}

function pickDefaultLeaves() {
  const top = state.searchIndex.slice(0, 400);
  const picks = new Set();
  while (picks.size < 4 && picks.size < top.length) {
    const choice = top[Math.floor(Math.random() * top.length)];
    picks.add(choice.name);
  }
  picks.forEach((name) => state.selected.add(name));
}

function getAncestors(taxName) {
  const path = [];
  let current = taxName;
  while (current) {
    path.push(current);
    const node = state.taxByName.get(current);
    current = node?.parent || null;
  }
  return path;
}

function findLCA(taxNames) {
  if (!taxNames.length) return null;
  const ancestorSets = taxNames.map((name) => new Set(getAncestors(name)));
  const firstPath = getAncestors(taxNames[0]);
  return firstPath.find((name) => ancestorSets.every((set) => set.has(name))) || null;
}

function buildTree() {
  const selectedPages = [...state.selected]
    .map((name) => state.pageByName.get(name))
    .filter(Boolean);

  if (!selectedPages.length) {
    return null;
  }

  const taxNames = selectedPages.map((page) => page.taxonomy).filter(Boolean);
  const rootName = findLCA(taxNames);
  if (!rootName) return null;

  const nodes = new Map();
  function ensureTaxNode(name) {
    if (nodes.has(name)) return nodes.get(name);
    const info = state.taxByName.get(name);
    const pageInfo = info?.page ? state.pageByName.get(info.page) : null;
    const displayName = pageInfo?.name || info?.page || name;
    const node = {
      id: `tax-${name}`,
      name: displayName,
      rawName: name,
      rank: info?.rank || "",
      alwaysDisplay: info?.alwaysDisplay || false,
      type: "tax",
      image: pageInfo?.image || "",
      url: `${WIKI_PAGE}${encodeURIComponent(displayName)}`,
      children: [],
    };
    nodes.set(name, node);
    return node;
  }

  const root = ensureTaxNode(rootName);

  selectedPages.forEach((page) => {
    const path = getAncestors(page.taxonomy);
    const trimmed = path.slice(0, path.indexOf(rootName) + 1).reverse();
    for (let i = 0; i < trimmed.length - 1; i += 1) {
      const parent = ensureTaxNode(trimmed[i]);
      const child = ensureTaxNode(trimmed[i + 1]);
      if (!parent.children.includes(child)) {
        parent.children.push(child);
      }
    }
  });

  selectedPages.forEach((page) => {
    const taxNode = ensureTaxNode(page.taxonomy);
    const leafId = `page-${page.name}`;
    const leafNode = {
      id: leafId,
      name: page.name,
      rawName: page.name,
      rank: "",
      type: "leaf",
      image: page.image,
      url: `${WIKI_PAGE}${encodeURIComponent(page.name)}`,
      children: [],
    };
    taxNode.children.push(leafNode);
  });

  return pruneTree(root);
}

function pruneTree(node) {
  if (!node) return node;
  if (!node.children?.length) return node;

  node.children = node.children.map((child) => pruneTree(child)).filter(Boolean);

  if (
    node.type === "tax" &&
    !node.alwaysDisplay &&
    !node.image &&
    node.children.length === 1
  ) {
    return node.children[0];
  }

  return node;
}

function layoutTree(root) {
  let nextX = 0;
  const nodes = [];

  function walk(node, depth) {
    if (!node.children.length) {
      node.x = nextX;
      nextX += 1;
    } else {
      node.children.forEach((child) => walk(child, depth + 1));
      const avg =
        node.children.reduce((sum, child) => sum + child.x, 0) /
        node.children.length;
      node.x = avg;
    }
    node.y = depth;
    nodes.push(node);
  }

  walk(root, 0);
  return nodes;
}

function renderTree(root) {
  TREE.innerHTML = "";
  if (!root) {
    TREE.innerHTML = "<p class='muted'>Add plants to see a taxonomy tree.</p>";
    return;
  }

  const nodes = layoutTree(root);
  const maxX = Math.max(...nodes.map((node) => node.x));
  const maxY = Math.max(...nodes.map((node) => node.y));
  const gapX = 190;
  const gapY = 150;
  const padding = 120;
  const width = Math.max(700, (maxX + 1) * gapX + padding * 2);
  const height = Math.max(500, (maxY + 1) * gapY + padding * 2);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);

  nodes.forEach((node) => {
    node.px = node.x * gapX + padding;
    node.py = node.y * gapY + padding;
  });

  nodes.forEach((node) => {
    node.children.forEach((child) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", node.px);
      line.setAttribute("y1", node.py + 50);
      line.setAttribute("x2", child.px);
      line.setAttribute("y2", child.py - 50);
      line.setAttribute("class", "link");
      svg.appendChild(line);
    });
  });

  TREE.appendChild(svg);

  nodes.forEach((node) => {
    const wrapper = document.createElement("div");
    wrapper.className = `node ${node.type}`;
    wrapper.style.left = `${node.px}px`;
    wrapper.style.top = `${node.py}px`;

    const anchor = document.createElement("a");
    anchor.href = node.url;
    anchor.target = "_blank";
    anchor.rel = "noopener";

    const thumb = document.createElement("div");
    thumb.className = "thumb";

    const img = document.createElement("img");
    if (node.image) {
      img.src = `${WIKI_FILE}${encodeURIComponent(node.image)}?width=${IMAGE_WIDTH}`;
    } else {
      img.src = FALLBACK_IMAGE;
    }
    img.alt = node.name;

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = node.name;

    thumb.appendChild(img);
    anchor.appendChild(thumb);
    anchor.appendChild(label);
    wrapper.appendChild(anchor);
    TREE.appendChild(wrapper);
  });

  TREE.style.minWidth = `${width}px`;
  TREE.style.minHeight = `${height}px`;
}

function renderSelected() {
  SELECTED.innerHTML = "";
  if (!state.selected.size) {
    SELECTED.innerHTML = "<p class='muted'>No leaves selected.</p>";
    return;
  }

  [...state.selected].forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.title = "Remove from tree";
    button.addEventListener("click", () => {
      state.selected.delete(name);
      renderAll();
    });
    SELECTED.appendChild(button);
  });
}

function renderResults(query) {
  RESULTS.innerHTML = "";
  if (!query) return;

  const q = query.toLowerCase();
  const matches = [];
  for (const entry of state.searchIndex) {
    if (entry.keys.some((key) => key.includes(q))) {
      matches.push(entry);
    }
    if (matches.length >= 30) break;
  }

  matches.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = entry.name;
    button.addEventListener("click", () => {
      state.selected.add(entry.name);
      SEARCH.value = "";
      RESULTS.innerHTML = "";
      renderAll();
    });
    RESULTS.appendChild(button);
  });
}

function renderAll() {
  renderSelected();
  const root = buildTree();
  renderTree(root);
  syncUrlFromSelection();
}

function setupSearch() {
  let debounceTimer = null;
  SEARCH.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderResults(value), 120);
  });
}

async function init() {
  try {
    const preferredExtension = supportsDecompression("gzip") ? "gz" : "tsv";
    if (TAX_LINK) {
      TAX_LINK.href =
        preferredExtension === "gz"
          ? TAX_TSV_GZ
          : TAX_TSV;
      TAX_LINK.textContent =
        preferredExtension === "gz"
          ? TAX_TSV_GZ
          : TAX_TSV;
    }
    if (PAGE_LINK) {
      PAGE_LINK.href =
        preferredExtension === "gz"
          ? PAGE_TSV_GZ
          : PAGE_TSV;
      PAGE_LINK.textContent =
        preferredExtension === "gz"
          ? PAGE_TSV_GZ
          : PAGE_TSV;
    }
    if (LANGUAGE_LABEL) {
      LANGUAGE_LABEL.textContent = LANGUAGE;
    }
    if (COPY_LINK) {
      COPY_LINK.addEventListener("click", async () => {
        const ok = await copyShareLink();
        if (ok) {
          COPY_LINK.textContent = "Copied!";
          setTimeout(() => {
            COPY_LINK.textContent = "Copy share link";
          }, 1200);
        }
      });
    }

    await loadData();
    const fromUrl = getSelectionFromUrl();
    if (fromUrl.length) {
      fromUrl.forEach((name) => {
        if (state.pageByName.has(name)) {
          state.selected.add(name);
        }
      });
    } else {
      pickDefaultLeaves();
    }
    renderAll();
    setupSearch();
    STATUS.textContent = `Loaded ${state.taxByName.size} taxonomy nodes and ${state.pageByName.size} plant pages.`;
  } catch (error) {
    console.error(error);
    STATUS.textContent = `Failed to load ${TAX_TSV_BR} or ${PAGE_TSV_BR}.`;
  }
}

init();
