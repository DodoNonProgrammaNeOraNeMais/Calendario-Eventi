# Calendario eventi

Webapp per gestire un calendario di eventi: un admin autenticato crea eventi
(anche su più giorni) con immagine, descrizione, lista partecipanti e un
sondaggio a scadenza. Chiunque altro può solo consultare il calendario, la
vista "prossimi eventi", votare (e ritirare il voto entro la scadenza) e
condividere il link dell'evento.

Stack: **Cloudflare Pages** (sito) + **Cloudflare Pages Functions** (API) +
**Cloudflare D1** (database) + **Cloudflare R2** (immagini) + **Cloudflare
Access** (login admin). Tutto gratuito entro i limiti indicati più sotto —
l'unico eventuale costo è un dominio personalizzato, che però non è
necessario (vedi la sezione sui link).

## Struttura del progetto

```
public/                  sito statico servito da Cloudflare Pages
  index.html              calendario + vista "prossimi eventi"
  admin.html              pannello di creazione/modifica eventi
  css/
    style.css              base + layout comuni (senza temi stagionali)
    themes/
      foliage.css            tema di ottobre, caricato solo se attivo
  js/
    shared.js               funzioni condivise (date, dettaglio evento, voto)
    theme.js                 loader dei temi stagionali (sempre caricato, leggero)
    themes/
      foliage.js               foglie cadenti, caricato solo se il tema è attivo
    app.js                   logica della home pubblica
    event.js                  logica della pagina di un singolo evento
    admin.js                   logica del pannello admin

functions/                API e pagine dinamiche (Cloudflare Pages Functions)
  api/events/               elenco e dettaglio eventi (pubblico)
  api/images/[key].js        serve le immagini da R2 (pubblico)
  api/votes/index.js         vota / ritira voto (pubblico, con rate limit)
  api/admin/events/          crea / modifica / elimina evento (protetto)
  api/admin/upload.js         carica immagine su R2 (protetto, con rate limit)
  evento/[slug].js            pagina evento condivisibile con anteprima social

schema.sql                schema del database D1
wrangler.toml              configurazione di deploy
```

## 1. Prerequisiti

- Un account Cloudflare gratuito.
- Node.js installato sul computer da cui fai il deploy (serve solo per
  lanciare i comandi `wrangler`, non per l'app in sé — l'app è JavaScript
  puro, nessun passaggio di build).

## 2. Crea il database D1

```bash
npx wrangler login
npx wrangler d1 create calendario-eventi-db
```

Il comando stampa un `database_id`: copialo in `wrangler.toml` al posto di
`INCOLLA_QUI_IL_TUO_DATABASE_ID`. Poi carica lo schema:

```bash
npx wrangler d1 execute calendario-eventi-db --remote --file=schema.sql
```

## 3. Crea il bucket R2 per le immagini

```bash
npx wrangler r2 bucket create calendario-eventi-immagini
```

## 4. Pubblica il progetto su Cloudflare Pages

Il modo più semplice è collegare questa cartella a un repository Git
(GitHub/GitLab) e creare un progetto Pages da dashboard puntando al repo —
così ogni modifica futura si pubblica da sola. In alternativa, deploy diretto
da terminale:

```bash
npx wrangler pages deploy public --project-name=calendario-eventi
```

**Importante:** i collegamenti (binding) a D1 e R2 vanno anche configurati
dal dashboard del progetto Pages, non solo in `wrangler.toml`:
`Workers & Pages → il tuo progetto → Settings → Functions` → aggiungi il
binding D1 (`DB` → `calendario-eventi-db`) e il binding R2 (`IMAGES` →
`calendario-eventi-immagini`), poi ripubblica.

A questo punto il sito è online su un indirizzo tipo
`calendario-eventi.pages.dev` — puoi rinominare il progetto in fase di
creazione per scegliere un sottodominio più leggibile (es.
`eventi-associazione.pages.dev`), è gratuito.

## 5. Proteggi l'area admin con Cloudflare Access

Nessun codice da scrivere: Cloudflare fa da "buttafuori" davanti alle pagine
admin, gratis fino a 50 utenti.

1. Vai su **Zero Trust dashboard → Access → Applications → Add an
   application → Self-hosted**.
2. Crea **due** applicazioni (entrambe con la stessa policy, cioè le stesse
   email autorizzate) perché admin.html e le API admin vivono su due
   percorsi diversi:
   - App 1: dominio del progetto + percorso `/admin.html`
   - App 2: dominio del progetto + percorso `/api/admin/*`
