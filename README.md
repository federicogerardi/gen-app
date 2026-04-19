# gen-app

gen-app e un hub interno pensato per trasformare brief, materiali grezzi e conoscenza sparsa in artefatti marketing pronti da rifinire, salvare e riutilizzare.

L'idea di fondo e semplice: togliere al team il peso della scrittura ripetitiva e riportare il tempo sulle decisioni che contano davvero, come angoli di comunicazione, posizionamento, test e strategia.

## Cosa rende utile il progetto

gen-app nasce per chi lavora ogni giorno tra campagne, pagine, varianti e iterazioni continue. Invece di partire ogni volta da zero, l'utente entra in un workflow guidato, fornisce un brief o un documento di riferimento e ottiene in pochi minuti una base concreta su cui lavorare.

Il valore non sta solo nella generazione veloce. Sta nel fatto che ogni output resta dentro un contesto di progetto, puo essere recuperato in seguito e puo diventare il punto di partenza per la prossima iterazione.

## A chi e rivolto

Il prodotto e pensato soprattutto per team interni marketing e growth, in particolare:

- Media buyer che devono produrre e confrontare rapidamente piu varianti di messaggio
- SEO e content specialist che vogliono accelerare la produzione senza perdere controllo editoriale
- Figure operative e manageriali che hanno bisogno di materiali utili, consultabili e riusabili senza scrivere prompt manuali

## Come si usa

L'esperienza e costruita per essere diretta:

1. accedi con il tuo account aziendale
2. apri o crei un progetto
3. scegli il workflow di cui hai bisogno
4. inserisci un brief oppure carichi un materiale di partenza
5. generi, rivedi e salvi il risultato

Il progetto e il centro del lavoro. Gli artefatti non vivono come output isolati, ma come materiali collegati a una campagna, un'iniziativa o un'ipotesi da testare.

## Workflow attivi

### NextLand

NextLand e pensato per chi deve costruire rapidamente una presenza di campagna coerente a partire da un materiale sorgente. Il workflow guida l'utente nella trasformazione di un briefing o di un documento in una sequenza essenziale di pagine pronte da rifinire.

L'obiettivo e ridurre il tempo necessario per passare dal contesto iniziale a una prima struttura solida, mantenendo continuita tra messaggio, tono e passaggi del percorso utente.

### HotLead Funnel

HotLead Funnel accompagna la creazione di un funnel in modo piu guidato e sequenziale. Si parte da un documento sorgente, per esempio un brief di prodotto, una trascrizione, un deck commerciale o altri materiali utili. Da li il sistema estrae le informazioni chiave e costruisce i passaggi successivi del funnel.

Il flusso attivo oggi copre:

- optin page
- quiz di qualificazione
- VSL script

Ogni fase puo essere rivista prima di passare alla successiva, cosi il controllo resta in mano all'utente e la velocita non sacrifica la qualita.

## Progetti, storico e riuso

gen-app adotta una logica projects-first. Significa che il punto naturale in cui lavorare e consultare i contenuti e il progetto, non un semplice elenco di output.

Questo permette di:

- raccogliere in un unico spazio tutti i materiali di una campagna
- mantenere memoria delle versioni generate
- recuperare rapidamente funnel, landing e contenuti gia prodotti
- riaprire uno storico personale quando serve cercare un artefatto trasversale

## Controllo e affidabilita

L'app e riservata agli utenti interni e usa l'accesso aziendale per mantenere il perimetro controllato. Ogni utente opera entro una quota mensile di utilizzo, mentre gli amministratori dispongono di strumenti dedicati per supervisionare accessi, quote, modelli disponibili e utilizzo complessivo.

Questo rende il progetto utile non solo sul piano creativo, ma anche su quello operativo: adozione semplice, costi monitorabili e governance chiara.

## Stato del progetto

gen-app e gia operativo e viene usato come hub interno di generazione. Il perimetro pubblico attuale e focalizzato sui workflow NextLand e HotLead Funnel, con evoluzione continua della qualita dei flussi, dell'organizzazione per progetti e dell'esperienza di revisione.

## Pattern composabile tool-pages

I workflow NextLand e HotLead Funnel seguono una struttura composabile condivisa che separa:

- wrapper pagina minimale
- container di orchestrazione del tool
- hook dominio-specific per extraction/generation/recovery/ui-state
- componenti presentazionali riusabili

Questo pattern riduce la duplicazione, mantiene i file entro soglie gestibili e rende piu veloce estendere nuovi tool mantenendo parita architetturale.

## Documentazione tecnica

La documentazione tecnica, architetturale e operativa resta nella cartella [docs/README.md](docs/README.md). Questo README serve come presentazione del progetto e della sua idea, non come riferimento di implementazione.
