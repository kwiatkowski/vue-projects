# Zmiany w liście projektów

Jedna sekcja na dzień – wersja dnia `RRRR.MM.DD`. Wydania w ciągu dnia (`.1`, `.2`…) są podsumowane razem.
Aplikacja pokazuje najnowszą sekcję w oknie „Co nowego” (klik w wersję na górnej belce).

## 2026.11.06

- Zakładka **Serwer**: ścieżka projektu na serwerze (katalog główny Bedrocka albo WordPressa) z przyciskiem kopiowania – uzupełnia ją raport strony (plugin_meden 1.22.0).
- Lista **Raport** w filtrach pokazuje tylko to, co dotyczy jakiegoś projektu – bez pozycji z zerem (wybrana zostaje).
- Lista **Status** tak samo: tylko stany, które ma jakiś projekt (bez „offline 0”).
- **Konta hostingowe** – dane hostingu wpisuje się raz na konto, a nie przy każdej stronie: hosting, adres panelu, login, hasło (szyfrowane), opłacone do i SSH. W projekcie (zakładka **Serwer**) wybór konta, „+” – nowe konto, ołówek – edycja (zmiana dotyczy wszystkich jego projektów); dane konta z przyciskami kopiowania i gotowe polecenie **SSH** od razu do katalogu projektu. Lista wszystkich kont: menu konta → **Konta hostingowe**. Istniejące dane serwerów zamienione na konta automatycznie.
- Kropka przy zakładce Serwer ostrzega też o **końcu opłaconego hostingu** – pomarańczowa na 30 dni przed, czerwona po terminie.
- Zakładka Serwer: sekcja **Baza danych** – host, nazwa, użytkownik i hasło (szyfrowane), wpisywane ręcznie.
- Zakładka Serwer: sekcja **Domena** – rejestrator i data, do kiedy domena jest opłacona, sprawdzane raz dziennie w rejestrze (RDAP; .eu nie podaje daty). Kropka ostrzega 30 dni przed, a tygodniowe podsumowanie ma nową sekcję **Domeny i hosting (30 dni)**.
- Kolumna **Raport**: kończąca się domena albo hosting – ikona kalendarza (pomarańczowa na 30 dni przed, czerwona po terminie), w dymku co i do kiedy; w filtrze Raport nowa pozycja **Kończące się terminy**.
- **Konta hostingowe** to teraz osobna lista zamiast okienka – przełącznik **Projekty / Konta hostingowe** obok „+” na górnej belce. Konta pogrupowane według hostingu, w kolumnach login, SSH, opłacone do i – na końcu – liczba projektów; wyszukiwarka szuka też po nazwach projektów, klik w wiersz otwiera edycję. Nowe konto – przyciskiem nad listą albo z menu „+”.
- Zielony ptaszek przy koncie, które ma komplet danych (hosting, adres panelu, login, hasło, opłacone do, SSH); przy niepełnym przerywane kółko – w dymku, czego brakuje.
- Po najechaniu na **liczbę projektów** konta – dymek jak przy raporcie: nazwa konta w nagłówku, pod nim jego projekty ze statusem.
- Konto hostingowe: pole **Kwota odnowienia** (np. „299 zł brutto / rok”) – w zakładce Serwer i na liście kont obok daty „opłacone do”.
- Przełączanie **Projekty / Konta hostingowe** bez mignięcia paska przewijania strony.
- Datę „Opłacone do” można **wpisać z klawiatury** (np. 02.04.2026, 2.4.2026, 02042026 albo wkleić 2026-04-02) – kalendarz pod ikoną obok; błędna data podświetla się na czerwono.
- Okno konta hostingowego działa jak okno projektu: ołówek przy zmienionych polach, „Niezapisane zmiany” – zamknięcie tylko przez zapis albo „Zamknij bez zapisywania”; projekty konta jeden pod drugim, ze statusem.
- „Opłacone do” jest opcjonalne – konto bez daty (np. hosting opłacany przez klienta) też ma zielony ptaszek kompletu danych.
- Pola **Hosting** i **Adres panelu** (okno konta, zakładka Serwer) mają przycisk otwierania w nowej karcie – obok kopiowania.
- **Szkice** w oknach projektu i konta hostingowego: „Zamknij” (albo ✕, Esc) zamyka okno i **zachowuje niezapisane zmiany** – po ponownym otwarciu są w formularzu; „Zamknij bez zapisywania” je odrzuca. Szkice trzymane są do odświeżenia strony.
- W nagłówku obu okien **przełącznik** na inny projekt / inne konto – lista z wyszukiwarką, ołówek przy tych ze szkicem; gdy bieżący ma zmiany, okno pyta w stopce (zamiast jej przycisków): zostań, odrzuć i przełącz, zachowaj i przełącz albo zapisz i przełącz.
- Zmienione, niezapisane pole ma też **pomarańczową ramkę** – w kolorze ołówka.

