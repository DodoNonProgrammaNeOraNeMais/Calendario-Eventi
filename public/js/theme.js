// Loader dei temi stagionali.
//
// Come funziona: in base al mese corrente sceglie (se previsto) un tema e
// carica SOLO i suoi file (css/themes/<nome>.css e, se esiste,
// js/themes/<nome>.js). Negli altri mesi non scarica né esegue nulla in più:
// zero peso extra per i temi non attivi.
//
// Per aggiungere un nuovo tema mensile:
//   1. Aggiungi una riga a SEASONAL_THEMES qui sotto (mese 0 = gennaio).
//   2. Crea /css/themes/<nome>.css con le variabili da sovrascrivere.
//   3. (Opzionale) Crea /js/themes/<nome>.js per elementi decorativi.
//
// Come testare in anticipo un tema, senza aspettare il mese giusto:
//   - Apri il sito aggiungendo ?theme=<nome> all'URL (es. ?theme=foliage).
//     La scelta resta attiva per il resto della sessione del browser
//     (sessionStorage), non serve ripetere il parametro su ogni pagina.
//   - ?theme=none forza NESSUN tema, anche se il mese corrisponderebbe.
//   - ?theme=auto torna alla scelta automatica in base alla data.
(function applySeasonalTheme() {
  const SEASONAL_THEMES = {
    9: "foliage", // ottobre (Date().getMonth() è 0-based: 9 = ottobre)
  };

  const OVERRIDE_KEY = "theme_override";

  const forced = new URLSearchParams(window.location.search).get("theme");
  if (forced === "auto") {
    sessionStorage.removeItem(OVERRIDE_KEY);
  } else if (forced) {
    sessionStorage.setItem(OVERRIDE_KEY, forced);
  }

  const override = sessionStorage.getItem(OVERRIDE_KEY);
  const themeName = override
    ? (override === "none" ? null : override)
    : SEASONAL_THEMES[new Date().getMonth()] || null;

  if (!themeName) return;

  document.documentElement.classList.add(`theme-${themeName}`);

  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = `/css/themes/${themeName}.css`;
  document.head.appendChild(cssLink);

  const script = document.createElement("script");
  script.src = `/js/themes/${themeName}.js`;
  script.onerror = () => {
    // Normale se il tema non ha elementi decorativi (nessun js/themes/<nome>.js): si ignora.
  };
  document.head.appendChild(script);
})();
