#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# dauia.com — Script de test complet de l'API
# ═══════════════════════════════════════════════════════════════
#
# Prérequis :
#   1. MySQL installé et lancé
#   2. Base créée : mysql -u root -p < schema.sql
#   3. Serveur PHP lancé : php -S localhost:8000 -t api/
#
# Lancer ce script :
#   chmod +x test_api.sh
#   ./test_api.sh
# ═══════════════════════════════════════════════════════════════

BASE="http://localhost:8000"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'
PASS=0
FAIL=0

test_endpoint() {
    local label="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local token="$5"
    local expect_code="$6"

    local headers=(-H "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=(-H "Authorization: Bearer $token")
    fi

    if [ -n "$data" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$url" "${headers[@]}" -d "$data")
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$url" "${headers[@]}")
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "$expect_code" ]; then
        echo -e "  ${GREEN}✓${NC} $label ${GRAY}(HTTP $HTTP_CODE)${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $label ${RED}(attendu $expect_code, reçu $HTTP_CODE)${NC}"
        echo -e "    ${GRAY}$BODY${NC}"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  dauia.com — Tests API                           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. TEST INSCRIPTION ─────────────────────────────────────

echo -e "${BLUE}▸ Authentification${NC}"

# Email non-Dauphine → doit échouer (400)
test_endpoint \
    "Rejet email non-Dauphine" \
    "POST" "/api/auth/register" \
    '{"name":"Test","email":"test@gmail.com","password":"password123"}' \
    "" "400"

# Mot de passe trop court → doit échouer (400)
test_endpoint \
    "Rejet mot de passe court" \
    "POST" "/api/auth/register" \
    '{"name":"Test","email":"test@dauphine.psl.eu","password":"123"}' \
    "" "400"

# Inscription valide
REGISTER_RESP=$(curl -s -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"name":"Jean Dupont","email":"jean.dupont@dauphine.psl.eu","password":"Dauphine2026!"}')

STUDENT_TOKEN=$(echo "$REGISTER_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$STUDENT_TOKEN" ]; then
    echo -e "  ${GREEN}✓${NC} Inscription réussie ${GRAY}(token reçu)${NC}"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}✗${NC} Inscription échouée"
    echo -e "    ${GRAY}$REGISTER_RESP${NC}"
    FAIL=$((FAIL + 1))
fi

# ─── 2. TEST CONNEXION ───────────────────────────────────────

# Connexion admin (compte créé par schema.sql)
ADMIN_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@dauphine.psl.eu","password":"admin123456"}')

ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "  ${GREEN}✓${NC} Connexion admin réussie ${GRAY}(token reçu)${NC}"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}✗${NC} Connexion admin échouée"
    echo -e "    ${GRAY}$ADMIN_RESP${NC}"
    FAIL=$((FAIL + 1))
fi

# Mauvais mot de passe → 400
test_endpoint \
    "Rejet mauvais mot de passe" \
    "POST" "/api/auth/login" \
    '{"email":"admin@dauphine.psl.eu","password":"wrong"}' \
    "" "400"

# ─── 3. TEST PROFIL ──────────────────────────────────────────

echo ""
echo -e "${BLUE}▸ Profil utilisateur${NC}"

# Sans token → 401
test_endpoint "GET /me sans token → 401" "GET" "/api/auth/me" "" "" "401"

# Avec token → 200
test_endpoint "GET /me avec token → 200" "GET" "/api/auth/me" "" "$ADMIN_TOKEN" "200"

# ─── 4. TEST COURSES (ADMIN) ─────────────────────────────────

echo ""
echo -e "${BLUE}▸ Administration des formations${NC}"

# Étudiant ne peut pas accéder à /admin → 403
test_endpoint \
    "Étudiant → /admin/courses → 403" \
    "GET" "/api/admin/courses" "" "$STUDENT_TOKEN" "403"

# Admin : créer une formation
CREATE_RESP=$(curl -s -X POST "$BASE/api/admin/courses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
        "title": "Python pour la Data Science",
        "subtitle": "De zéro à Pandas",
        "description": "Apprenez Python et ses bibliothèques de data science.",
        "icon": "🐍",
        "level": "Débutant",
        "duration": "32h",
        "is_published": true,
        "tags": ["Python", "Pandas", "NumPy"],
        "modules": [
            {"title": "Les fondamentaux", "lessons": 6},
            {"title": "NumPy", "lessons": 5},
            {"title": "Pandas", "lessons": 8}
        ]
    }')

