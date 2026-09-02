# RTC — Real Time Chat Application

Application de chat en temps réel avec serveurs, channels, gestion des rôles et messagerie WebSocket.

## Stack

- **Backend** : Node.js, Express, TypeScript, PostgreSQL (Supabase), Socket.IO
- **Frontend** : Next.js, TypeScript, Tailwind CSS

## Architecture

    graph TD
        User((Utilisateur)) --> NextJS[Next.js Frontend]
        NextJS -- "Requetes HTTP JSON" --> Express[Express.js API]
        NextJS -- "WebSocket" --> Socket[Socket.IO Server]
        Express -- "Requetes SQL" --> Postgres[(PostgreSQL / Supabase)]
        Socket -- "Requetes SQL" --> Postgres
        Postgres -- "Donnees" --> Express
        Express -- "Reponse JSON" --> NextJS

## Structure

    backend/
      src/
        routes/, controllers/, services/, repositories/   API REST en couches
        socket/                                           serveur Socket.IO
      sql/script.sql                                       schema de la base
      docs/websocket-events.md                             specification des evenements

    frontend/
      src/
        app/                                          routes Next.js (App Router)
          login/, signup/                             authentification
          servers/                                    dashboard
          servers/[serverId]/                         redirige vers le premier channel
          servers/[serverId]/channels/[channelId]/    l'appli de chat elle-meme
        components/                                   composants UI reutilisables
        lib/
          api.ts       seul endroit qui appelle fetch vers le backend
          socket.ts    seul endroit qui connait socket.io-client
          types.ts     types partages, miroir des types du backend

## Roles et permissions

Chaque utilisateur a un role par serveur (pas un role global) : le meme utilisateur peut etre Owner d'un serveur et simple Member d'un autre.

| Role   | Peut faire |
|--------|-----------|
| Member | Ecrire des messages, voir qui est membre/en ligne/en train d'ecrire, supprimer ses propres messages |
| Admin  | Tout ce que fait un Member, plus : creer/modifier/supprimer un channel, supprimer le message d'un autre membre, generer un code d'invitation |
| Owner  | Tout ce que fait un Admin, plus : changer le role des membres, transferer la propriete du serveur |

Regles imposees au niveau base de donnees :
- Un seul Owner par serveur (index unique partiel en base, pas juste une verification cote code)
- Le createur d'un serveur en devient automatiquement l'Owner
- Un Owner ne peut pas quitter son propre serveur (il doit d'abord transferer la propriete, ou le supprimer)

## Endpoints REST

Authentification :

    POST   /api/auth/signup
    POST   /api/auth/login
    POST   /api/auth/logout
    GET    /api/me

Serveurs :

    POST   /api/servers
    GET    /api/servers
    GET    /api/servers/:id
    PUT    /api/servers/:id
    DELETE /api/servers/:id
    POST   /api/servers/:inviteCode/join
    DELETE /api/servers/:id/leave
    GET    /api/servers/:id/members
    PUT    /api/servers/:id/members/:userId

Channels :

    POST   /api/servers/:serverId/channels
    GET    /api/servers/:serverId/channels
    GET    /api/channels/:id
    PUT    /api/channels/:id
    DELETE /api/channels/:id

Messages :

    POST   /api/channels/:id/messages
    GET    /api/channels/:id/messages
    DELETE /api/messages/:id

Temps reel :

    WS     Socket.IO, evenements decrits dans backend/docs/websocket-events.md

## Lancer le projet

Voir .env.example pour la liste complete des variables a renseigner.

Installation :

    git clone https://github.com/LeM701/rtc-project.git
    cd rtc-project

    cd backend
    cp .env.example .env
    npm install

Appliquer le schema sur la base Supabase, une seule fois :

    psql "$DATABASE_URL" -f sql/script.sql

Puis :

    cd ../frontend
    cp .env.local.example .env.local
    npm install

Demarrage :

    Terminal 1
    cd backend && npm run dev

    Terminal 2
    cd frontend && npm run dev

Frontend : http://localhost:3000
Backend : http://localhost:4000

## Tests

Tout d'un coup :

    ./run-tests.sh

Separement :

    cd backend && npm test                 tests unitaires, aucune base requise
    cd backend && npm run test:integration  tests d'integration, base Postgres reelle
    cd frontend && npm test                 tests frontend

Par defaut test:integration se connecte a postgresql://postgres:postgres@localhost:5432/rtc_test. Pour utiliser une autre base, definir TEST_DATABASE_URL dans backend/.env.

Couverture actuelle : 104 tests au total, tous verts.
- Backend : 74 tests (42 unitaires + 32 integration, REST + WebSocket)
- Frontend : 30 tests (composants + pages completes, WebSocket simule)

## Envoi de message : REST et WebSocket

Un message peut etre envoye de deux facons, toutes deux passant par la meme logique metier (permissions, validation, persistance) :
- WebSocket (message:send) : chemin utilise par defaut par le client
- REST (POST /channels/:id/messages) : solution de repli si le socket n'est pas connecte

Dans les deux cas, le message est ensuite diffuse a tous les clients du channel, expediteur inclus, via l'evenement WebSocket message:new.

## WebSocket

Authentification par cookie JWT, gestion des rooms serveur/channel, presence en ligne, indicateur de frappe.

    sequenceDiagram
        participant C as Client
        participant S as Serveur
        participant O as Autres clients

        C->>S: handshake avec cookie JWT
        S-->>C: connect
        C->>S: server:join
        S-->>O: presence:update
        C->>S: channel:join (avec accuse de reception)
        S-->>C: ack
        C->>S: typing:start
        S->>O: typing:update
        C->>S: message:send
        S-->>C: ack (message cree)
        S->>C: message:new
        S->>O: message:new
        C->>S: DELETE /messages/:id
        S->>C: message:deleted
        S->>O: message:deleted
        C--xS: disconnect
        S-->>O: presence:update

Detail complet : backend/docs/websocket-events.md

## Organisation Git

Workflow base sur des branches fonctionnelles :
- Chaque fonctionnalite ou correction est developpee sur une branche dediee, creee depuis dev
- Une fois le travail termine, la branche est fusionnee dans dev via Pull Request
- Une fois dev stable, son contenu est fusionne dans main

Aucune fonctionnalite ne part directement de main ; main ne recoit que le merge final de dev.

Convention de commits : Conventional Commits (feat:, fix:, test:, docs:, chore:)
