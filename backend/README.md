# RTC — Backend

## Installation

```bash
npm install
cp .env.example .env
# Remplir DATABASE_URL avec la connection string Supabase (Settings > Database > Connection string, mode "Session pooler")
# Remplir JWT_SECRET avec une chaîne aléatoire longue
```

Appliquer le schéma sur la base Supabase (une fois) :

```bash
psql "$DATABASE_URL" -f sql/001_users.sql
psql "$DATABASE_URL" -f sql/002_servers.sql
psql "$DATABASE_URL" -f sql/003_channels.sql
psql "$DATABASE_URL" -f sql/004_messages.sql
```

## Lancer le serveur

```bash
npm run dev
```

## Tests

Tests unitaires (rapides, aucune base de données requise) :
```bash
npm test
```

Tests d'intégration (nécessitent un vrai Postgres local — pas Supabase, pour ne pas polluer les données de prod/dev) :
```bash
# Une fois : créer une base Postgres locale nommée rtc_test, puis y appliquer les fichiers sql/*.sql
npm run test:integration
```

Par défaut `test:integration` se connecte à `postgresql://postgres:postgres@localhost:5432/rtc_test`.
Pour utiliser une autre base, définir `TEST_DATABASE_URL` avant de lancer la commande.

## Documentation

- [`docs/websocket-events.md`](./docs/websocket-events.md) — spécification des événements Socket.IO
