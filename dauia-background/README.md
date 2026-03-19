# DAU'IA — Backend API (v2)

## Architecture

```
dauia-backend/
├── .env.example              ← Variables d'environnement
├── .htaccess                 ← Rewrite Apache + protection fichiers
├── schema.sql                ← Schéma MySQL complet (users + courses + enrollments)
├── test_api.sh               ← Tests automatisés (40+ tests)
│
├── config/
│   ├── database.php          ← Connexion BDD + constantes + ModeratorList
│   └── moderators.json       ← ⭐ Liste des modérateurs (modifiable)
│
├── models/
│   ├── User.php              ← Auth, inscription, vérification email
│   ├── Course.php            ← CRUD formations + étapes + tags
│   └── Enrollment.php        ← Inscriptions, progression, stats
│
├── middleware/
│   └── auth.php              ← Auth, rate limiting, CORS, helpers
│
├── api/
│   └── index.php             ← Routeur unique (25+ endpoints)
│
└── logs/
    └── emails.log            ← Emails logués en dev
```

## Rôles (2 uniquement)

| Rôle | Description | Peut faire |
|------|-------------|------------|
| `etudiant` | Tout étudiant Dauphine inscrit et vérifié | Voir les formations, s'inscrire, progresser |
| `moderateur` | Administrateurs de la plateforme | Tout + créer/modifier/supprimer formations, gérer utilisateurs |

### Changer les modérateurs

Éditez `config/moderators.json` :

```json
{
    "moderators": [
        "admin@dauphine.psl.eu",
        "nouveau.modo@dauphine.psl.eu"
    ]
}
```

Synchronisation automatique à l'inscription et à chaque login. Pour forcer la sync de tous les comptes : `POST /api/admin/sync-roles`.

## Installation

```bash
# 1. Configurer
cp .env.example .env     # Remplir les valeurs

# 2. Importer la base
mysql -u root -p < schema.sql

# 3. Lancer
php -S localhost:8000 api/index.php

# 4. Tester
chmod +x test_api.sh && ./test_api.sh
```

## Endpoints API

### Auth

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/auth/register` | Inscription (email Dauphine requis) | ✗ |
| POST | `/api/auth/login` | Connexion (retourne un token) | ✗ |
| POST | `/api/auth/logout` | Déconnexion | ✓ |
| GET | `/api/auth/verify?token=xxx` | Vérifie l'email | ✗ |
| POST | `/api/auth/resend-verify` | Renvoyer l'email de vérification | ✗ |
| POST | `/api/auth/forgot-password` | Demander un reset mot de passe | ✗ |
| POST | `/api/auth/reset-password` | Réinitialiser le mot de passe | ✗ |
| GET | `/api/auth/me` | Profil de l'utilisateur connecté | ✓ |

### Formations (catalogue)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/courses` | Liste des formations publiées | ✓ |
| GET | `/api/courses/tags` | Tous les tags disponibles | ✓ |
| GET | `/api/courses/{id}` | Détail d'une formation | ✓ |

Filtres disponibles : `?search=`, `?level=`, `?tag=`

### Inscriptions & Progression

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/enrollments` | Mes inscriptions + progression | ✓ |
| POST | `/api/enrollments` | S'inscrire (`{"course_id": 1}`) | ✓ |
| GET | `/api/enrollments/{courseId}` | Progression détaillée | ✓ |
| DELETE | `/api/enrollments/{courseId}` | Se désinscrire | ✓ |
| POST | `/api/progress/{stepId}` | Compléter une étape | ✓ |
| DELETE | `/api/progress/{stepId}` | Annuler la complétion | ✓ |

### Administration (modérateurs)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/stats` | Statistiques plateforme globales |
| GET | `/api/admin/users?page=1` | Liste paginée des utilisateurs |
| GET | `/api/admin/moderators` | Emails modérateurs configurés |
| POST | `/api/admin/sync-roles` | Sync rôles ↔ moderators.json |
| GET | `/api/admin/courses` | Toutes les formations (publiées ou non) |
| POST | `/api/admin/courses` | Créer une formation |
| PUT | `/api/admin/courses/{id}` | Modifier une formation |
| DELETE | `/api/admin/courses/{id}` | Supprimer une formation |
| GET | `/api/admin/courses/{id}/stats` | Stats d'inscription d'un cours |

### Exemples

**Inscription :**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@dauphine.psl.eu","password":"Dauphine2026!"}'
```

**Login :**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@dauphine.psl.eu","password":"Dauphine2026!"}'
# → { "token": "abc123...", "user": { "role": "etudiant", ... } }
```

**S'inscrire à un cours :**
```bash
curl -X POST http://localhost:8000/api/enrollments \
  -H "Authorization: Bearer abc123..." \
  -H "Content-Type: application/json" \
  -d '{"course_id": 1}'
```

**Compléter une étape :**
```bash
curl -X POST http://localhost:8000/api/progress/1 \
  -H "Authorization: Bearer abc123..."
```

**Créer une formation (modérateur) :**
```bash
curl -X POST http://localhost:8000/api/admin/courses \
  -H "Authorization: Bearer MOD_TOKEN..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ML 101",
    "level": "Débutant",
    "is_published": true,
    "tags": ["ML", "Python"],
    "steps": [
      {"step_type": "video", "title": "Intro", "url": "https://youtube.com/..."},
      {"step_type": "lesson", "title": "Théorie", "content": "..."},
      {"step_type": "code", "title": "TP", "description": "...", "code": "..."}
    ]
  }'
```

## Sécurité

| Protection | Détail |
|-----------|--------|
| Emails restreints | `@dauphine.psl.eu`, `@dauphine.eu`, `@dauphine.psl.fr` uniquement |
| Mots de passe | Bcrypt cost 12, min 8 chars + majuscule + minuscule + chiffre |
| Vérification email | Token 64 hex, expire 24h, obligatoire pour se connecter |
| Anti brute-force | Verrouillage 15 min après 5 échecs de connexion |
| Rate limiting | Par IP et action (configurable dans .env) |
| Sessions | Token opaque 128 hex chars, expire 7 jours |
| CORS | Origines whitelistées uniquement |
| Headers sécurité | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy` |
| SQL | Requêtes préparées PDO exclusivement |
| XSS | `htmlspecialchars()` sur les entrées |
| Timing attack | Hash constant même si le compte n'existe pas |
| Énumération | Réponses identiques (forgot-password, resend) |
| Fichiers | `.htaccess` bloque config/, models/, logs/, .env, .json, .sql |

## Cron (production)

```bash
# Toutes les heures
0 * * * * mysql -u dauia_user -p dauia -e "
  DELETE FROM user_sessions WHERE expires_at < NOW();
  DELETE FROM password_resets WHERE expires_at < NOW() OR used = TRUE;
  DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR);
  DELETE FROM users WHERE email_verified = FALSE AND verify_token_expires < NOW();
"
```
