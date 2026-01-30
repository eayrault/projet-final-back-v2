# projet-final-back-v2

API REST pour la gestion d'événements gaming, tournois et inscriptions.

## Installation

Prérequi : NodeJS, Docker

```bash
# Cloner le repository
git clone <url-repository>
cd projet-final-back-v2

# Installer les dépendances
pnpm install

# Démarrer la base de données
pnpm start

# Compiler TypeScript
pnpm build

# Démarrer le serveur
node /dist/index.js
```

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
PGHOST=database_host
PGPORT=database_port
PGUSER=database_user
PGPASSWORD=database_password
PGDATABASE=database_name

DATABASE_URL=postgres://user:password@localhost:5432/database_name
FRONTEND_URL=http://front_end_url.com

PORT=3000
JWT_SECRET=your-secret-key-here
```

### Base URL

```
http://localhost:3000/api
```

### Format des données

- **Dates** : Format ISO 8601 (`2026-01-01T10:00:00Z`)
- **IDs** : UUID v4
- **Réponses** : JSON

---

## Authentification

L'API utilise des cookies HttpOnly pour l'authentification :

- `accessToken` : Token JWT (durée : 1 heure)
- `refreshToken` : Token de rafraîchissement (durée : 7 jours)

### Frontend Configuration

```javascript
// Fetch API
fetch('http://localhost:3000/endpoint', {
  credentials: 'include',
});

// Axios
axios.defaults.withCredentials = true;
```

### Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| `user` | Utilisateur standard |
| `organizer` | Organisateur d'événements |
| `admin` | Administrateur (tous les droits) |

---

## Routes API

### <a name="routes-authentification"></a> Authentification

**Base URL:** `/api/auth`

#### `POST /auth/register`

Créer un nouveau compte utilisateur.

**Request Body:**
```json
{
  "username": "john_doe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "role": "user",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Erreurs:**
- `400 Bad Request` - Email ou username déjà utilisé
- `500 Internal Server Error` - Erreur serveur

---

#### `POST /auth/login`

Se connecter avec un compte existant.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "username": "john_doe",
    "role": "user"
  }
}
```

**Cookies définis:**
- `accessToken` (HttpOnly, Secure, SameSite=Strict)
- `refreshToken` (HttpOnly, Secure, SameSite=Strict)

**Erreurs:**
- `400 Bad Request` - Email ou mot de passe invalide
- `500 Internal Server Error` - Erreur serveur

---

#### `POST /auth/logout`

Se déconnecter et révoquer les tokens.

**Headers:**
```
Cookie: accessToken=...; refreshToken=...
```

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

**Cookies supprimés:**
- `accessToken`
- `refreshToken`

---

#### `POST /auth/refresh`

Rafraîchir l'access token expiré.

**Headers:**
```
Cookie: refreshToken=...
```

**Response (200):**
```json
{
  "message": "Tokens refreshed"
}
```

**Cookies mis à jour:**
- `accessToken` - Nouveau token JWT
- `refreshToken` - Nouveau refresh token

**Erreurs:**
- `401 Unauthorized` - Refresh token invalide ou expiré
- `500 Internal Server Error` - Erreur serveur

---

### <a name="routes-utilisateurs"></a>👤 Utilisateurs

**Base URL:** `/api/users`

#### `GET /users/all`

Récupérer tous les utilisateurs.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "created_at": "2026-01-01T10:00:00Z",
    "updated_at": "2026-01-01T10:00:00Z"
  }
]
```

---

#### `GET /users/:id`

Récupérer un utilisateur par son ID.

**URL Parameters:**
- `id` (UUID) - ID de l'utilisateur

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "role": "user",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Erreurs:**
- `404 Not Found` - Utilisateur non trouvé

---

#### `PUT /users/:id`

Mettre à jour un utilisateur.

**Authentification requise**

**URL Parameters:**
- `id` (UUID) - ID de l'utilisateur

**Request Body (tous optionnels):**
```json
{
  "username": "new_username",
  "first_name": "NewName",
  "last_name": "NewLastName",
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "new_username",
  "first_name": "NewName",
  "last_name": "NewLastName",
  "email": "newemail@example.com",
  "role": "user",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Erreurs:**
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permissions insuffisantes
- `404 Not Found` - Utilisateur non trouvé

---

#### `DELETE /users/:id`

Supprimer un utilisateur.

**Authentification requise (Admin uniquement)**

**URL Parameters:**
- `id` (UUID) - ID de l'utilisateur

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

**Erreurs:**
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permissions insuffisantes
- `404 Not Found` - Utilisateur non trouvé

---

### <a name="routes-événements"></a> Événements

**Base URL:** `/api/events`

#### `GET /events/all`

Récupérer tous les événements.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Evo 2026",
    "description": "Événement en France organisé par EVO",
    "attendees": 150,
    "start_date": "2026-01-01T10:00:00Z",
    "created_at": "2026-01-01T10:00:00Z",
    "updated_at": "2026-01-01T10:00:00Z"
  }
]
```

---

#### `GET /events/:id`

Récupérer un événement par son ID.