3. Come metodo di login basta "One-time PIN via email": l'admin riceve un
   codice via email, nessuna password da gestire. Aggiungi la sua email
   nella policy "Allow".

Da quel momento, chiunque visiti `/admin.html` deve autenticarsi; il
calendario pubblico e la vista eventi restano liberamente accessibili.

## Come funziona la condivisione dei link

Ogni evento ha una pagina dedicata su `/evento/nome-evento-leggibile`
(lo slug è generato automaticamente dal titolo). Quella pagina genera i tag
Open Graph (titolo, descrizione, immagine dell'evento): quando il link viene
incollato su WhatsApp, Telegram, iMessage, ecc., l'app mostra in automatico
un'anteprima con foto e titolo, invece del solo URL grezzo. Per questo
conviene sempre caricare un'immagine quando si crea un evento.

## Temi stagionali

Ogni mese può avere un tema visivo dedicato (es. "foliage" per ottobre): CSS
e JS del tema vivono in file separati e vengono caricati **solo quando il
tema è attivo**, quindi non pesano sugli altri mesi dell'anno.

- `public/js/theme.js` — decide, in base al mese corrente, se attivare un
  tema e carica dinamicamente `css/themes/<nome>.css` e (se presente)
  `js/themes/<nome>.js`.
- `public/css/themes/<nome>.css` — variabili colore e stili decorativi
  specifici del tema.
- `public/js/themes/<nome>.js` — eventuali elementi decorativi (es. le
  foglie cadenti di ottobre). Facoltativo.

### Aggiungere un nuovo tema mensile

1. Aggiungere una riga in `SEASONAL_THEMES` dentro `public/js/theme.js`,
   es. `11: "natale"` (mese 0-based: 0 = gennaio, 11 = dicembre).
2. Creare `public/css/themes/<nome>.css` con le variabili da sovrascrivere
   sotto `html.theme-<nome>`.
3. (Opzionale) Creare `public/js/themes/<nome>.js` per elementi decorativi.

Nessun'altra modifica al codice esistente è necessaria.

### Testare un tema in anticipo

Aggiungere `?theme=<nome>` all'URL, es. `?theme=foliage`. La scelta resta
attiva per tutta la sessione del browser (non serve ripetere il parametro su
ogni pagina). `?theme=none` disattiva forzatamente qualunque tema;
`?theme=auto` torna alla scelta automatica in base alla data.

Il mese/anno usato per decidere il tema è quello del dispositivo del
visitatore (data e ora locali del browser), non dell'orologio del server —
scelta adeguata per un effetto puramente estetico come questo.

## Sicurezza

- **Area admin**: protetta da Cloudflare Access (vedi sezione 5), non da
  codice nell'app — se cambi dominio o crei ambienti di preview, verifica
  che la policy Access li copra.
- **Rate limiting**: gli endpoint pubblici/di scrittura più esposti
  (`POST`/`DELETE /api/votes`, `POST /api/admin/upload`) sono limitati a 20
  richieste al minuto per IP tramite il binding `RATE_LIMITER` dichiarato in
  `wrangler.toml`. Oltre la soglia rispondono `429`.
- **Errori**: nessun endpoint restituisce stack trace o dettagli interni al
  client in caso di errore 500 — solo un messaggio generico. Il dettaglio
  va nei log, consultabili con:

  ```bash
  npx wrangler pages deployment tail --project-name=calendario-eventi
  ```

## Limiti del piano gratuito (indicativi, settembre 2026)

| Servizio | Limite gratuito |
|---|---|
| Pages Functions | 100.000 richieste/giorno |
| D1 | 5 GB di storage, 5 milioni di righe lette/giorno, 100.000 scritte/giorno |
| R2 | 10 GB di storage, senza costi di banda in uscita |
| Access | fino a 50 utenti autenticati |

Per un calendario di eventi di un'associazione, gruppo o community, questi
numeri sono ampiamente sufficienti.

## Possibili sviluppi futuri

- Esportazione degli eventi in formato `.ics` (per importarli nel calendario
  personale).
- Notifica email automatica ai partecipanti quando viene creato o modificato
  un evento.
- Più admin con ruoli diversi (gestito comunque da Cloudflare Access).
- Rate limiting anche su `/api/admin/events/*` e `/api/admin/votes/*`, come
  seconda linea di difesa oltre a Cloudflare Access.
- Verifica che le *preview deployment* di Cloudflare Pages (URL diversi da
  quello di produzione, generati per ogni branch/commit) siano coperte
  dalla stessa policy Access, o disabilitate se non servono.
