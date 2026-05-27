# Content Creator Bot fuer Telegram

Ein TypeScript-basierter Telegram-Bot zum Erstellen, Pruefen, Planen und Veroeffentlichen von Social-Media-Posts. Der Bot speichert Entwuerfe lokal in SQLite, kann mit OpenAI Post-Vorschlaege erzeugen und sendet freigegebene Posts an einen Make.com Webhook. Die eigentliche Veroeffentlichung auf Instagram, Facebook, LinkedIn, X oder anderen Plattformen wird in Make.com eingerichtet.

## Funktionsumfang

- Telegram-Bot mit Admin-Zugriffsschutz
- Entwuerfe manuell erstellen oder per OpenAI generieren
- Foto mit Caption als neuen Entwurf speichern
- Bild per Telegram-Foto oder oeffentlicher Bild-URL an einen Entwurf haengen
- Bei Telegram-Fotos erzeugt der Bot automatisch eine Telegram-Datei-URL und speichert sie als `image_url`
- Entwuerfe ansehen, bearbeiten, loeschen und freigeben
- Posts fuer einen spaeteren Zeitpunkt planen
- Hintergrund-Scheduler prueft einmal pro Minute auf faellige Posts
- Make.com Webhook erhaelt eine strukturierte JSON-Payload
- SQLite-Datenbank fuer Posts, Status und einfache Statistiken

Hinweis zu Nachrichten und Trends: Der Bot nutzt OpenAI, um thematische Kontextvorschlaege zu erzeugen. In der aktuellen Implementierung findet keine verifizierte Web-Recherche und kein Abruf aus einer News-API statt. Wenn belastbare aktuelle Nachrichten benoetigt werden, sollte in Make.com oder im Code eine echte News-/Search-Quelle ergaenzt werden.


## Grenzen der aktuellen Version

- Der Bot veroeffentlicht nicht direkt auf Social Media. Die Verteilung erfolgt ueber Make.com.
- Themen- und Trendvorschlaege werden durch OpenAI erzeugt und sind keine verifizierte Live-News-Recherche.
- Der Scheduler laeuft im Bot-Prozess und prueft einmal pro Minute. Bei mehreren parallelen Instanzen koennen Posts doppelt verarbeitet werden.
- Telegram-Datei-URLs enthalten das Bot Token im Zugriffspfad. Fuer produktive Medienworkflows ist ein Upload zu einem separaten Asset-Host empfehlenswert.
- Plattformauswahl pro Post ist aktuell nicht interaktiv im Bot umgesetzt. Standardwerte koennen im Code oder in Make.com angepasst werden.

## Voraussetzungen

- Node.js 18 oder neuer
- npm
- Telegram Account
- Telegram Bot Token von BotFather
- Make.com Account
- OpenAI API Key, falls KI-Funktionen genutzt werden sollen
- Social-Media-Konten, die in Make.com verbunden werden koennen

## Installation lokal

```bash
git clone https://github.com/InkAssists/ContentCreatorBot.git
cd ContentCreatorBot
npm install
cp .env.example .env
```

Danach die Datei `.env` ausfuellen.

## Telegram Bot erstellen

1. Telegram oeffnen und mit `@BotFather` chatten.
2. `/newbot` senden.
3. Namen fuer den Bot vergeben, zum Beispiel `My Content Bot`.
4. Username vergeben. Dieser muss auf `bot` enden, zum Beispiel `my_content_pipeline_bot`.
5. BotFather gibt ein Token aus. Dieses Token in `.env` als `BOT_TOKEN` eintragen.
6. Die eigene Telegram User ID ermitteln, zum Beispiel ueber `@userinfobot` oder einen vergleichbaren Telegram-Info-Bot.
7. Die numerische ID in `.env` als `ADMIN_USER_ID` eintragen.

Empfohlen ist `ADMIN_USER_ID`. `ADMIN_USERNAME` funktioniert ebenfalls, ist aber weniger robust, weil Usernames geaendert werden koennen.

## OpenAI API Key einrichten

1. Einen OpenAI API Key im OpenAI Dashboard erstellen.
2. Den Key in `.env` als `OPENAI_API_KEY` eintragen.
3. Ohne diesen Key funktionieren die manuellen Bot-Funktionen weiterhin, aber `/idee` und KI-Vorschlaege sind deaktiviert.

Die verwendeten Prompts und Content-Pfeiler liegen in `src/services/ai.ts`.

## Make.com Webhook einrichten

1. In Make.com ein neues Scenario erstellen.
2. Als erstes Modul `Webhooks` -> `Custom webhook` auswaehlen.
3. Einen neuen Webhook anlegen und die generierte URL kopieren.
4. Die URL in `.env` als `MAKE_WEBHOOK_URL` eintragen.
5. In Make.com den Webhook einmal auf Daten warten lassen.
6. Den Bot lokal starten und in Telegram einen Testpost erstellen:

```text
/neu
/freigeben <post-id>
```