## 2026.11.04

- **Wybór motywu** zamiast przełącznika słońce / księżyc: Ciemny (domyślny), Jasny oraz **Meden jasny** i **Meden ciemny** w kolorach meden.com.pl.
- Okno **„Co nowego”** z podsumowaniem zmian dnia – samo po nowej wersji, ręcznie z wersji na górnej belce i z menu konta.
- Filtry statusu bez „W budowie”.
- Karta przeglądarki pokazuje, ile stron nie działa – **czerwona liczba na ikonie** i „(1) Projekty” w tytule, jak w Todo; gdy karta jest w tle, miga sama liczba na czerwonym tle.
- Gdy żadna strona nie leży, a coś czeka na aktualizację (WordPress, wtyczki, tłumaczenia) – **pomarańczowa liczba** takich projektów na ikonie karty.
- Pozycje „Wszystkie kategorie / statusy / raporty” bez liczby – liczby zostały przy konkretnych wyborach.
- Nowy status **„Bez monitoringu”** – dla strony, która działa, ale nie chcesz jej pilnować: raport z wtyczki dalej przychodzi (aktualizacje, wtyczki, motywy), a strona nie jest sprawdzana – bez dostępności, maili o awarii i czerwonej liczby na karcie. Pozycja w filtrze statusów pojawia się, gdy jakiś projekt go ma.
- W oknie projektu pole **Monitorowanie** zamiast wyboru statusu: **Monitoruj** (online / offline ustawia się samo – widać go obok), **Nie monitoruj** albo **Zawieszony**. Status „w budowie” usunięty – zastępuje go „Nie monitoruj”.
- Pola uzupełniane przez raport (Deploy, Bedrock, Wordfence, ACF, MI Modal) wyglądają na zablokowane – przerywana ramka i przygaszony napis, jak zablokowane pola tekstowe.
- W konfiguracji projektu wtyczki podpisane wprost: „Plugin: Wordfence”, „Plugin: ACF”, „Plugin: MI Modal”.
- Okno projektu ma stałą wysokość – przełączanie zakładek nie powiększa go ani nie zmniejsza; dłuższa zakładka przewija się w środku.
- Wszystkie pola, listy rozwijane i pola tekstowe mają ten sam krój i rozmiar – wcześniej adresy, loginy, hasła i klucze były mniejsze, część innym krojem.
- Zakładka Dostęp: sekcje **Production**, **Staging** i **Development**, każda z ikoną (Production – globus); bez przykładowych adresów medendev.eu w podpowiedziach; ikona oka przy hasłach pojawia się po najechaniu na pole, jak kopiowanie.
- Zakładka Dostęp: każde środowisko w osobnej karcie; „+ Basic Auth” w jednej linii z adresami, a „+ Domena” w linii z ostatnią domeną – oba przyciski w tym samym stylu.
- Karty środowisk i logowania na tle okna, z niskim paskiem nagłówka (szara ikona, nazwa) – ten sam układ będzie można użyć w innych zakładkach.
- Puste środowisko (bez adresu, panelu i Basic Auth) jest zwinięte do paska – klik w pasek rozwija; nazwy środowisk bez pogrubienia; podpowiedzi w pustych polach jaśniejsze, mniej rzucają się w oczy.
- „+ Domena” i „+ Basic Auth” to teraz kwadratowe ikony z dymkiem (plus i tarcza z plusem).
- W oknie projektu przewija się tylko otwarta zakładka – lewa kolumna i paski zakładek stoją w miejscu.
- Zakładka Dostęp: w nagłówkach Production i Staging status **online / offline** z ostatniego sprawdzenia – widać go też przy zwiniętej sekcji.
- Na górnej belce ikona **+** (Dodaj) z menu – Nowy projekt, Nowa kategoria – zamiast dwóch osobnych przycisków, w stylu przełącznika motywu; obie ikony z dymkiem po najechaniu („Dodaj”, „Motyw”).
- Jeden odstęp wszędzie (13 px): logo ma nad sobą tyle miejsca, ile belka po bokach, a lista – ten sam margines z lewej, z prawej, nad filtrami, między filtrami a tabelą i pod tabelą. Tabela zaokrąglona tylko u góry, tak jak przyciski i pola.
- Kropki przy zakładkach okna projektu: **Notatki** – jest notatka; **Dostęp** – zielona, gdy sprawdzane środowiska działają, czerwona, gdy produkcja albo staging leży; **Integracje** – zielona, gdy klucze reCAPTCHA na stronie zgadzają się z wpisanymi, czerwona, gdy nie.
- Kropki także przy **Raporcie** (zielona – raport świeży i nic do aktualizacji; pomarańczowa – są aktualizacje; czerwona – brak raportu od 2 dni albo groźna podatność), **Serwerze** (certyfikat SSL ważny / wkrótce wygasa / nieprawidłowy) i **Technologii** (WordPress i PHP aktualne / nowszy WordPress lub koniec wsparcia PHP / PHP bez poprawek lub wsparcia).
- Zmienione, a jeszcze niezapisane pole ma z prawej pomarańczowy ołówek – jak zakładka; po najechaniu znika i pokazują się zwykłe ikony (kopiuj, pokaż).
- Pasek filtrów w jednej grupie z lewej – wyszukiwarka, kategoria, status, „Do aktualizacji” (włączony ma zielone tło jak wybrany status); z prawej tylko „Aktualizuj wszystkie” i „Wyświetl”.
- Wszystkie elementy paska filtrów jednakowe: ta sama wysokość, obramowanie, zaokrąglenie i tło.
- **Status** i **Raport** jako listy rozwijane z liczbami – Raport filtruje to, co czeka na aktualizację (wszystko, WordPress, wtyczki, tłumaczenia), i nieaktywne wtyczki lub motywy.
- Liczby przy filtrach, „Do aktualizacji” i kategoriach mają stałe miejsce na dwie cyfry – nic nie przeskakuje, gdy lista się wczytuje.
- Równe marginesy z lewej i prawej – bez pustego miejsca na pasek przewijania strony, która na szerokim ekranie się nie przewija.
- Pełne raporty stron co **15 minut** zamiast co godzinę.
- Ikona „Brak tłumaczeń” nie pokazuje już na chwilę wszystkiego, co strona zgłasza (także tego, czego nie da się pobrać), gdy wygasała pamięć paczek z translate.wordpress.org.
- Po zaznaczeniu projektów pasek akcji pojawia się w miejscu wyszukiwarki i kategorii – lista pod nim już nie przeskakuje.
- Strona offline: **przyczyna w dymku** przy statusie – kod HTTP albo powód braku odpowiedzi, co zwykle oznacza, od kiedy i jak długo trwa.
- Raport: **nieużywane wtyczki i motywy** (szary znacznik z liczbą w kolumnie Raport, osobno wtyczki i motywy w dymku) i **motywy do aktualizacji** przy pomarańczowej strzałce; w oknie projektu sekcja **Motywy** (używany, nadrzędny, nieużywane).
- Filtr kategorii z **liczbą projektów** przy każdej kategorii i ✕ przy wybranej; ✕ przy statusie na telefonie – wszystkie listy rozwijane działają tak samo.

