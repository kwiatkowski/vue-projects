# Kontekst – lista projektów (vue-projects + wp-plugin-projects + MK Core + plugin_meden)

Stan na 2026-10-28 (wieczór). Notatka do wznowienia pracy w nowej rozmowie – co to jest, jak działa, co ustalono i jak wdrażać.

## Zasady współpracy (ważne)

- Każdą zmianę listy (vue-projects, wp-plugin-projects, MK Core) od razu: build → commit → push → wdrożenie na kwiatkowski.co,
  chyba że użytkownik powie „tylko lokalnie”. Strony klientów (plugin_meden, ich repo) – wdrażać, gdy prośba to mówi
  („wdróż wszędzie”, „wdrażaj we wszystkich projektach”); automat uprawnień często blokuje deploy na strony klientów – wtedy
  zostawić gotowe i poprosić o zgodę jednym zdaniem.
- Robić tylko to, o co proszono (np. nie dodawać tła po najechaniu, którego nie było w prośbie). Gdy prośba niejasna
  – zapytać krótko albo zaproponować, a zrobić po akceptacji („zaproponuj” = najpierw propozycja).
- Spójność UI: jeden styl przycisków w oknach (✕ Anuluj zwykły, główny zielony `btn--accent` z ikoną, usuwanie czerwone z koszem
  po lewej, „✕ Zamknij bez zapisywania” przy zmianach); fokus/zaznaczenie = jedna zielona linia 1px (`--focus-ring: none`,
  przyciski z obwódką – kolor obwódki, reszta `outline: 1px` offset 1px); bez żółtych/pomarańczowych akcentów w pasku filtrów.
- Wersje: zmiana kodu pluginu/MK Core/aplikacji → `Version:` + stała = dzisiejsza data RRRR.MM.DD (wp-plugin-projects
  również przy każdej zmianie vue-projects – wersja widoczna w belce). plugin_meden – semver (CHANGELOG.md, tag `vX.Y.Z`).
- Commity po polsku, stopka `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit tylko gdy `vue-tsc` przeszedł
  (`… | tee /dev/stderr | grep -q TSC_OK && git commit …`).

## Repozytoria i ścieżki

| Co | Lokalnie | Repo | Produkcja (`~/domains/kwiatkowski.co/public_html`) |
| --- | --- | --- | --- |
| Aplikacja Vue | `web/projects` | github.com/kwiatkowski/vue-projects (`main`) | `web/projects` |
| Plugin listy | `web/app/mu-plugins/wp-plugin-projects` | github.com/kwiatkowski/wp-plugin-projects (`main`) | ten sam katalog |
| MK Core | `web/app/mu-plugins/mk-core` | www-kwiatkowski (bitbucket, `master`, repo główne) | w repo strony |
| plugin_meden | klon w scratchpadzie (`/tmp/...`, bywa czyszczony – klonować od nowa) | git@github.com:medeninmed/plugin_meden.git (tagi vX.Y.Z) | na stronach klientów |

- Build/testy tylko w kontenerze: `docker exec -w /var/www/html/web/projects webserver-kwiatkowski sh -c 'npx eslint --fix src && npx vitest run && npx vue-tsc --noEmit -p tsconfig.app.json && echo TSC_OK && npm run build'`.
  Build ląduje w `web/` i jest commitowany. Pliki `web/assets` należą do użytkownika kontenera – `git revert` na nich się wyłoży;
  zamiast tego cofnąć źródła i przebudować.
- PHP lint: `docker exec webserver-kwiatkowski php -l <ścieżka w /var/www/html/...>`; wp-cli lokalnie `docker exec -w /var/www/html webserver-kwiatkowski wp … --allow-root`.
- Repo główne bywa zmieniane przez aktualizacje z listy (commit „Aktualizacja RRRR.MM.DD (z listy projektów)”) – przed push `git pull --rebase`.

## Wdrożenie listy (kwiatkowski.co)

`ssh -o BatchMode=yes -p 64321 host756671@host756671.hostido.net.pl 'cd domains/kwiatkowski.co/public_html && git pull -q --ff-only && git -C web/app/mu-plugins/wp-plugin-projects pull -q --ff-only && git -C web/projects pull -q --ff-only'`
Sprawdzenie: `curl -s https://projects.kwiatkowski.co/ | grep -o "index-[A-Za-z0-9_-]*\.js"` = lokalny `web/index.html`.
Adres listy od 2026-10-29: **https://projects.kwiatkowski.co/** (subdomena → `public_html/web`, ten sam WordPress; `config/environments/production.php`: `PROJECTS_APP_HOST`, `COOKIE_DOMAIN=.kwiatkowski.co`); `kwiatkowski.co/projects/…` → 301. Katalog subdomeny NIE może być `public_html` (wystawiał `backup/*.sql`, `vendor/`).
Na produkcji leżą nieśledzone `web/screen.html`, `web/test_product.json` (nie ruszać, użytkownik wie).