**URL Parameters:**
- `id` (UUID) - ID de l'événement

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Evo 2026",
  "description": "Événement en France organisé par EVO",
  "attendees": 150,
  "start_date": "2026-06-15T10:00:00Z",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Erreurs:**
- `404 Not Found` - Événement non trouvé

---

#### `POST /events`

Créer un nouvel événement.

**Authentification requise (Organizer/Admin)**

**Request Body:**
```json
{
  "name": "Evo 2026",
  "description": "Événement en France organisé par EVO",
  "start_date": "2026-06-15T10:00:00Z"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Evo 2026",
  "description": "Événement en France organisé par EVO",
  "attendees": 0,
  "start_date": "2026-06-15T10:00:00Z",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Erreurs:**
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permissions insuffisantes

---

#### `PUT /events/:id`

Mettre à jour un événement.

**Authentification requise (Organizer/Admin)**

**URL Parameters:**
- `id` (UUID) - ID de l'événement

**Request Body (tous optionnels):**
```json
{
  "name": "Evo 2026 - Updated",
  "description": "Nouvelle description",
  "start_date": "2026-01-01T10:00:00Z"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Evo 2026 - Updated",
  "description": "Nouvelle description",
  "attendees": 150,
  "start_date": "2026-01-01T10:00:00Z",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

---

#### `DELETE /events/:id`

Supprimer un événement.

**Authentification requise (Organizer/Admin)**

**URL Parameters:**
- `id` (UUID) - ID de l'événement

**Response (200):**
```json
{
  "message": "Event deleted successfully"
}
```

**Erreurs:**
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permissions insuffisantes
- `404 Not Found` - Événement non trouvé

---

### <a name="routes-inscriptions"></a> Inscriptions aux événements

**Base URL:** `/api/event-registrations`

#### `POST /event-registrations`

S'inscrire à un événement.

**Authentification requise**

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201):**
```json
{
  "message": "Successfully registered for the event",
  "registration": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "user_id": "770e8400-e29b-41d4-a716-446655440000",
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "registered_at": "2026-01-01T10:00:00Z"
  }
}
```

**Erreurs:**
- `400 Bad Request` - Déjà inscrit à cet événement
- `401 Unauthorized` - Non authentifié
- `404 Not Found` - Événement non trouvé

---

#### `DELETE /event-registrations/:eventId`

Se désinscrire d'un événement.

**Authentification requise**

**URL Parameters:**
- `eventId` (UUID) - ID de l'événement

**Response (200):**
```json
{
  "message": "Successfully unregistered from the event"
}
```

**Erreurs:**
- `401 Unauthorized` - Non authentifié
- `404 Not Found` - Inscription non trouvée

---

#### `GET /event-registrations/my-events`

Récupérer les événements auxquels l'utilisateur est inscrit.

**Authentification requise**

**Response (200):**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "user_id": "770e8400-e29b-41d4-a716-446655440000",
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "registered_at": "2026-01-01T10:00:00Z",
    "event_name": "Evo 2026",
    "event_description": "Événement en France organisé par EVO",
    "event_start_date": "2026-01-01T10:00:00Z",
    "username": "john_doe"
  }
]
```

---

#### `GET /event-registrations/event/:eventId/participants`

Récupérer la liste des participants d'un événement.

**URL Parameters:**
- `eventId` (UUID) - ID de l'événement

**Response (200):**
```json
[
  {
    "user_id": "770e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe",
    "registered_at": "2026-01-01T10:00:00Z"
  }
]
```

**Erreurs:**
- `404 Not Found` - Événement non trouvé

---

#### `GET /event-registrations/check/:eventId`

Vérifier si l'utilisateur est inscrit à un événement.

**Authentification requise**

**URL Parameters:**
- `eventId` (UUID) - ID de l'événement

**Response (200):**
```json
{
  "isRegistered": true
}
```

---

### <a name="routes-tournois"></a> Tournois

**Base URL:** `/api/tournaments`

#### `GET /tournaments/all`

Récupérer tous les tournois avec détails (jeu et événement).

**Response (200):**
```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "Tournoi Guilty Gear 2026",
    "descriptions": "Tournoi Guilty Gear -Strive-",
    "attendees": 32,
    "game_id": "990e8400-e29b-41d4-a716-446655440000",
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "start_date": "2026-01-01T10:00:00Z",
    "created_at": "2026-01-01T10:00:00Z",
    "updated_at": "2026-01-01T10:00:00Z",
    "game_name": "Guilty Gear -Strive-",
    "event_name": "Evo 2026"
  }
]
```

---

#### `GET /tournaments/:id`

Récupérer un tournoi par son ID avec détails.

**URL Parameters:**
- `id` (UUID) - ID du tournoi

**Response (200):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "name": "Tournoi Guilty Gear 2026",
  "descriptions": "Tournoi Guilty Gear -Strive-",
  "attendees": 32,
  "game_id": "990e8400-e29b-41d4-a716-446655440000",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_date": "2026-06-15T14:00:00Z",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z",
  "game_name": "Guilty Gear -Strive-",
  "event_name": "Evo 2026"
}
```

**Erreurs:**
- `404 Not Found` - Tournoi non trouvé

---

