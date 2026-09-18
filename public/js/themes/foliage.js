// Elementi decorativi del tema "foliage" (foglie cadenti).
// Caricato dinamicamente da /js/theme.js solo quando questo tema è attivo.
(function () {
  const LEAF_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5 3 9 7 9 12a9 9 0 0 1-18 0c0-5 4-9 9-12z"/></svg>';

  const LEAF_COLORS = [
    "#c9622a", "#a83f1e", "#c98a2c", "#8a3d15", "#d9a13a",
    "#b5541f", "#7a6a1f", "#96631c", "#e0a24a", "#9c4a1a",
    "#e3b23a", "#d1451f", "#8f6b1e", "#c7742a", "#a5711f",
    "#e8c158", "#7d8a3a", "#b03a2a", "#6f5a17", "#f0a93a",
  ];

  const LEAF_COUNT = 24;

  function injectLeaves() {
    if (document.querySelector(".leaves-layer")) return;

    const layer = document.createElement("div");
    layer.className = "leaves-layer";
    document.body.prepend(layer);

    for (let i = 0; i < LEAF_COUNT; i++) {
      layer.appendChild(createFallingLeaf(i));
    }
  }

  function createFallingLeaf(i) {
    const leaf = document.createElement("div");
    leaf.className = "leaf";

    const sway = document.createElement("div");
    sway.className = "leaf-sway";
    sway.innerHTML = LEAF_SVG;
    leaf.appendChild(sway);

    const size = 13 + Math.round(Math.random() * 15);
    const left = Math.random() * 100;
    const duration = 9 + Math.random() * 15;
    const delay = -Math.random() * 24;
    const drift = Math.round((Math.random() - 0.5) * 170) + "px";
    const rotStart = Math.round(Math.random() * 360);
    const rotEnd = rotStart + (Math.random() > 0.5 ? 1 : -1) * (260 + Math.random() * 280);
    const color = LEAF_COLORS[i % LEAF_COLORS.length];
    const swayDuration = 2 + Math.random() * 2;
    const flip = Math.random() > 0.5 ? -1 : 1;

    leaf.style.left = left + "vw";
    leaf.style.setProperty("--leaf-size", size + "px");
    leaf.style.color = color;
    leaf.style.setProperty("--drift", drift);
    leaf.style.setProperty("--rot-start", rotStart + "deg");
    leaf.style.setProperty("--rot-end", rotEnd + "deg");
    leaf.style.setProperty("--flip", flip);
    leaf.style.animationDuration = duration + "s";
    leaf.style.animationDelay = delay + "s";
    sway.style.animationDuration = swayDuration + "s";
    sway.style.animationDelay = (delay * 0.4) + "s";

    return leaf;
  }

  if (document.body) injectLeaves();
  else document.addEventListener("DOMContentLoaded", injectLeaves);
})();
