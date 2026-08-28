# RTC — Frontend

## Installation

```bash
npm install
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL doit pointer vers le backend (http://localhost:4000 en local)
```

## Lancer

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Le backend doit tourner en parallèle (voir `backend/README.md`).

## Structure

```
src/
  app/                                          routes Next.js (App Router)
    login/, signup/                             authentification
    servers/                                    dashboard : créer/rejoindre un serveur
    servers/[serverId]/                         redirige vers le premier channel
    servers/[serverId]/channels/[channelId]/    l'appli de chat elle-même
  components/                                   composants UI réutilisables
  lib/
    api.ts       seul endroit qui appelle fetch() vers le backend
    socket.ts    seul endroit qui connaît socket.io-client
    types.ts     types partagés, miroir des types du backend
```

## Pourquoi le message ne s'envoie jamais directement en WebSocket

`ChatPanel.onSend` appelle `api.sendMessage` (REST). Le nouveau message revient
ensuite via l'event `message:new` du WebSocket, diffusé par le backend après
écriture en base — donc **tous les clients du channel reçoivent le message de
la même façon**, y compris celui qui vient de l'envoyer. Ça évite d'avoir un
code différent pour "mon propre message" (ajouté localement) et "message d'un
autre" (reçu par socket) — une seule source de vérité, un seul chemin
d'affichage.
