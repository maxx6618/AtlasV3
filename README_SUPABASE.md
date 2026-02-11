# Supabase Integration Setup

Diese Anleitung erklärt, wie Sie Supabase für die Atlas Intelligence Anwendung einrichten.

## 1. Supabase Projekt erstellen

1. Gehen Sie zu [https://app.supabase.com](https://app.supabase.com)
2. Erstellen Sie ein neues Projekt
3. Notieren Sie sich die **Project URL** und den **anon/public key** aus den Project Settings → API

## 2. Datenbank-Schema erstellen

1. Öffnen Sie den SQL Editor in Ihrem Supabase Dashboard
2. Führen Sie die SQL-Migration aus: `supabase/migrations/001_initial_schema.sql`
   - Dies erstellt die Tabellen: `verticals`, `sheets`, `rows`
   - Aktiviert Row Level Security (RLS) mit offenen Policies (für Multi-User ohne Auth)

### Zusätzliche Tabelle: App Settings (API Keys)

Für persistente API-Keys (single-tenant) fügen Sie folgende Tabelle hinzu:

```sql
create table if not exists app_settings (
  id text primary key,
  settings jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Hinweis zur Nutzung**
- Funktioniert auch lokal, solange `VITE_SUPABASE_URL` und ein Supabase-Key gesetzt sind (Hosting ist nicht erforderlich).
- Die Settings sind global (`id = 'global'`). In einem öffentlichen Projekt sind diese Keys für alle Nutzer sichtbar. Für produktive Nutzung sollten RLS-Policies oder eine verschlüsselte Speicherung ergänzt werden.

## 3. Umgebungsvariablen konfigurieren

1. Erstellen Sie eine `.env` Datei im Root-Verzeichnis (basierend auf `.env.example`)
2. Fügen Sie Ihre Supabase-Credentials hinzu:

**Option A: Neuer Publishable Key (empfohlen)**
```env
VITE_SUPABASE_URL=https://ihr-projekt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ihr-key-hier
```

**Option B: Legacy Anon Key (funktioniert noch bis 2026)**
```env
VITE_SUPABASE_URL=https://ihr-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Wo finde ich die Keys?**
- Im Supabase Dashboard: Project Settings → API
- **Publishable Key**: Unter "Publishable keys" (neuer Key, Format: `sb_publishable_...`)
- **Anon Key**: Unter "Project API keys" → "anon public" (Legacy, Format: `eyJ...`)

## 4. Dependencies installieren

```bash
npm install
```

## 5. Anwendung starten

```bash
npm run dev
```

## Funktionalität

### Datenpersistenz
- Alle Verticals, Sheets und Rows werden automatisch in Supabase gespeichert
- Debounced Save (500ms) verhindert zu viele API-Calls bei schnellen Änderungen
- Automatisches Laden beim App-Start

### Real-time Synchronisation
- Änderungen von anderen Benutzern werden automatisch synchronisiert
- Real-time Subscriptions für:
  - Verticals (alle Änderungen)
  - Sheets (pro Vertical)
  - Rows (pro Sheet)

### Fallback-Verhalten
- Wenn Supabase-Credentials nicht konfiguriert sind, verwendet die App lokale Daten (`INITIAL_VERTICALS`)
- Bei Fehlern beim Laden wird auf lokale Daten zurückgegriffen

## Nächste Schritte

- **Authentifizierung**: RLS-Policies für benutzerbasierte Zugriffe konfigurieren
- **Backup**: Regelmäßige Backups der Supabase-Datenbank einrichten
- **Performance**: Indizes für große Datenmengen optimieren