#### `POST /tournaments`

Créer un nouveau tournoi.

**Authentification requise (Organizer/Admin)**

**Request Body:**
```json
{
  "name": "Tournoi Guilty Gear 2026",
  "descriptions": "Tournoi Guilty Gear -Strive-",
  "attendees": 0,
  "game_id": "990e8400-e29b-41d4-a716-446655440000",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_date": "2026-06-15T14:00:00Z"
}
```

**Response (201):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "name": "Tournoi Guilty Gear 2026",
  "descriptions": "Tournoi Guilty Gear -Strive-",
  "attendees": 0,
  "game_id": "990e8400-e29b-41d4-a716-446655440000",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_date": "2026-01-01T10:00:00Z",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Erreurs:**
- `400 Bad Request` - Jeu ou événement non trouvé
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permissions insuffisantes

---

#### `PUT /tournaments/:id`

Mettre à jour un tournoi.

**Authentification requise (Organizer/Admin)**

**URL Parameters:**
- `id` (UUID) - ID du tournoi

**Request Body (tous optionnels):**
```json
{
  "name": "Tournoi Guilty Gear 2026 - Finale",
  "attendees": 64,
  "start_date": "2026-01-01T10:00:00Z"
}
```

**Response (200):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "name": "Tournoi Guilty Gear 2026 - Finale",
  "descriptions": "Tournoi Smash Bros Ultimate",
  "attendees": 64,
  "game_id": "990e8400-e29b-41d4-a716-446655440000",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_date": "2026-01-01T10:00:00Z",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

---

#### `DELETE /tournaments/:id`

Supprimer un tournoi.

**Authentification requise (Organizer/Admin)**

**URL Parameters:**
- `id` (UUID) - ID du tournoi

**Response (200):**
```json
{
  "message": "Tournament deleted successfully"
}
```

**Erreurs:**
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permissions insuffisantes
- `404 Not Found` - Tournoi non trouvé

---

### <a name="routes-jeux"></a> Jeux

**Base URL:** `/api/games`

#### `GET /games/all`

Récupérer tous les jeux.

**Response (200):**
```json
[
  {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "name": "Guilty Gear -Strive-",
    "descriptions": "Jeu de combat par Arc System Works",
    "created_at": "2026-01-01T10:00:00Z",
    "updated_at": "2026-01-01T10:00:00Z"
  }
]
```

---

#### `GET /games/:id`

Récupérer un jeu par son ID.

**URL Parameters:**
- `id` (UUID) - ID du jeu

**Response (200):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "name": "Guilty Gear -Strive-",
  "descriptions": "Jeu de combat par Arc System Works",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Erreurs:**
- `404 Not Found` - Jeu non trouvé

---

#### `POST /games`

Créer un nouveau jeu.

**Authentification requise (Admin)**

**Request Body:**
```json
{
  "name": "Guilty Gear -Strive-",
  "descriptions": "Jeu de combat par Arc System Works"
}
```

**Response (201):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "name": "Guilty Gear -Strive-",
  "descriptions": "Jeu de combat par Arc System Works",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Erreurs:**
- `400 Bad Request` - Nom de jeu déjà utilisé
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permissions insuffisantes

---

#### `PUT /games/:id`

Mettre à jour un jeu.

**Authentification requise (Admin)**

**URL Parameters:**
- `id` (UUID) - ID du jeu

**Request Body (tous optionnels):**
```json
{
  "name": "SSBU",
  "descriptions": "Nouvelle description"
}
```

**Response (200):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "name": "SSBU",
  "descriptions": "Nouvelle description",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

---

#### `DELETE /games/:id`

Supprimer un jeu.

**Authentification requise (Admin)**

**URL Parameters:**
- `id` (UUID) - ID du jeu

**Response (200):**
```json
{
  "message": "Game deleted successfully"
}
```

**Erreurs:**
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permissions insuffisantes
- `404 Not Found` - Jeu non trouvé

---

## Structure de la base de données

```
users
├── id (UUID, PK)
├── username (TEXT, UNIQUE)
├── first_name (TEXT)
├── last_name (TEXT)
├── role (ENUM: user, organizer, admin)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

user_auth
├── user_id (UUID, PK, FK → users)
├── email (TEXT, UNIQUE)
└── password_hash (TEXT)

refresh_tokens
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── token_hash (TEXT, UNIQUE)
├── expires_at (TIMESTAMP)
└── created_at (TIMESTAMP)

events
├── id (UUID, PK)
├── name (TEXT)
├── description (TEXT)
├── attendees (INTEGER)
├── start_date (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

games
├── id (UUID, PK)
├── name (TEXT, UNIQUE)
├── descriptions (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

tournaments
├── id (UUID, PK)
├── name (TEXT)
├── descriptions (TEXT)
├── attendees (INTEGER)
├── game_id (UUID, FK → games)
├── event_id (UUID, FK → events)
├── start_date (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

event_registrations
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── event_id (UUID, FK → events)
├── registered_at (TIMESTAMP)
└── UNIQUE(user_id, event_id)

matches
├── id (UUID, PK)
├── tournament_id (UUID, FK → tournaments)
├── score (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```