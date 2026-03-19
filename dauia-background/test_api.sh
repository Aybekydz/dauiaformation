#!/bin/bash
# ═══════════════════════════════════════════════════════════
# DAU'IA — Tests complets de l'API Backend
# ═══════════════════════════════════════════════════════════
#
# Prérequis :
#   1. MySQL lancé + schema.sql importé
#   2. php -S localhost:8000 api/index.php
#   3. .env configuré
#
# Usage :
#   chmod +x test_api.sh && ./test_api.sh

BASE="http://localhost:8000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
PASS=0
FAIL=0

# ── Helpers ───────────────────────────────────────────────
check() {
    local name="$1" expected="$2" actual="$3"
    if [ "$actual" = "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $name (HTTP $actual)"
        PASS=$((PASS+1))
    else
        echo -e "  ${RED}✗${NC} $name — attendu $expected, reçu $actual"
        FAIL=$((FAIL+1))
    fi
}

call() {
    local method="$1" url="$2" data="$3" token="$4"
    local auth_header=""
    if [ -n "$token" ]; then
        auth_header="-H \"Authorization: Bearer $token\""
    fi
    if [ "$method" = "GET" ] || [ "$method" = "DELETE" ]; then
        eval curl -s -w '\\n%{http_code}' -X "$method" "\"$BASE$url\"" \
            -H "'Content-Type: application/json'" $auth_header
    else
        eval curl -s -w '\\n%{http_code}' -X "$method" "\"$BASE$url\"" \
            -H "'Content-Type: application/json'" $auth_header \
            -d "'$data'"
    fi
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  🧪 DAU'IA — Tests API Backend"
echo "═══════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 1. AUTH : Inscription ──${NC}"
# ═══════════════════════════════════════════════════════════

# 1a. Inscription valide
RESULT=$(call POST /api/auth/register '{"name":"Alice Durand","email":"alice.durand@dauphine.psl.eu","password":"Dauphine2026!"}')
HTTP=$(echo "$RESULT" | tail -1)
check "Inscription étudiant" "201" "$HTTP"

# 1b. Email non-Dauphine
RESULT=$(call POST /api/auth/register '{"name":"Hacker","email":"hacker@gmail.com","password":"Dauphine2026!"}')
HTTP=$(echo "$RESULT" | tail -1)
check "Rejet email non-Dauphine" "422" "$HTTP"

# 1c. Mot de passe faible
RESULT=$(call POST /api/auth/register '{"name":"Bob","email":"bob@dauphine.psl.eu","password":"1234"}')
HTTP=$(echo "$RESULT" | tail -1)
check "Rejet mdp faible" "422" "$HTTP"

# 1d. Inscription modérateur (si dans moderators.json)
RESULT=$(call POST /api/auth/register '{"name":"Modo Test","email":"admin@dauphine.psl.eu","password":"Dauphine2026!"}')
HTTP=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check "Inscription modérateur" "201" "$HTTP"
# Vérifier que le rôle est bien moderateur
ROLE=$(echo "$BODY" | grep -o '"role":"[^"]*"' | head -1)
if echo "$ROLE" | grep -q "moderateur"; then
    echo -e "  ${GREEN}✓${NC} Rôle moderateur attribué automatiquement"
    PASS=$((PASS+1))
else
    echo -e "  ${RED}✗${NC} Rôle attendu: moderateur, obtenu: $ROLE"
    FAIL=$((FAIL+1))
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 2. AUTH : Login avant vérification ──${NC}"
# ═══════════════════════════════════════════════════════════

RESULT=$(call POST /api/auth/login '{"email":"alice.durand@dauphine.psl.eu","password":"Dauphine2026!"}')
HTTP=$(echo "$RESULT" | tail -1)
check "Login bloqué (email non vérifié)" "403" "$HTTP"

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 3. AUTH : Vérification email ──${NC}"
# ═══════════════════════════════════════════════════════════

# Token fictif
RESULT=$(call GET "/api/auth/verify?token=aaaabbbbccccddddeeeeffffaaaabbbbccccddddeeeeffffaaaabbbbccccdddd")
HTTP=$(echo "$RESULT" | tail -1)
check "Token invalide rejeté" "422" "$HTTP"

# Vérifier via SQL directement (simulation)
echo -e "  ${YELLOW}ℹ${NC} En dev, vérifiez manuellement via SQL :"
echo "    UPDATE users SET email_verified=1, verify_token=NULL WHERE email='alice.durand@dauphine.psl.eu';"
echo "    UPDATE users SET email_verified=1, verify_token=NULL WHERE email='admin@dauphine.psl.eu';"

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 4. AUTH : Resend + Forgot password ──${NC}"
# ═══════════════════════════════════════════════════════════

RESULT=$(call POST /api/auth/resend-verify '{"email":"alice.durand@dauphine.psl.eu"}')
HTTP=$(echo "$RESULT" | tail -1)
check "Resend verify" "200" "$HTTP"

RESULT=$(call POST /api/auth/forgot-password '{"email":"alice.durand@dauphine.psl.eu"}')
HTTP=$(echo "$RESULT" | tail -1)
check "Forgot password" "200" "$HTTP"

# Pas de fuite d'info sur email inexistant
RESULT=$(call POST /api/auth/forgot-password '{"email":"inexistant@dauphine.psl.eu"}')
HTTP=$(echo "$RESULT" | tail -1)
check "Forgot (email inexistant = même réponse)" "200" "$HTTP"

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 5. AUTH : Accès protégé ──${NC}"
# ═══════════════════════════════════════════════════════════

RESULT=$(call GET /api/auth/me)
HTTP=$(echo "$RESULT" | tail -1)
check "GET /me sans token → 401" "401" "$HTTP"

RESULT=$(call GET /api/admin/users)
HTTP=$(echo "$RESULT" | tail -1)
check "GET /admin/users sans token → 401" "401" "$HTTP"

RESULT=$(call GET /api/courses)
HTTP=$(echo "$RESULT" | tail -1)
check "GET /courses sans token → 401" "401" "$HTTP"

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 6. Connexion avec comptes démo ──${NC}"
# ═══════════════════════════════════════════════════════════

# Utiliser les comptes de seed (pré-vérifiés dans schema.sql)
# Login modérateur (seed)
RESULT=$(call POST /api/auth/login '{"email":"admin@dauphine.psl.eu","password":"Dauphine2026!"}')
HTTP=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')

# Extraire le token (si login réussi avec compte seed)
MOD_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')
if [ -n "$MOD_TOKEN" ] && [ ${#MOD_TOKEN} -gt 20 ]; then
    check "Login modérateur (seed)" "200" "$HTTP"
    echo -e "  ${GREEN}✓${NC} Token reçu (${#MOD_TOKEN} chars)"
    PASS=$((PASS+1))
else
    echo -e "  ${YELLOW}ℹ${NC} Login seed échoué (comptes non encore créés ou mdp différent)"
    echo "    → Importez schema.sql pour les comptes de démo"
    MOD_TOKEN=""
fi

# Login étudiant (seed)
RESULT=$(call POST /api/auth/login '{"email":"etudiant.test@dauphine.psl.eu","password":"Dauphine2026!"}')
HTTP=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
STU_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -n "$STU_TOKEN" ] && [ ${#STU_TOKEN} -gt 20 ]; then
    check "Login étudiant (seed)" "200" "$HTTP"
else
    STU_TOKEN=""
    echo -e "  ${YELLOW}ℹ${NC} Login étudiant seed non disponible"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 7. COURSES (avec auth) ──${NC}"
# ═══════════════════════════════════════════════════════════

if [ -n "$STU_TOKEN" ]; then
    RESULT=$(call GET /api/courses "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /courses (étudiant)" "200" "$HTTP"

    RESULT=$(call GET /api/courses/1 "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /courses/1" "200" "$HTTP"

    RESULT=$(call GET /api/courses/tags "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /courses/tags" "200" "$HTTP"

    RESULT=$(call GET "/api/courses?search=Python" "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /courses?search=Python" "200" "$HTTP"
else
    echo -e "  ${YELLOW}⏭${NC}  Skipped (pas de token étudiant)"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 8. ENROLLMENTS ──${NC}"
# ═══════════════════════════════════════════════════════════

if [ -n "$STU_TOKEN" ]; then
    # S'inscrire au cours 1
    RESULT=$(call POST /api/enrollments '{"course_id":1}' "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "POST /enrollments (inscription)" "201" "$HTTP"

    # Voir mes inscriptions
    RESULT=$(call GET /api/enrollments "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /enrollments" "200" "$HTTP"

    # Détail inscription
    RESULT=$(call GET /api/enrollments/1 "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /enrollments/1 (détail)" "200" "$HTTP"

    # Compléter une étape
    RESULT=$(call POST /api/progress/1 "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "POST /progress/1 (compléter étape)" "200" "$HTTP"

    # Annuler la complétion
    RESULT=$(call DELETE /api/progress/1 "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "DELETE /progress/1 (annuler)" "200" "$HTTP"

    # Double inscription
    RESULT=$(call POST /api/enrollments '{"course_id":1}' "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "Double inscription → 409" "409" "$HTTP"

    # Désinscription
    RESULT=$(call DELETE /api/enrollments/1 "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "DELETE /enrollments/1 (désinscription)" "200" "$HTTP"
else
    echo -e "  ${YELLOW}⏭${NC}  Skipped (pas de token étudiant)"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 9. ADMIN (modérateur) ──${NC}"
# ═══════════════════════════════════════════════════════════

if [ -n "$MOD_TOKEN" ]; then
    RESULT=$(call GET /api/admin/stats "" "$MOD_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /admin/stats" "200" "$HTTP"

    RESULT=$(call GET /api/admin/users "" "$MOD_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /admin/users" "200" "$HTTP"

    RESULT=$(call GET /api/admin/moderators "" "$MOD_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /admin/moderators" "200" "$HTTP"

    RESULT=$(call GET /api/admin/courses "" "$MOD_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /admin/courses (toutes)" "200" "$HTTP"

    # Créer une formation
    RESULT=$(call POST /api/admin/courses '{
        "title":"Machine Learning 101",
        "subtitle":"Introduction au ML",
        "description":"Un cours pour débuter en ML.",
        "icon":"🤖",
        "level":"Débutant",
        "duration":"8h",
        "is_published":true,
        "tags":["ML","Python","Scikit-learn"],
        "steps":[
            {"step_type":"video","title":"Intro au ML","url":"https://youtube.com/watch?v=xxx"},
            {"step_type":"lesson","title":"Régression linéaire","content":"La régression linéaire est..."},
            {"step_type":"code","title":"TP Scikit-learn","description":"Implémentez un classificateur","code":"from sklearn import..."}
        ]
    }' "$MOD_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "POST /admin/courses (création)" "201" "$HTTP"

    # Modifier
    RESULT=$(call PUT /api/admin/courses/1 '{
        "title":"Python pour la Data Science (MAJ)",
        "level":"Intermédiaire",
        "is_published":true
    }' "$MOD_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "PUT /admin/courses/1" "200" "$HTTP"

    # Stats d'un cours
    RESULT=$(call GET /api/admin/courses/1/stats "" "$MOD_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "GET /admin/courses/1/stats" "200" "$HTTP"

    # Sync rôles
    RESULT=$(call POST /api/admin/sync-roles '' "$MOD_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "POST /admin/sync-roles" "200" "$HTTP"
else
    echo -e "  ${YELLOW}⏭${NC}  Skipped (pas de token modérateur)"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 10. SÉCURITÉ : Étudiant → routes admin ──${NC}"
# ═══════════════════════════════════════════════════════════

if [ -n "$STU_TOKEN" ]; then
    RESULT=$(call GET /api/admin/users "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "Étudiant → /admin/users = 403" "403" "$HTTP"

    RESULT=$(call POST /api/admin/courses '{"title":"Hack"}' "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "Étudiant → POST /admin/courses = 403" "403" "$HTTP"

    RESULT=$(call DELETE /api/admin/courses/1 "" "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "Étudiant → DELETE /admin/courses = 403" "403" "$HTTP"

    RESULT=$(call POST /api/admin/sync-roles '' "$STU_TOKEN")
    HTTP=$(echo "$RESULT" | tail -1)
    check "Étudiant → POST /admin/sync-roles = 403" "403" "$HTTP"
else
    echo -e "  ${YELLOW}⏭${NC}  Skipped (pas de token étudiant)"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}── 11. 404 ──${NC}"
# ═══════════════════════════════════════════════════════════

RESULT=$(call GET /api/inexistant)
HTTP=$(echo "$RESULT" | tail -1)
check "Route inexistante → 404" "404" "$HTTP"

# ═══════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════"
echo -e "  Résultats : ${GREEN}$PASS passés${NC} / ${RED}$FAIL échoués${NC}"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  📧 Emails logués dans : logs/emails.log"
echo "  🔑 Pour vérifier un email manuellement :"
echo "     mysql -u root dauia -e \"UPDATE users SET email_verified=1 WHERE email='xxx@dauphine.psl.eu';\""
echo ""