## 2026.10.30

- **Inne domeny projektu** (multisite, adres innego języka) sprawdzane jak strona główna – globus przy statusie w kolorze najgorszej, w dymku odpowiedź i certyfikat każdej.
- Multisite: **strony sieci** w raporcie (adres, język, motyw) i brakujące tłumaczenia całej sieci.
- Dostęp: Basic Auth produkcji i stagingu z zakresem – cała strona albo tylko panel; „Wyłącz Basic Auth”; logowanie do panelu wyróżnione na górze.
- Integracje: klucz API **Google Maps** z kopiowaniem.
- Okno projektu: kropka przy zakładce Notatki, gdy jest notatka; przy Todo liczba otwartych zadań.
- Po aktualizacji z listy raport strony pobiera się sam; strona w trybie konserwacji w trakcie aktualizacji nie przerywa jej.
- Przy tarczy podatności widać też strzałkę z liczbą aktualizacji; dymek PHP można najechać i skopiować wersję.
- Błąd aplikacji pokazuje komunikat zamiast pustego okna i trafia na serwer.

## 2026.10.29

- **Powiadomienia** (menu konta): e-mail i Slack, reguły z progami – strona nie działa, wróciła, staging, certyfikat, brak raportu, podatności – i tygodniowe podsumowanie.
- **Historia** w oknie projektu: dostępność z 24 h, 7 i 30 dni, czas odpowiedzi, wykres dnia, przerwy i zdarzenia; kolumna **Dostępność** w tabeli.
- **Podatności wtyczek** (Wordfence, WPScan, Patchstack, CVE): czerwona tarcza z liczbą w kolumnie Raport, lista w dymku i w oknie projektu.
- **Zaznaczanie projektów** w tabeli i akcje zbiorcze – aktualizacja raportu i stron.
- PHP w kolorze wsparcia z php.net; starszy plugin_meden / MK Core widać w kolumnie Raport; brak tłumaczeń na język strony – ikona języków z liczbą.
- Motyw zrobiony u nas oznaczony ptaszkiem; WordPress z wersją pod nazwą, najnowsza na zielono.
- Staging: opis błędu zamiast samego kodu, ikona w kolorze stanu, otwieranie z loginem Basic Auth.
- Dymki aplikacji zamiast systemowych wszędzie; lista pod adresem **projects.kwiatkowski.co**.

