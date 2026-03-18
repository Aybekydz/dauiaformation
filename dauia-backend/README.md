# dauia.com — Backend PHP

## Structure

```
dauia-backend/
├── schema.sql              ← Schéma MySQL complet (tables + vues + admin par défaut)
├── config/
│   └── database.php        ← Connexion PDO + constantes (email regex, CORS, JWT)
├── models/
│   ├── User.php            ← Inscription, connexion, sessions, validation Dauphine
│   └── Course.php          ← CRUD formations + modules + tags
├── middleware/
│   └── auth.php            ← requireAuth(), requireAdmin(), extraction token Bearer
├── api/
│   ├── index.php           ← Routeur REST (point d'entrée unique)
│   └── .htaccess           ← Réécriture URL Apache
└── README.md
```

## Installation

### 1. Base de données

```bash
mysql -u root -p < schema.sql
```

Cela crée la base `dauia` avec toutes les tables et un compte admin par défaut :
- Email : `admin@dauphine.psl.eu`
- Mot de passe : `admin123456` (à changer !)

### 2. Configuration

Éditez `config/database.php` ou définissez les variables d'environnement :

```bash
export DB_HOST=localhost
export DB_NAME=dauia
export DB_USER=votre_user
export DB_PASS=votre_mdp
export APP_URL=https://api.dauia.com
export FRONTEND_URL=https://dauia.com
```

### 3. Lancer en développement

```bash
cd dauia-backend
php -S localhost:8000 -t api/
```

### 4. Appels depuis le front-end React

```javascript
// Inscription
const res = await fetch('http://localhost:8000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Jean Dupont',
    email: 'jean.dupont@dauphine.psl.eu',
    password: 'MonMotDePasse123'
  })
});
const { user, token } = await res.json();
localStorage.setItem('dauia_token', token);

// Requêtes authentifiées
const courses = await fetch('http://localhost:8000/api/admin/courses', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Endpoints

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/auth/register` | Non | Inscription (email @dauphine.psl.eu uniquement) |
| POST | `/api/auth/login` | Non | Connexion |
| POST | `/api/auth/logout` | Oui | Déconnexion |
| GET | `/api/auth/me` | Oui | Profil courant |
| GET | `/api/courses` | Non | Formations publiées |
| GET | `/api/courses/{id}` | Non | Détail formation |
| GET | `/api/admin/courses` | Admin | Toutes les formations |
| POST | `/api/admin/courses` | Admin | Créer formation |
| PUT | `/api/admin/courses/{id}` | Admin | Modifier formation |
| DELETE | `/api/admin/courses/{id}` | Admin | Supprimer formation |

## Sécurité

- **Mots de passe** : hachés avec `password_hash()` (bcrypt, cost 12)
- **Sessions** : tokens aléatoires de 128 caractères, TTL 7 jours
- **Email** : regex côté PHP + contrainte d'unicité SQL
- **SQL** : requêtes préparées exclusivement (PDO)
- **CORS** : origines whitelistées dans la config
- **Erreurs** : stacktraces masquées en production

## Déploiement production

1. Remplacez les valeurs dans `config/database.php` par des variables d'environnement
2. Activez HTTPS obligatoire
3. Changez le mot de passe admin par défaut
4. Configurez un reverse proxy (Nginx) devant PHP-FPM
5. Activez les connexions SSL vers MySQL