- 2026-10-30: inne domeny projektu (pole `domains` poza pierwszą – multisite, np. edgemedical.bg) sprawdzane jak strona:
  co 5 min (historia, cel = host; kolumna `target` varchar(100), History VERSION 2), SSL co godzinę, alerty, podsumowanie;
  meta `_project_domain_checks` → `domainChecks` (kolumna Status, globus przy statusie). plugin_meden 1.20.0: `sites`
  (multisite – strony sieci: url, locale, theme, missingTranslations) → sekcja „Strony sieci” w raporcie.
  Brak tłumaczeń: tylko z paczką na translate.wordpress.org (TranslationPacks, cache 12 h). Po aktualizacji z listy
  aplikacja sama pobiera raport (strona listy: `wp projects-report` to polecenie listy, nie wysyła własnego raportu).

## Strony klientów (token, raport, plugin_meden 1.20.0 wszędzie – od 2026-10-30)

- Hostido host227530 (`ssh -p 64321 host227530@host227530.hostido.net.pl`, `~/domains/<d>/public_html`, Bedrock, `composer`):
  ckmed.pl, terapia-tecar.com, edgemedical.eu, rakprostaty.com.pl, zaburzeniaerekcji.eu, nietrzymaniemoczu.org.
- Stagingi (Bedrock, git): ckmed, edgemedical, terapia-tecar – `~/domains/<d>/public_html/stage` na host227530 (stage.<d>).
- Hostido host288196: reedukacja.technomex.pl (Bedrock, repo medeninmed/app_reedukacja_chodu).
- srv-ded 5.187.50.244 port 33222:
  - `medennyj`: meden.com.pl (Bedrock, `/usr/local/php83/bin/php -d memory_limit=1G composer.phar`, proc_open wyłączone →
    aktualizacja z listy niedostępna); en.meden, csr.meden, wyp.meden (bez Bedrocka, plugin w `wp-content/mu-plugins/plugin_meden`, git + loader; wyp za Basic Auth → 401).
  - `ded`: elektrostymulacja-vs.pl, neuroforma.pl (bez Bedrocka), echolaser, falauderzeniowa, hiperbaryczne, neurorehabilitacja.
- Repo Bedrock klientów: github.com/medeninmed/{meden,ckmed,terapiatecar,edgemedical,rakprostaty,zaburzeniaerekcji,nietrzymaniemoczu,app_reedukacja_chodu}
  (adresy też w polu repo na liście).
- Wydanie plugin_meden: zmiana + CHANGELOG + `Version:` w function-meden.php → commit, `git tag vX.Y.Z`, push z tagiem →
  w każdym repo Bedrock podmiana wpisu `medeninmed/plugin_meden` w composer.lock (version, source/dist reference, dist url, time)
  skryptem Pythona, commit „plugin_meden X.Y.Z”, push → na serwerze `git pull --ff-only && composer install --no-dev --optimize-autoloader --no-interaction`;
  bez Bedrocka: `git fetch -q --tags && git checkout -q vX.Y.Z` w katalogu pluginu. Sprawdzić `curl` 200.
  Przy każdym wydaniu zip do ręcznej instalacji (pulsmed – bez dostępu do serwera): `git archive --format=zip --prefix=plugin_meden/
  -o web/projects/plugin_meden-X.Y.Z.zip vX.Y.Z`, poprzedni zip usunąć (tylko jeden, aktualny; `.git/info/exclude` go pomija).
  **Przy każdym wydaniu podbić `LATEST_PLUGIN_MEDEN` w `web/projects/src/utils/projects.ts`** (lista nie czyta prywatnego repo) – build i wdrożenie listy.
- Nigdy nie używać tokenu jednej strony na innej; nie budować środowisk klientów lokalnie.

## Raport i odświeżanie

- Lista sama pobiera raporty: `ReportPuller` (GET `{site}/wp-json/projects-report/v1/report` z tokenem, Basic Auth ręcznym nagłówkiem).
- Cron Hostido co 5 min `wp projects-report --quiet`: na stronie listy pełne pobranie (raporty, SSL `SslChecker`, staging) raz na
  godzinę (`fullDue`, opcja `wp_plugin_projects_last_full_pull`), w międzyczasie `check()` – tylko strony główne i stagingi.
  Ręcznie: `--full`, `--status`. Przycisk „Pobierz raport” w oknie projektu (`POST /projects/{id}/report`).
- Raport (plugin_meden `Report` i MK Core `SiteReport`): wersje, motyw (`themeDetails`), wtyczki do aktualizacji, `translationUpdates`,
  `recaptcha` (CF7 + Wordfence login: klucz witryny, SHA-256 sekretu), reporter.
- Aktualizacja z listy: plugin_meden `Updater` i MK Core moduł `update` (`SiteUpdate`) – Bedrock: skrypt w tle (git pull, composer
  update, WP-CLI baza/tłumaczenia przez Language_Pack_Upgrader, commit i push, raport); bez Bedrocka: Core_Upgrader (WordPress),
  Plugin_Upgrader, tłumaczenia. Stan w `sys_get_temp_dir()/meden-update-*` lub `mk-core-update-*`.