## 2026.10.28

- Kolumna Raport jako **ikona stanu**: ✓ raportuje, ↑ z liczbą aktualizacji, kłódka – certyfikat się kończy; po najechaniu podsumowanie z akcjami.
- **Aktualizacja stron z listy**: wtyczki, tłumaczenia, baza – na Bedrocku przez Composer, z postępem i logiem.
- Filtr **Do aktualizacji** – WordPress, wtyczki i tłumaczenia z raportów.
- **Konto listy** i trzy widoki: właściciel, zalogowany, gość; podgląd listy jako gość bez wylogowania; **Wyświetl** – widoczne kolumny w tej przeglądarce.
- Certyfikat SSL każdej strony sprawdzany przez listę (do kiedy, wystawca) – w zakładce Serwer i w raporcie.
- Dostęp: sekcje Produkcja, Staging, Lokalnie z adresami i logowaniami; staging z Basic Auth.
- Integracje: klucze reCAPTCHA i miejsca, gdzie strona ich używa; Notatki z edytorem jak w Todo.
- Zmienione wiersze podświetlane po kolei; na wąskim ekranie górny pasek chowa się przy przewijaniu.

## 2026.10.27

- Pola z raportu strony (repozytorium, Bedrock, Wordfence, ACF, MI Modal, silnik, wersja, motyw, PHP, status) oznaczone gwiazdką i tylko do odczytu, gdy strona raportuje.
- Raport strony: token dla Bedrocka (`.env`) albo zwykłego WordPressa (`wp-config.php`), usuwanie tokenu z potwierdzeniem.
- Tabela: wersja WordPressa pod silnikiem, wersja motywu pod nazwą, dymek motywu (wersja, autor, nadrzędny).
- Filtr nie poszerza tabeli – kolumny nie skaczą przy zmianie filtra.
- Telefon: wyszukiwarka na całą szerokość, kategorie i statusy pod przyciskiem filtrów.

## 2026.10.26

- **Lista projektów**: tabela jak w arkuszu – publiczna i pełna dla właściciela, kategorie z przeciąganiem, sortowanie albo własna kolejność.
- Okno projektu w dwóch kolumnach: domeny, kategoria, status, repozytorium, konfiguracja; zakładki Dostęp, Serwer, Technologia, Todo.
- Kolumna **Todo** – liczba otwartych zadań, linki do Todo w jednej karcie.
- Kategoria w adresie, filtry w nagłówku, ciemny motyw; lista odświeża się sama w ciągu kilku sekund po zmianie na serwerze.
- Listy wyboru, pola z kopiowaniem i checkboxy w stylu aplikacji; jedna zielona linia fokusu.