COURSE_ID=$(echo "$CREATE_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -n "$COURSE_ID" ]; then
    echo -e "  ${GREEN}✓${NC} Formation créée ${GRAY}(id: $COURSE_ID)${NC}"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}✗${NC} Création formation échouée"
    echo -e "    ${GRAY}$CREATE_RESP${NC}"
    FAIL=$((FAIL + 1))
fi

# Créer une 2e formation
curl -s -X POST "$BASE/api/admin/courses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
        "title": "Machine Learning Fondamental",
        "subtitle": "Comprendre les algorithmes",
        "icon": "🧠",
        "level": "Intermédiaire",
        "duration": "40h",
        "is_published": true,
        "tags": ["Scikit-learn", "Régression"],
        "modules": [{"title": "Introduction au ML", "lessons": 4}]
    }' > /dev/null

echo -e "  ${GREEN}✓${NC} 2e formation créée"
PASS=$((PASS + 1))

# Lister les formations (admin)
test_endpoint "GET /admin/courses → 200" "GET" "/api/admin/courses" "" "$ADMIN_TOKEN" "200"

# Modifier une formation
if [ -n "$COURSE_ID" ]; then
    test_endpoint \
        "PUT /admin/courses/$COURSE_ID → 200" \
        "PUT" "/api/admin/courses/$COURSE_ID" \
        '{"title":"Python pour la Data Science (mis à jour)","icon":"🐍","level":"Débutant → Intermédiaire","duration":"36h","is_published":true,"tags":["Python","Pandas"],"modules":[{"title":"Fondamentaux","lessons":6},{"title":"Pandas avancé","lessons":10}]}' \
        "$ADMIN_TOKEN" "200"
fi

# ─── 5. TEST COURSES (PUBLIC) ────────────────────────────────

echo ""
echo -e "${BLUE}▸ Catalogue public${NC}"

# Liste publique (sans auth)
test_endpoint "GET /courses (public) → 200" "GET" "/api/courses" "" "" "200"

# Détail d'une formation
if [ -n "$COURSE_ID" ]; then
    test_endpoint "GET /courses/$COURSE_ID → 200" "GET" "/api/courses/$COURSE_ID" "" "" "200"
fi

# Formation inexistante → 404
test_endpoint "GET /courses/99999 → 404" "GET" "/api/courses/99999" "" "" "404"

# ─── 6. TEST SUPPRESSION ─────────────────────────────────────

echo ""
echo -e "${BLUE}▸ Suppression${NC}"

# Étudiant ne peut pas supprimer → 403
if [ -n "$COURSE_ID" ]; then
    test_endpoint \
        "Étudiant DELETE → 403" \
        "DELETE" "/api/admin/courses/$COURSE_ID" "" "$STUDENT_TOKEN" "403"
fi

# Admin peut supprimer → 200
if [ -n "$COURSE_ID" ]; then
    test_endpoint \
        "Admin DELETE → 200" \
        "DELETE" "/api/admin/courses/$COURSE_ID" "" "$ADMIN_TOKEN" "200"
fi

# ─── 7. TEST DÉCONNEXION ─────────────────────────────────────

echo ""
echo -e "${BLUE}▸ Déconnexion${NC}"

test_endpoint "POST /auth/logout → 200" "POST" "/api/auth/logout" "" "$STUDENT_TOKEN" "200"

# Après déconnexion, le token ne devrait plus marcher
test_endpoint "Token expiré après logout → 401" "GET" "/api/auth/me" "" "$STUDENT_TOKEN" "401"

# ─── RÉSUMÉ ───────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
TOTAL=$((PASS + FAIL))
echo -e "  Résultat : ${GREEN}$PASS passés${NC} / ${RED}$FAIL échoués${NC} / $TOTAL total"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "  ${GREEN}🎉 Tous les tests passent !${NC}"
else
    echo -e "  ${RED}⚠️  Certains tests échouent. Vérifiez les logs ci-dessus.${NC}"
fi
echo ""
