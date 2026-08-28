# Spécification des événements WebSocket

Connexion via Socket.IO, sur le même port HTTP que l'API REST.

## Authentification

L'authentification réutilise le cookie `token` posé par `POST /auth/login` ou
`POST /auth/signup` (JWT signé, `httpOnly`). Aucune deuxième authentification
n'est nécessaire côté client : dès que le navigateur a ce cookie, la
connexion Socket.IO est authentifiée automatiquement (le cookie est envoyé
dans le handshake).

Si le cookie est absent ou le token invalide/expiré, la connexion est
refusée avant même l'event `connect` côté client (voir `socket.io`
"middleware" `io.use()` côté serveur).

## Rooms

| Room | Rejointe via | Sert à |
|---|---|---|
| `server:{serverId}` | event `server:join` | recevoir les mises à jour de présence de ce serveur |
| `channel:{channelId}` | event `channel:join` | recevoir les nouveaux messages / suppressions / indicateurs de frappe de ce channel |

Rejoindre une room vérifie l'appartenance au serveur correspondant côté
serveur ; sinon un event `error` est renvoyé et la room n'est pas rejointe.

## Événements émis par le client

### `server:join`
```json
{ "serverId": 12 }
```
À émettre pour chaque serveur affiché dans l'UI (ex : au chargement de la
sidebar). Déclenche un `presence:update` pour tous les membres de ce
serveur déjà connectés.

### `channel:join`
```json
{ "channelId": 34 }
```
À émettre à l'ouverture d'un channel. Nécessaire pour recevoir
`message:new` / `message:deleted` / `typing:update` de ce channel.

### `channel:leave`
```json
{ "channelId": 34 }
```
À émettre en quittant un channel (ex : navigation vers un autre channel),
pour ne plus recevoir ses événements.

### `typing:start` / `typing:stop`
```json
{ "channelId": 34 }
```
À émettre quand l'utilisateur commence/arrête de taper dans le champ de
message. Ne persiste rien en base — purement transitoire.

## Événements émis par le serveur

### `message:new`
Diffusé à `channel:{channelId}` après un `POST /channels/{id}/messages`
réussi. Le message n'est **jamais** créé via WebSocket — uniquement via
REST — pour garder toute la validation et les permissions dans un seul
endroit (`MessageService`).
```json
{
  "id": 101,
  "channelId": 34,
  "authorId": 7,
  "content": "salut !",
  "createdAt": "2026-08-04T10:00:00.000Z"
}
```

### `message:deleted`
Diffusé à `channel:{channelId}` après un `DELETE /messages/{id}` réussi.
```json
{ "channelId": 34, "messageId": 101 }
```

### `typing:update`
Diffusé à tous les membres de `channel:{channelId}` **sauf** l'émetteur
(pas besoin de voir son propre indicateur de frappe).
```json
{
  "channelId": 34,
  "userId": 7,
  "username": "alice",
  "isTyping": true
}
```

### `presence:update`
Diffusé à `server:{serverId}` à chaque connexion/déconnexion d'un membre
de ce serveur. `onlineUserIds` est la liste complète (pas un delta) —
plus simple à consommer côté client, pas de risque de désync.
```json
{
  "serverId": 12,
  "onlineUserIds": [7, 15, 22]
}
```

Un utilisateur est considéré "connecté" à un serveur tant qu'au moins une
de ses connexions WebSocket a rejoint la room de ce serveur (plusieurs
onglets ouverts = toujours compté une seule fois, et l'utilisateur ne
disparaît de `onlineUserIds` que quand sa dernière connexion se ferme).

### `error`
Émis au socket qui a déclenché une action non autorisée (ex : `server:join`
sur un serveur dont on n'est pas membre).
```json
{ "message": "Vous n'êtes pas membre de ce serveur" }
```

## Diagramme du flux "envoyer un message"

```
Client A                  Serveur                   Client B (même channel)
   |                         |                                |
   |--- POST /channels/  --->|                                |
   |    34/messages          |                                |
   |                         |--- INSERT en base ------------>|
   |                         |                                |
   |<-- 201 Created ---------|                                |
   |                         |--- emit 'message:new' -------->| (via room channel:34)
   |                         |--- emit 'message:new' -------->| (Client A aussi, pour rester simple)
```
