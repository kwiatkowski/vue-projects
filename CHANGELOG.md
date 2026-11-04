# Zmiany w liście projektów

Jedna sekcja na dzień – wersja dnia `RRRR.MM.DD`. Wydania w ciągu dnia (`.1`, `.2`…) są podsumowane razem.
Aplikacja pokazuje najnowszą sekcję w oknie „Co nowego” (klik w wersję na górnej belce).

## 2026.11.04

- **Wybór motywu** zamiast przełącznika słońce / księżyc: Ciemny (domyślny), Jasny oraz **Meden jasny** i **Meden ciemny** w kolorach meden.com.pl.
- Okno **„Co nowego”** z podsumowaniem zmian dnia – samo po nowej wersji, ręcznie z wersji na górnej belce i z menu konta.
- Filtry statusu bez „W budowie”.
- Karta przeglądarki pokazuje, ile stron nie działa – **czerwona liczba na ikonie** i „(1) Projekty” w tytule, jak w Todo; gdy karta jest w tle, miga sama liczba na czerwonym tle.
- Gdy żadna strona nie leży, a coś czeka na aktualizację (WordPress, wtyczki, tłumaczenia) – **pomarańczowa liczba** takich projektów na ikonie karty.
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
