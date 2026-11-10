#!/usr/bin/env bash
# Local end-to-end test of the MVP API. Resets the LOCAL D1 state, starts `wrangler pages dev`
# on a stub dir, drives the API with curl and prints PASS/FAIL per check. No secrets, no remote.
# Usage: bash scripts/e2e-local.sh        (needs jq, curl, npx wrangler)
set -u
cd "$(dirname "$0")/.."
PORT=8788
BASE="http://localhost:$PORT"
STUB="${STUB_DIR:-${TMPDIR:-/tmp}/restaurion-e2e-stub}"
JARS="$(mktemp -d)"
LOG="$JARS/pages-dev.log"
FAILS=0

mkdir -p "$STUB"
echo '<!doctype html><title>stub</title>' > "$STUB/index.html"
echo '<!doctype html><title>404</title>' > "$STUB/404.html"

d1() { npx wrangler d1 execute restaurion-db --local "$@" 2>&1; }

echo "== reset local D1 and apply migrations"
rm -rf .wrangler/state
for f in migrations/000[1-6]_*.sql; do
  out=$(d1 --file="$f") || true
  echo "$out" | grep -q "ERROR" && { echo "migration $f FAILED"; echo "$out" | head -5; exit 2; }
done

# Seed profiles from 0001 have backfilled crafts and accepting_jobs=1, so they would match: park them.
d1 --command "UPDATE profiles SET accepting_jobs = 0" > /dev/null

echo "== start wrangler pages dev on :$PORT"
npx wrangler pages dev "$STUB" --port $PORT --d1 DB=4aab6ba2-9391-49b4-8f52-d57792274bb9 > "$LOG" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; pkill -P $SERVER 2>/dev/null; rm -rf "$JARS"' EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null "$BASE/api/jobs" && break; sleep 1; done

