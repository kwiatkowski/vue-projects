# vue-projects

Lista projektów – stron i aplikacji – pod `/projects/`: Vue 3 + Pinia, ten sam styl „Atrament” co
[vue-todo](https://github.com/kwiatkowski/vue-todo) (bez bibliotek UI). Dane, logowanie i raporty stron zapewnia
WordPress z pluginem [wp-plugin-projects](https://github.com/kwiatkowski/wp-plugin-projects).

## Jak to działa

```
przeglądarka ── /projects/ ──────────────► WordPress (wp-plugin-projects)
                                              • web/index.html + window.__PROJECTS__ (REST URL, nonce, czy edycja)
             ── /projects/web/assets/* ──► pliki z buildu (Apache, .htaccess)
             ── /wp-json/projects/v1/* ──► REST API pluginu

strony ─────── POST /wp-json/projects/v1/report (token) ─► PHP, WordPress, motyw, wtyczki
```

- **Niezalogowany** widzi publiczną listę: projekty oznaczone „Na publicznej liście”, z domeną, tylko domena,
  status, silnik, wersja i motyw.
- **Właściciel** (zalogowany administrator) widzi wszystkie projekty i kolumny jak w arkuszu – serwer, konto, PHP,
  repozytorium, Deploy, DEV, Bedrock, Security, Local, ACF, MI Modal, DB sync, ostatni raport strony, Todo – i edytuje
  projekt po kliknięciu w wiersz. W oknie projektu jest też token raportu (gotowe linie do `.env` strony).
- **Kategorie i kolejność**: projekty są pogrupowane w kategorie (nagłówki w tabeli). Właściciel przeciąga projekty
  (w kategorii i do innej) i całe kategorie (za uchwyt przy nagłówku); menu kategorii: zmiana nazwy, w górę / w dół
  (też na telefonie), usunięcie. Przeciąganie działa bez filtra i wyszukiwania. Kliknięcie w nagłówek kolumny sortuje
  płaską listę, „Własna kolejność” wraca do kategorii.
- **Todo**: projekt można powiązać z projektem w Todo (okno projektu → Todo). Kolumna Todo pokazuje liczbę otwartych
  zadań i tych po terminie (link do projektu w Todo), okno projektu – spis otwartych zadań.

W bundlu nie ma adresów, tokenów ani haseł – konfigurację wstrzykuje WordPress w chwili otwarcia strony.

## Instalacja

Katalog aplikacji to `{web root}/projects` (w Bedrocku `web/projects`), obok WordPressa:

```
git clone https://github.com/kwiatkowski/vue-projects.git web/projects
```

Zbudowana wersja (`web/`) jest w repozytorium, więc na serwerze wystarczy `git pull` – Node nie jest tam potrzebny.

## Praca lokalna

```
npm install
npm run build        # type-check + build do web/
npm test             # testy jednostkowe (Vitest)
npm run lint         # ESLint
```

Po `npm run build` aplikacja działa pod `https://{domena}/projects/`.

### Hot reload (`npm run dev`)

Dev server (port 3001) przekazuje `/wp-json` do WordPressa i dokleja hasło aplikacji – po stronie Node,
nie trafia ono do przeglądarki. Hasło tworzysz w WordPressie: *Użytkownicy → Profil → Hasła aplikacji*.

`.env.development.local` (ignorowany przez git):

```
PROJECTS_DEV_API=https://kwiatkowski.local
PROJECTS_DEV_AUTH=login:xxxx xxxx xxxx xxxx xxxx xxxx
```

Potem `npm run dev` i `http://localhost:3001/projects/web/`.

## Budowa

```
src/
├── api/          klient fetch (nonce, odświeżanie nonce, błędy) i endpointy projects/v1
├── stores/       Pinia: projects (lista, kategorie, kolejność, projekty Todo, edycja, token), notify
├── utils/        czyste funkcje: filtr, wyszukiwanie, sortowanie, grupy kategorii, kolejność, daty – pokryte testami; drag (przeciąganie)
├── components/   pasek górny, tabela z kategoriami (karty na telefonie), status, Todo, okna projektu i kategorii, ui/ (dialog, menu, toast)
├── composables/  motyw jasny/ciemny
├── pages/        lista projektów
├── styles/       app.css – tokeny kolorów (jasne i ciemne), typografia, przyciski, pola, chipy (jak w vue-todo)
└── config.ts     konfiguracja z window.__PROJECTS__ (prod) lub wartości domyślne (dev)
```

Filtr (status, „Bez strony”) i wyszukiwanie są w adresie (`?status=online&q=hostido`), sortowanie po kliknięciu
w nagłówek kolumny. PHP starsze niż 8.1 jest wyróżnione, raport starszy niż 2 dni – na pomarańczowo.

## Wersje

Vue 3.5, Pinia 4, Vue Router 5, Vite 8, ikony Lucide, fonty Geist i Geist Mono, TypeScript 5.9, Vitest 5.
