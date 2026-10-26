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

- **Niezalogowany** widzi publiczną listę: wszystkie projekty z domeną: nazwa (link do głównej domeny),
  status, silnik, wersja i motyw.
- **Właściciel** (zalogowany administrator) widzi wszystkie projekty i kolumny jak w arkuszu – serwer, konto, PHP,
  repozytorium, Deploy, DEV, Bedrock, Security, Local, ACF, MI Modal, ostatni raport strony, Todo – i edytuje
  projekt po kliknięciu w wiersz (nazwę – ołówkiem w miejscu). Okno projektu (dwie kolumny): domeny (kilka, pierwsza główna),
  serwer, technologia, kod, konfiguracja (Deploy, DEV, Bedrock …), dostęp – panele produkcji, stagingu i wersji
  lokalnej, login i hasło (ukryte, z podglądem i kopiowaniem; zapisane zaszyfrowane), Todo, notatki i token raportu
  (gotowe linie do `.env` strony).
- **Kategorie i kolejność**: projekty są pogrupowane w kategorie (nagłówki w tabeli). Właściciel przeciąga projekty
  (w kategorii i do innej) i całe kategorie (za uchwyt przy nagłówku); menu kategorii: zmiana nazwy, w górę / w dół
  (też na telefonie), usunięcie. Przeciąganie działa bez filtra i wyszukiwania. Kliknięcie w nagłówek kolumny sortuje
  płaską listę, „Własna kolejność” wraca do kategorii.
- **Todo**: projekt można powiązać z projektem w Todo (okno projektu → Todo). Kolumna Todo pokazuje liczbę otwartych
  zadań (link do projektu w Todo) – czerwoną, gdy coś jest po terminie, szarą, gdy nic nie jest bliżej niż 7 dni; po
  najechaniu – ile po terminie, na dziś, w najbliższych 7 dniach i bez terminu; okno projektu – spis otwartych zadań.
  Linki do Todo otwierają się w jednej nazwanej karcie: kolejne kliknięcie ładuje adres w już otwartej i na nią przełącza
  (karty Todo otwartej ręcznie przeglądarka nie znajdzie – wtedy otworzy nową).
- **Statusy**: online (zielony, pulsuje), w budowie (niebieski), offline (czerwony), zawieszona (szara kulka, wiersz
  wyszarzony) – w filtrach zawsze wszystkie. Podpowiedzi (raport, Todo) w stylu aplikacji, nie przeglądarki.

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
├── components/   pasek górny (nowy projekt, nowa kategoria, motyw, logowanie), tabela z kategoriami (karty na telefonie), status, Todo, okna projektu i kategorii, ui/ (dialog, menu, toast)
├── composables/  motyw ciemny (domyślnie) / jasny
├── pages/        lista projektów
├── styles/       app.css – tokeny kolorów (jasne i ciemne), typografia, przyciski, pola, chipy (jak w vue-todo)
└── config.ts     konfiguracja z window.__PROJECTS__ (prod) lub wartości domyślne (dev)
```

Kategoria to ścieżka – `/projects/meden` pokazuje tylko projekty kategorii „Meden” (wybór w pasku nad tabelą – po zalogowaniu, slug
zmienia się razem z nazwą kategorii). Filtr (status, „Bez strony”) i wyszukiwanie są w adresie
(`/projects/meden?status=online&q=hostido`), sortowanie po kliknięciu w nagłówek kolumny. Lista odświeża się sama, bez wskaźnika wczytywania
(tylko w widocznej karcie): co 3 s sprawdza znacznik zmian (`GET /changed`) i pobiera listę, gdy się ruszył – raport
strony widać od razu – a całą listę i tak co minutę. Zmieniony wiersz przez 3 s ma kolor jak po najechaniu
i wyszarzony tekst, a zmienione pola są rozmyte pod kręcącym się wskaźnikiem. PHP starsze niż 8.1 jest wyróżnione, daty jako RRRR.MM.DD. Raport strony to kulka: zielona (pulsuje) – raportuje, czerwona – skonfigurowany (token), ale brak raportu od 2 dni, szara – nieskonfigurowany; data i godzina ostatniego w podpowiedzi.

## Wersje

Vue 3.5, Pinia 4, Vue Router 5, Vite 8, ikony Lucide, fonty Geist i Geist Mono, TypeScript 5.9, Vitest 5.