check() { # name, condition-result (0 = pass)
  if [ "$2" -eq 0 ]; then echo "PASS  $1"; else echo "FAIL  $1"; FAILS=$((FAILS+1)); fi
}
eq() { [ "$2" = "$3" ]; check "$1 (got '$2', want '$3')" $?; }
# api <user|-> METHOD PATH [json]  -> body in $BODY, status in $CODE
api() {
  local who=$1 method=$2 path=$3 data=${4:-}
  local args=(-s -o "$JARS/body" -w '%{http_code}' -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [ "$who" != "-" ] && args+=(-b "$JARS/$who.jar" -c "$JARS/$who.jar")
  [ -n "$data" ] && args+=(-d "$data")
  CODE=$(curl "${args[@]}"); BODY=$(cat "$JARS/body")
}
sha() { printf '%s' "$1" | shasum -a 256 | cut -d' ' -f1; }
fdate() { date -u -v+"$1"d +%F 2>/dev/null || date -u -d "+$1 days" +%F; }

D0=$(fdate 20)  # base day; main job = D+2 .. D+6 (5 days)
dd() { date -u -j -v+"$1"d -f %F "$D0" +%F 2>/dev/null || date -u -d "$D0 +$1 days" +%F; }
R_FROM=$(dd 2); R_TO=$(dd 6)

USERS="poster poster2 w1 w2 w3 w4 w5 w6"
echo "== log in $USERS via known login codes"
SQL=""
for u in $USERS; do
  SQL="$SQL INSERT INTO login_codes (email, code_hash, expires_at) VALUES ('$u@e2e.test', '$(sha "$u@e2e.test:123456")', datetime('now','+1 hour'));"
done
d1 --command "$SQL" > /dev/null
for u in $USERS; do
  api $u POST /api/auth/verify-code "{\"email\":\"$u@e2e.test\",\"code\":\"123456\",\"consent\":true}"
  eq "login $u" "$CODE" 200
done
api poster GET /api/auth/me
eq "session survives second request (me)" "$(echo "$BODY" | jq -r '.user.email')" "poster@e2e.test"
api - GET /api/auth/me
eq "me without session is null" "$(echo "$BODY" | jq -c '.user')" "null"
api poster2 POST /api/auth/verify-code '{"email":"x@e2e.test","code":"123456"}'
eq "verify-code without consent -> 400" "$CODE" 400

echo "== profiles"
put() { api $1 PUT /api/profile "$2"; eq "profile $1" "$CODE" 200; }
put poster '{"name":"Poster Jedna","phone":"+420 603 000 999","crafts":["kámen"]}'
put poster2 '{"name":"Poster Dva","phone":"+420 604 000 888"}'
put w1 '{"name":"Worker Jedna","phone":"+420 777 111 222","crafts":["kámen"],"experienceText":"10 let"}'
put w2 '{"name":"Worker Dva","phone":"+420 777 222 333","crafts":["kámen"]}'
put w3 '{"name":"Worker Tri","crafts":["kámen"]}'
put w4 '{"name":"Worker Ctyri","crafts":["dřevo","kámen"]}'
put w5 '{"name":"Worker Pet","crafts":["kámen"],"acceptingJobs":false}'
put w6 '{"name":"Worker Sest","crafts":["kov"]}'
api w1 PUT /api/profile '{"crafts":["neexistuje"]}'
eq "invalid craft -> 400 with fieldErrors" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.crafts != null')" "400/true"
api w1 PUT /api/profile '{"portfolioUrl":"javascript:alert(1)"}'
eq "portfolioUrl javascript: rejected" "$CODE" 400

echo "== availability"
api w2 POST /api/availability "{\"dateFrom\":\"$(dd 3)\",\"dateTo\":\"$(dd 4)\"}"
eq "w2 partial block" "$CODE" 201
W2_BLOCK=$(echo "$BODY" | jq -r '.block.id')
api w3 POST /api/availability "{\"dateFrom\":\"$D0\",\"dateTo\":\"$(dd 10)\"}"
eq "w3 full block" "$CODE" 201

echo "== w4 booked on another job"
api poster2 POST /api/jobs "{\"title\":\"Job A pro w4\",\"jobType\":\"subcontract_needed\",\"monumentStatus\":\"cultural_monument\",\"crafts\":[\"dřevo\"],\"region\":\"Jihomoravský kraj\",\"city\":\"Brno\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
eq "job A created" "$CODE" 201
JA=$(echo "$BODY" | jq -r '.job.id')
eq "job A notified only w4" "$(echo "$BODY" | jq -r '.notified')" 1
api w4 POST /api/jobs/$JA/respond '{"message":"mám čas"}'
eq "w4 respond A" "$CODE" 201
EA=$(echo "$BODY" | jq -r '.engagement.id')
api poster2 POST /api/engagements/$EA '{"action":"accept"}'
eq "poster2 accepts w4" "$CODE" 200

echo "== main job: matching"
api poster POST /api/jobs "{\"title\":\"Hlavni zakazka\",\"jobType\":\"subcontract_needed\",\"monumentStatus\":\"cultural_monument\",\"crafts\":[\"kámen\"],\"region\":\"Jihomoravský kraj\",\"city\":\"Mikulov\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
eq "job created" "$CODE" 201
J1=$(echo "$BODY" | jq -r '.job.id')
eq "notified count = 2 (w1 + w2)" "$(echo "$BODY" | jq -r '.notified')" 2
has_match() { api $1 GET /api/notifications; echo "$BODY" | jq -r --arg j "$2" '[.items[] | select(.type=="job_match" and .jobId==$j)] | length'; }
eq "w1 notified (no blocks)" "$(has_match w1 $J1)" 1
eq "w2 notified (partial overlap)" "$(has_match w2 $J1)" 1
api w2 GET /api/notifications
eq "w2 notification busyDays = 2" "$(echo "$BODY" | jq -r --arg j "$J1" '.items[] | select(.jobId==$j) | .busyDays')" 2
eq "w3 NOT notified (fully blocked)" "$(has_match w3 $J1)" 0
eq "w4 NOT notified (booked on A)" "$(has_match w4 $J1)" 0
eq "w5 NOT notified (accepting off)" "$(has_match w5 $J1)" 0
eq "w6 NOT notified (wrong craft)" "$(has_match w6 $J1)" 0
eq "poster NOT notified (own job)" "$(has_match poster $J1)" 0

echo "== engagements, privacy, accept"
api w1 POST /api/jobs/$J1/respond '{"message":"Dobrý den"}'
eq "w1 respond" "$CODE" 201
E1=$(echo "$BODY" | jq -r '.engagement.id')
api w1 POST /api/jobs/$J1/respond '{}'
eq "w1 respond twice -> 409" "$CODE" 409
api poster POST /api/jobs/$J1/respond '{}'
eq "poster responds to own job -> 403" "$CODE" 403
api w2 POST /api/jobs/$J1/respond '{}'
eq "w2 respond" "$CODE" 201
api poster GET /api/jobs/$J1/engagements
eq "poster sees 2 engagements" "$(echo "$BODY" | jq -r '.engagements | length')" 2
echo "$BODY" | grep -q '@'; eq "no '@' in engagements before accept" "$?" 1
echo "$BODY" | grep -qE '777|603'; eq "no phone in engagements before accept" "$?" 1
api poster GET /api/notifications
echo "$BODY" | grep -q '@'; eq "no '@' in notifications" "$?" 1
api poster2 GET /api/jobs/$J1/engagements
eq "other user engagements -> 403" "$CODE" 403
api - GET /api/jobs
echo "$BODY" | grep -q '@'; eq "no '@' in unauthenticated /api/jobs" "$?" 1
echo "$BODY" | grep -qE '777|603'; eq "no phone in unauthenticated /api/jobs" "$?" 1
api w2 GET /api/jobs
echo "$BODY" | grep -q '@'; eq "no '@' in /api/jobs for a worker without accepted engagement" "$?" 1

api poster POST /api/engagements/$E1 '{"action":"accept"}'
eq "poster accepts w1" "$CODE" 200
eq "accept returns worker contact" "$(echo "$BODY" | jq -r '.contact.email')" "w1@e2e.test"
api poster GET /api/jobs/$J1/engagements
eq "poster sees w1 contact after accept" "$(echo "$BODY" | jq -r '.engagements[] | select(.id=="'$E1'") | .workerContact.email')" "w1@e2e.test"
eq "w2 contact still hidden" "$(echo "$BODY" | jq -r '.engagements[] | select(.status=="pending") | .workerContact // "none"')" "none"
api w1 GET /api/jobs
eq "w1 sees poster contact on the job" "$(echo "$BODY" | jq -r '.jobs[] | select(.id=="'$J1'") | .posterContact.email')" "poster@e2e.test"
api w1 GET /api/profile
eq "w1 booked list has poster contact" "$(echo "$BODY" | jq -r '.profile.booked[0].posterContact.email')" "poster@e2e.test"
api w1 POST /api/engagements/$E1 '{"action":"accept"}'
eq "worker cannot accept -> 403" "$CODE" 403

echo "== accepted engagement makes dates busy; withdraw frees them"
mk_job() { api poster POST /api/jobs "{\"title\":\"$1\",\"jobType\":\"subcontract_needed\",\"monumentStatus\":\"cultural_monument\",\"crafts\":[\"kámen\"],\"region\":\"Jihomoravský kraj\",\"city\":\"Brno\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"; JOBID=$(echo "$BODY" | jq -r '.job.id'); NOTIFIED=$(echo "$BODY" | jq -r '.notified'); }
mk_job "Druha zakazka"; J2=$JOBID
eq "second job notifies only w2" "$NOTIFIED" 1
eq "w1 NOT notified of second job (busy)" "$(has_match w1 $J2)" 0
api w1 POST /api/engagements/$E1 '{"action":"withdraw"}'
eq "w1 withdraws" "$CODE" 200
api poster GET /api/notifications
eq "poster got 'withdrawn' notification" "$(echo "$BODY" | jq -r '[.items[] | select(.type=="withdrawn")] | length')" 1
mk_job "Treti zakazka"; J3=$JOBID
eq "third job notifies w1 and w2" "$NOTIFIED" 2
eq "w1 notified of third job (freed)" "$(has_match w1 $J3)" 1
api w1 POST /api/engagements/$E1 '{"action":"withdraw"}'
eq "second withdraw -> 409" "$CODE" 409

echo "== authorization"
api poster2 PATCH /api/jobs/$J1 '{"title":"Hacknuto zakazka"}'
eq "non-owner PATCH job -> 403" "$CODE" 403
api poster PATCH /api/jobs/$J3 '{"status":"closed"}'
eq "owner closes job" "$CODE/$(echo "$BODY" | jq -r '.job.status')" "200/closed"
api - GET /api/jobs
eq "closed job leaves the board" "$(echo "$BODY" | jq -r --arg j "$J3" '[.jobs[] | select(.id==$j)] | length')" 0
api poster2 DELETE /api/availability/$W2_BLOCK
eq "DELETE someone's block -> 403" "$CODE" 403
api w2 DELETE /api/availability/$W2_BLOCK
eq "owner deletes own block" "$CODE" 200
api - POST /api/jobs '{"title":"anonymni zakazka"}'; eq "unauth POST /api/jobs -> 401" "$CODE" 401
api - POST /api/availability '{}'; eq "unauth POST /api/availability -> 401" "$CODE" 401
api - PUT /api/profile '{"name":"Hacker"}'; eq "unauth PUT /api/profile -> 401" "$CODE" 401
api - POST /api/jobs/$J1/respond '{}'; eq "unauth respond -> 401" "$CODE" 401
api - POST /api/engagements/$E1 '{"action":"accept"}'; eq "unauth engagements -> 401" "$CODE" 401
api - GET /api/notifications; eq "unauth notifications -> 401" "$CODE" 401
api poster POST /api/jobs '{"title":"x"}'
eq "invalid job -> 400 with fieldErrors" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.title != null')" "400/true"
api poster POST /api/jobs "{\"title\":\"Ve včerejšku\",\"jobType\":\"craftsman_available\",\"monumentStatus\":\"cultural_monument\",\"crafts\":[\"kámen\"],\"region\":\"x\",\"city\":\"Brno\",\"dateFrom\":\"2020-01-01\",\"dateTo\":\"2020-01-02\"}"
eq "craftsman_available + past dates rejected" "$CODE/$(echo "$BODY" | jq -r '(.fieldErrors.jobType != null) and (.fieldErrors.dateFrom != null)')" "400/true"

echo "== notifications read"
api w2 GET /api/notifications
UNREAD=$(echo "$BODY" | jq -r '.unread')
FIRST=$(echo "$BODY" | jq -r '.items[0].id')
api w2 POST /api/notifications/read "{\"ids\":[\"$FIRST\"]}"
eq "read one notification decrements unread" "$(echo "$BODY" | jq -r '.unread')" "$((UNREAD-1))"
api w2 POST /api/notifications/read '{}'
eq "read all -> 0 unread" "$(echo "$BODY" | jq -r '.unread')" 0

echo "== removed routes"
for p in "GET /api/settings" "GET /api/admin/verify" "POST /api/admin/verify" "POST /api/jobs/manage" "GET /api/jobs/manage" "POST /api/licenses/verify" "GET /api/photos/x"; do
  set -- $p; api - $1 $2 '{}'
  case "$CODE" in 404|405) check "no route $p ($CODE)" 0;; *) check "no route $p (got $CODE)" 1;; esac
done

echo "== logout"
api w1 POST /api/auth/logout; eq "logout" "$CODE" 200
api w1 GET /api/auth/me
eq "session gone after logout (jar cookie expired)" "$(echo "$BODY" | jq -c '.user')" "null"

echo "== rate limit on request-code (5 per hour per email)"
for i in 1 2 3 4 5; do api - POST /api/auth/request-code '{"email":"rl@e2e.test"}'; done
eq "5th request ok" "$CODE" 200
api - POST /api/auth/request-code '{"email":"rl@e2e.test"}'
eq "6th request -> 429" "$CODE" 429

echo
if [ "$FAILS" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "$FAILS CHECK(S) FAILED (server log: $LOG)"; cp "$LOG" "${TMPDIR:-/tmp}/e2e-pages-dev.log" 2>/dev/null; fi
exit $((FAILS > 0))
