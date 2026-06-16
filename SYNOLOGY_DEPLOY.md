# Instrukcja Wdrożenia Faktura KSeF na Synology NAS (DS223j)
## Kompletny poradnik krok po kroku (Backend + Frontend) dla Twojego Taty

Synology **DS223j** (system DSM 7.2+) posiada 64-bitowy procesor ARM64 oraz 1 GB pamięci RAM. Od wersji DSM 7.2 model ten oficjalnie wspiera aplikację **Container Manager** (dawniej Docker).

Poniżej przygotowaliśmy **dwie metody wdrożenia** aplikacji:
*   **Metoda 1 (Najprostsza — zalecana)**: Jednokontenerowa, gdzie serwer backendu automatycznie serwuje też stronę wizualną (frontend). Wszystko działa na jednym porcie bez konfiguracji proxy.
*   **Metoda 2 (Zaawansowana)**: Osobne wdrożenie frontendu na wbudowanej usłudze *Web Station* i backendu w *Container Manager* z użyciem *Reverse Proxy*.

---

## METODA 1: Wdrożenie jednokontenerowe (Najprostsze)
W tej metodzie serwer Python obsługuje zarówno bazę API, jak i wyświetla gotową stronę (frontend). Uruchamiasz tylko jeden kontener!

### Krok 1: Instalacja Container Manager na Synology
1. Zaloguj się do systemu **Synology DSM** w przeglądarce.
2. Otwórz **Centrum pakietów** (Package Center).
3. Wyszukaj pakiet **Container Manager** i kliknij **Zainstaluj**.

### Krok 2: Przygotowanie plików aplikacji na komputerze
Zanim wgramy aplikację na Synology, musimy zbudować (skompilować) frontend:
1. Otwórz terminal w katalogu projektu na swoim komputerze.
2. Zbuduj frontend poleceniem:
   ```bash
   npm run build
   ```
3. Po zakończeniu kompilacji wejdź do folderu `out/public_html/` (lub `frontend/build/`).
4. Skopiuj **całą zawartość tego katalogu** (pliki `index.html`, `favicon.ico` oraz folder `static/`) i wklej ją do nowo utworzonego podfolderu o nazwie `static/` wewnątrz katalogu `backend/`.
   *   *Struktura powinna wyglądać tak: `backend/static/index.html`, `backend/static/static/js/...` itd.*

### Krok 3: Wgranie plików na Synology NAS
1. Na Synology otwórz aplikację **File Station**.
2. Przejdź do folderu `/docker` (został utworzony automatycznie) i stwórz tam podfolder `faktura`.
3. Wewnątrz folderu `/docker/faktura/` stwórz kolejny podfolder o nazwie `app`.
4. Skopiuj/prześlij całą zawartość zmodyfikowanego w Kroku 2 katalogu `backend/` (razem z podfolderem `static/`) do katalogu `/docker/faktura/app/` na Synology.
   *   *Ścieżka na NAS powinna wyglądać tak: `/docker/faktura/app/server.py`, `/docker/faktura/app/static/index.html` itd.*

### Krok 4: Konfiguracja Docker Compose
1. W aplikacji **File Station**, w folderze `/docker/faktura/` utwórz nowy plik tekstowy o nazwie `docker-compose.yml`.
2. Otwórz go (np. klikając prawym przyciskiem myszy -> *Edytuj w edytorze tekstu*) i wklej następującą treść:

```yaml
version: '3.8'

services:
  faktura-app:
    image: python:3.10-slim
    container_name: faktura-app
    restart: always
    ports:
      - "8080:8000"
    environment:
      - MONGO_URL=twoj_kod_polaczenia_mongodb_atlas
      - DB_NAME=fakturson
      - ADMIN_EMAIL=admin@faktura.pl
      - ADMIN_PASSWORD=Admin123!
      - KSEF_MODE=simulation
      - KSEF_ENV=test
    volumes:
      - /volume1/docker/faktura/app:/app
    working_dir: /app
    command: sh -c "pip install -r requirements.txt && uvicorn server:app --host 0.0.0.0 --port 8000"
```