- „Najnowszy WordPress” w aplikacji = max(wordpress.org z cache 12 h, najwyższa stabilna wersja raportowana przez stronę), porównanie liczbowe.

## Widoki i uprawnienia

- Admin (WordPress, `manage_options`) – wszystko. Zalogowany – jedno konto listy (nie WP; opcja `wp_plugin_projects_viewer`, hasło
  hash, ciasteczko `mk_projects_viewer` 30 dni, 5 prób/15 min). Gość – publiczne.
- „Ustawienia” (menu pod avatarem, admin): konto zalogowanego + kolumny dla Zalogowanego i Gościa (`Columns`, opcje
  `wp_plugin_projects_viewer_columns`, `wp_plugin_projects_public_columns`). Serwer wysyła tylko pola tych kolumn; Gościom nigdy:
  Serwer, Repo, Local, Stage, Todo, Raport. Zalogowany dostaje token jako „ukryty”.
- „Wyświetl” (każdy) – kolumny w tej przeglądarce (localStorage `projects.hiddenColumns`), okno w 4 kolumnach.
- Podgląd admina: menu avatara „Widok jako” Admin/Zalogowany/Gość (`?podglad=zalogowany|gosc`, nagłówek `X-Projects-View`).

## Aplikacja – stan UI (najważniejsze)

- Pasek filtrów: wyszukiwarka, kategoria, „Do aktualizacji” (`?aktualizacje`, gdy jest kolumna Raport), statusy, „Wyświetl”.
- Poniżej 1500px przewinięta lista (>8px) chowa górny pasek (przesunięcie + margines, `:root.topbar-away` → `--topbar: 0`);
  próg „o wysokość paska” był gorszy – cofnięty.
- Odświeżanie: zmienione wiersze pojawiają się po kolei co 1 s (od góry), projekty bez tokenu bez podświetlenia.
- Okno projektu (1240px): zakładki Raport strony (przycisk Pobierz raport), Serwer (+ certyfikat SSL zablokowany, z *), Technologia,
  Dostęp, Integracje (reCAPTCHA v3: klucz witryny, tajny szyfrowany; ptaszki CF7/Wordfence z raportu), Notatki (Tiptap, Markdown,
  `sanitize_textarea_field`), Todo. Usunięte: flaga „DEV (stage)” (staging = wpisany adres).

## Dodane 2026-10-29 (monitoring, historia, powiadomienia)

- Sekrety: klasa `Secrets` (libsodium), klucz `PROJECTS_SECRET_KEY=base64:…` w `.env` (lokalnie ustawiony i przeniesiony;
  na produkcji ustawiony (sprawdzone 2026-10-30)). `wp projects-secrets status|key|rekey`.
- Historia: tabele `{prefix}projects_checks` (każde sprawdzenie strony/stagingu: kod, ms, błąd) i `{prefix}projects_events`
  (status, zmiany z raportów – wtyczki, role, pola; update, alert, mute, vulnerability); 90 dni. Sprawdzenia po 4 naraz,
  nieudane ponawiane po 5 s. REST `GET /projects/{id}/history`; zakładka „Historia”, kolumna „Dostępność” (30 dni).
- Podatności: `VulnerabilityScanner` – WPVulnerability.net per wtyczka (cache 12 h), przy pełnym pobraniu; rdzeń WP
  pominięty (za dużo fałszywych). Czerwona tarcza w kolumnie Raport, lista w dymku i w oknie.
- Akcje zbiorcze: checkboxy (admin), pasek „Aktualizuj raport / Aktualizuj stronę”, „Aktualizuj wszystkie”.
- Powiadomienia: `AlertSettings` (opcja `wp_plugin_projects_alerts`, SMTP hasło i webhook Slacka zaszyfrowane), `Notifier`,
  `Alerts` (stan `wp_plugin_projects_alert_state`, wyciszenie meta `_project_muted_until`, 30 min po aktualizacji z listy),
  podsumowanie tygodniowe. Okno „Powiadomienia” w menu avatara. Kanały domyślnie wyłączone – do skonfigurowania.
- Frontend podzielony: `components/project/*Tab.vue` (+ `form.ts`, `secrets.ts`, `project-form.css`),
  `components/table/*` (komórki, karty, `drag.ts`, `list.css`). Test renderowania `src/components/smoke.spec.ts`.

## Otwarte / do zrobienia

- meden.com.pl: aktualizacja z listy niemożliwa (proc_open wyłączone) – ewentualnie systemowy cron.
- Wspólna paczka reportera (plugin_meden + MK Core) – odłożone przez użytkownika.
- Skill `frontend-design` dodany przez użytkownika – nowa sesja go wczyta.

## Stan wdrożeń (2026-10-28)

- kwiatkowski.co: MK Core `c5b3cb6` (repo główne), wp-plugin-projects `b3d24c0` (2026.10.28), vue-projects `24cbf48`.
- plugin_meden `v1.16.0` (`8091fd7`) na wszystkich 13 stronach z tokenem.