7. Make.com erkennt die Payload-Struktur aus dem Testrequest.

## Social-Media-Kanaele in Make.com verbinden

Der Bot postet nicht direkt zu Instagram, Facebook, LinkedIn oder X. Er sendet die vorbereitete Payload an Make.com. Dort wird die Verteilung eingerichtet.

Typischer Aufbau in Make.com:

1. `Custom webhook` als Startmodul.
2. Danach einen `Router` einfuegen.
3. Pro Plattform einen Router-Pfad erstellen, zum Beispiel Facebook, Instagram, LinkedIn, X.
4. Im jeweiligen Pfad das passende Make.com Modul verbinden, zum Beispiel:
   - Facebook Pages: Beitrag auf Seite erstellen
   - Instagram for Business: Foto oder Reel veroeffentlichen, je nach Konto und Modul
   - LinkedIn: Share Update oder Organization Post
   - X/Twitter: Tweet erstellen, falls das Konto und Make-Modul verfuegbar sind
5. Pro Pfad einen Filter auf `platforms` setzen, zum Beispiel `platforms contains facebook`.
6. Die Social-Media-Konten in Make.com per OAuth verbinden.
7. Das Scenario aktivieren.

Standardmaessig sendet der Bot die Plattformen `facebook`, `twitter` und `instagram`. Wenn andere Standardkanaele gebraucht werden, kann der Default in `src/db/posts.ts` in der Spalte `platforms` angepasst werden. Alternativ kann Make.com die Payload ignorieren oder auf eigene Routing-Regeln abbilden.

## Payload an Make.com

Bei `/freigeben` oder bei faelligen geplanten Posts sendet der Bot folgende JSON-Struktur:

```json
{
  "post_id": 42,
  "text": "Reiner Post-Text ohne Hashtags und Link.",
  "text_post": "Fertiger Post-Text inklusive Hashtags und Website-Link.",
  "image_url": "https://example.com/image.jpg",
  "platforms": ["facebook", "twitter", "instagram"],
  "hashtags": "#Beispiel #Content",
  "link": "https://example.com",
  "scheduled_at": null
}
```

Empfohlene Feldzuordnung in Make.com:

- Textfeld der Plattform: `text_post`
- Bild-/Media-Feld: `image_url`, falls vorhanden
- Link-Feld, falls das Modul ein separates Linkfeld hat: `link`
- Eigene Filterlogik: `platforms`

Wenn ein Bild direkt in Telegram hochgeladen wird, erstellt der Bot automatisch eine Telegram-Datei-URL und sendet diese als `image_url` an Make.com. Dafuer muss kein separater Bildlink manuell erstellt werden. Fuer produktive Workflows ist trotzdem oft ein Upload-Schritt in Make.com sinnvoll, zum Beispiel zu Cloudinary, S3, Google Drive oder direkt in das jeweilige Social-Media-Modul. Eine ausfuehrlichere Make.com-Anleitung liegt in `docs/makecom.md`.

## Umgebungsvariablen

```env
BRAND_NAME=MyBrandName
WEBSITE_URL=https://example.com
NEWS_TOPIC="deutsche Wirtschaft und Tech-Trends"
NEWS_FOCUS="aktuelle Innovationen, Digitalisierung, AI-Trends und Verbrauchertipps"
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_USER_ID=123456789
ADMIN_USERNAME=
MAKE_WEBHOOK_URL=https://hook.eu2.make.com/your_webhook_id_here
OPENAI_API_KEY=sk-your_openai_key_here
```

Wichtige Hinweise:

- `BOT_TOKEN` ist Pflicht.
- Mindestens `ADMIN_USER_ID` oder `ADMIN_USERNAME` sollte gesetzt sein. Ohne Admin-Konfiguration ist der Bot fuer alle erreichbar, die ihn finden.
- `MAKE_WEBHOOK_URL` ist fuer echte Veroeffentlichung erforderlich.
- `OPENAI_API_KEY` ist nur fuer KI-Funktionen erforderlich.
- `WEBSITE_URL` wird automatisch an freigegebene Posts angehaengt.

## Bot starten

Entwicklung:

```bash
npm run dev
```

Produktion lokal:

```bash
npm run build
npm start
```

Der Produktionsstart nutzt `dist/index.js`. Nach Codeaenderungen muss deshalb erneut gebaut werden.

## Docker

```bash
docker build -t content-creator-bot .
docker run --env-file .env -v $(pwd)/data:/app/data content-creator-bot
```

Das Volume fuer `/app/data` sorgt dafuer, dass die SQLite-Datenbank ausserhalb des Containers erhalten bleibt.

## Telegram-Befehle

```text
/start
/hilfe
/neu
/idee
/idee <thema>
/entwuerfe
/vorschau <id>
/bild <id>
/bild <id> <url>
/freigeben <id>
/planen <id> <datum> <uhrzeit>
/stats
```

Beispiele:

```text
/idee KI im Handwerk
/vorschau 12
/bild 12 https://example.com/post-image.jpg
/planen 12 morgen 10:00
/freigeben 12
```

## Content auf den eigenen Use Case anpassen

Die wichtigsten Anpassungen liegen in `src/services/ai.ts`.

### Marke und Grundkontext

Setze in `.env`:

```env
BRAND_NAME=Deine Marke
WEBSITE_URL=https://deine-domain.de
NEWS_TOPIC="deine Branche oder Nische"
NEWS_FOCUS="deine Zielgruppe, typische Probleme, relevante Trends"
```

Diese Werte werden in die Prompts eingefuegt und beeinflussen Tonalitaet und Kontext.

### System-Prompt anpassen

In `src/services/ai.ts` die Funktion `getBasePrompt()` bearbeiten. Dort definierst du:

- Rolle des Bots
- Zielgruppe
- Tonalitaet
- Laenge der Posts
- Regeln fuer Emojis, Hashtags und Call-to-Action
- Sprache und Ansprache, zum Beispiel Du oder Sie

### Content-Pfeiler anpassen

In `src/services/ai.ts` liegt die Konstante `PILLARS`. Dort kannst du eigene Content-Kategorien definieren oder bestehende ueberschreiben.

Aktuelle Pfeiler:

- `educational`: informative Posts mit Nutzwert
- `humor`: humorvolle oder satirische Posts
- `storytelling`: Vertrauen, Beispiele, kleine Geschichten
- `seasonal`: saisonale oder zeitbezogene Posts

Pro Pfeiler kannst du anpassen:

- `name`: Anzeigename im Bot
- `weight`: Gewichtung fuer zufaellige Auswahl
- `prompt`: genaue Anweisung an die KI
- `formats`: Varianten, aus denen die KI ein Format auswaehlt

Wenn neue Pfeiler-IDs hinzukommen, muessen auch die Buttons in `src/commands/idee.ts` angepasst werden.

### Make.com Routing anpassen

Wenn du andere Kanaele nutzt, passe entweder die Default-Plattformen in `src/db/posts.ts` an oder mappe die vorhandenen Werte in Make.com auf deine Zielkanaele.

Beispiele:

- `twitter` kann in Make.com auf X geroutet werden.
- `facebook` kann auf Facebook Pages geroutet werden.
- `instagram` benoetigt in der Regel ein Instagram Business Konto und eine verbundene Facebook Page.
- `linkedin` kann im Code als weiterer Plattformwert ergaenzt und in Make.com als eigener Router-Pfad verarbeitet werden.

## Roadmap

Moegliche naechste Ausbaustufen:

- Interaktive Plattformauswahl pro Post im Telegram-Flow.
- Echte News-/Search-Integration ueber eine verifizierbare Quelle.
- Medienupload zu Cloud Storage statt Telegram-Datei-URLs.
- Retry- und Fehlerbenachrichtigung fuer Make.com-Fehler.
- Multi-User- oder Team-Unterstuetzung mit Rollenmodell.
- Tests fuer Telegram-Callback-Flows und plattformspezifische Routing-Regeln.

## Open-Source-Beitrag

- `CONTRIBUTING.md` beschreibt Setup, Entwicklungsworkflow und PR-Checkliste.
- `SECURITY.md` beschreibt den Umgang mit Sicherheitsmeldungen und sensiblen Daten.
- `CHANGELOG.md` dokumentiert relevante Aenderungen.
- Die CI unter `.github/workflows/ci.yml` fuehrt Build und Tests fuer Pull Requests und Pushes auf `main` aus.

## Sicherheit und Betrieb

- `.env` niemals committen.
- Telegram Bot Token und OpenAI API Key wie Passwoerter behandeln.
- Telegram-Datei-URLs werden automatisch erzeugt, wenn Bilder direkt an den Bot gesendet werden. Diese URLs enthalten das Bot Token im Zugriffspfad. Fuer produktive Workflows sind eigene oeffentliche Bild-URLs oder ein separater Upload-Schritt in Make.com sauberer.
- SQLite liegt in `data/posts.db`. Dieses Verzeichnis sollte bei Deployments persistent gemountet werden.
- Der Scheduler laeuft im Bot-Prozess. Wenn mehrere Bot-Instanzen parallel laufen, koennen geplante Posts mehrfach verarbeitet werden. Fuer Produktion nur eine Instanz betreiben oder Locking ergaenzen.

## Pruefung

```bash
npm run build
npm test
```

`npm run build` prueft die TypeScript-Kompilierung. `npm test` fuehrt die automatisierte Testsuite mit Node's eingebautem Test-Runner und `tsx` aus. Abgedeckt sind aktuell Make.com Payloads, Webhook-Versand, Datum-Parsing fuer geplante Posts sowie zentrale SQLite-Statuswechsel.

Fuer produktiven Einsatz koennen weitere Tests fuer Telegram-Callback-Flows, Make.com-Fehlerfaelle und plattformspezifische Routing-Regeln ergaenzt werden.