> [!NOTE]
> Zastąp wartość `twoj_kod_polaczenia_mongodb_atlas` swoim faktycznym ciągiem połączenia z bazą MongoDB Atlas w chmurze (np. `mongodb+srv://...`). Upewnij się, że w panelu MongoDB Atlas w zakładce **Network Access** dodałeś IP swojego domu (lub `0.0.0.0/0`), aby Synology mogło się połączyć.

### Krok 5: Uruchomienie w Container Manager
1. Otwórz program **Container Manager** na Synology.
2. Przejdź do zakładki **Projekt** (Project) z lewej strony i kliknij **Utwórz** (Create).
3. Skonfiguruj projekt:
   *   **Nazwa projektu**: `faktura-ksef`
   *   **Ścieżka**: Kliknij *Przeglądaj* i wybierz utworzony folder `/docker/faktura`.
   *   **Źródło**: Wybierz "Użyj istniejącego pliku docker-compose.yml".
4. Kliknij **Dalej**, zatwierdź i poczekaj, aż Synology pobierze obraz Pythona, zainstaluje zależności i uruchomi kontener.

Aplikacja będzie w pełni gotowa i dostępna pod adresem:
👉 **`http://adres_ip_twojego_nas:8080`**

---

## METODA 2: Osobne wdrożenie (Web Station + Reverse Proxy)
Metoda zalecana, jeśli chcesz używać wbudowanego serwera WWW Synology (Nginx/Apache) i przypisać do aplikacji własną domenę.

### Krok 1: Instalacja pakietów
W *Centrum Pakietów* zainstaluj:
1. **Container Manager**
2. **Web Station**

### Krok 2: Wdrożenie API (Backend)
1. Na Synology wgraj pliki backendu bez folderu `static` do `/docker/faktura/app/`.
2. Użyj pliku `docker-compose.yml` z **Metody 1** (port `8080` przekieruje ruch do backendu API).
3. Uruchom projekt w **Container Manager** (jak w Kroku 5 powyżej).

### Krok 3: Wdrożenie Frontendu (Web Station)
1. Skompiluj frontend na komputerze (`npm run build`).
2. Prześlij zawartość folderu `out/public_html/` do folderu `/web/faktura/` na Synology.
3. Otwórz **Web Station** na Synology:
   *   Przejdź do **Usługa internetowa** (Web Service) -> **Utwórz** (Create).
   *   Wybierz **Statyczna witryna internetowa** (Static Website).
   *   Nazwij ją `faktura-frontend`, a jako katalog główny wskaż folder `/web/faktura`.
4. Przejdź do **Portal witryny sieci Web** (Web Portal) -> **Utwórz**.
   *   Wybierz utworzoną przed chwilą usługę.
   *   Ustaw typ portalu na **Oparty na porcie** (Port-based) i przypisz wolny port (np. `8081`).

### Krok 4: Konfiguracja Reverse Proxy (Przekierowanie API)
Aby frontend mógł rozmawiać z backendem bez błędów CORS:
1. W DSM przejdź do **Panel sterowania** -> **Portal logowania** (Login Portal) -> zakładka **Zaawansowane** (Advanced) -> **Reverse Proxy**.
2. Kliknij **Utwórz** i skonfiguruj regułę przekierowania dla API:
   *   **Nazwa**: `Faktura API`
   *   **Źródło (Protokół, Host, Port)**: `HTTP`, `*` (lub adres NAS), Port: `8081` (Port frontendu), Ścieżka: `/api`
   *   **Cel (Protokół, Host, Port)**: `HTTP`, `localhost`, Port: `8080` (Port backendu)
3. Zapisz regułę.

Teraz wchodząc na port frontendu (`http://adres_ip_twojego_nas:8081`), cała aplikacja będzie działać poprawnie.
