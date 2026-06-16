# Wdrożenie Faktura KSeF na platformie Render

Ten katalog zawiera instrukcje i konfigurację potrzebną do uruchomienia pełnego stosu (Frontend React + Backend FastAPI + Baza danych MongoDB Atlas) na platformie **Render.com**.

## Struktura wdrożenia

Aplikacja jest skonfigurowana jako **Render Blueprint** w pliku [render.yaml](file:///i:/fakturson/app/render.yaml) w głównym katalogu projektu:

1. **Frontend (React)**:
   - Wdrożony jako **Static Site**.
   - Budowany za pomocą: `yarn install && yarn build`.
   - Folder wyjściowy: `build`.
   - Posiada regułę przepisywania tras (rewrites), aby wspierać routing po stronie klienta (React Router) - wszystkie niepasujące ścieżki przekierowuje do `index.html`.
   - Pobiera adres backendu automatycznie z usługi backendowej za pomocą zmiennej środowiskowej `REACT_APP_BACKEND_URL`.

2. **Backend (FastAPI)**:
   - Wdrożony jako **Web Service** (serwis Python).
   - Budowany za pomocą: `pip install -r requirements.txt`.
   - Startowany komendą: `uvicorn server:app --host 0.0.0.0 --port $PORT`.
   - Wymaga skonfigurowania bazy MongoDB (zmienna `MONGO_URL`).

---

## Instrukcja wdrożenia krok po kroku

### KROK 1: Skonfiguruj bazę MongoDB Atlas
1. Zaloguj się na [MongoDB Atlas](https://cloud.mongodb.com).
2. Stwórz darmowy klaster (Shared Cluster).
3. Dodaj użytkownika bazy danych i zapisz hasło.
4. Skonfiguruj Network Access (zezwól na połączenia z dowolnego adresu IP `0.0.0.0/0`, ponieważ Render ma zmienne IP).
5. Skopiuj swój **Connection String** (np. `mongodb+srv://user:password@cluster.xxx.mongodb.net/fakturson?retryWrites=true&w=majority`).

### KROK 2: Wypchnij repozytorium na swój GitHub
Ponieważ Render wdraża aplikacje bezpośrednio z GitHuba, musisz wypchnąć ten kod do swojego repozytorium:
1. Zaloguj się na swoje konto GitHub.
2. Stwórz nowe repozytorium (np. `faktury-ksef`).
3. Dodaj adres repozytorium jako remote i wypchnij kod:
   ```bash
   git remote add origin https://github.com/TWOJA_NAZWA/faktury-ksef.git
   git branch -M main
   git push -u origin main
   ```

### KROK 3: Uruchom wdrożenie na Render za pomocą Blueprintu
1. Zaloguj się na [Render.com](https://render.com).
2. Kliknij przycisk **New +** w prawym górnym rogu i wybierz **Blueprint**.
3. Połącz swoje konto z GitHubem (jeśli jeszcze tego nie zrobiłeś) i wybierz repozytorium `faktury-ksef`.
4. Render automatycznie wczyta plik `render.yaml` i wykryje obie usługi (backend i frontend).
5. Zostaniesz poproszony o uzupełnienie brakujących zmiennych środowiskowych:
   - **`MONGO_URL`**: Wklej tutaj swój connection string z MongoDB Atlas (Krok 1).
6. Kliknij **Apply**. Render rozpocznie budowanie i wdrażanie obu usług.

Po zakończeniu budowania:
- Twój frontend będzie dostępny pod adresem typu `https://faktura-frontend.onrender.com`.
- Twój backend będzie działał i komunikował się automatycznie z frontendem.
