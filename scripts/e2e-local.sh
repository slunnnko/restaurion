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
for f in migrations/000[1-9]_*.sql migrations/0010_*.sql migrations/0011_*.sql migrations/0012_*.sql migrations/0013_*.sql migrations/0014_*.sql migrations/0015_*.sql migrations/0016_*.sql; do
  out=$(d1 --file="$f") || true
  echo "$out" | grep -q "ERROR" && { echo "migration $f FAILED"; echo "$out" | head -5; exit 2; }
done

# Seed profiles from 0001 have backfilled crafts and accepting_jobs=1, so they would match: park them.
d1 --command "UPDATE profiles SET accepting_jobs = 0" > /dev/null

echo "== start wrangler pages dev on :$PORT"
# admin@e2e.test is the only administrator (ADMIN_EMAILS).
npx wrangler pages dev "$STUB" --port $PORT --d1 DB=4aab6ba2-9391-49b4-8f52-d57792274bb9 --r2 JOB_PHOTOS --binding ADMIN_EMAILS=admin@e2e.test > "$LOG" 2>&1 &
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

USERS="poster poster2 w1 w2 w3 w4 w5 w6 noname admin"
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
api admin GET /api/auth/me
eq "admin@e2e.test has isAdmin true" "$(echo "$BODY" | jq -r '.user.isAdmin')" "true"
api w1 GET /api/auth/me
eq "a regular user has isAdmin false" "$(echo "$BODY" | jq -r '.user.isAdmin')" "false"
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
put w6 '{"firstName":"Karel","lastName":"Novák","phone":"777333444","whatsapp":"@Karel.N"}'
api w6 GET /api/profile
eq "firstName/lastName stored, name derived" "$(echo "$BODY" | jq -r '[.profile.firstName,.profile.lastName,.profile.name,.profile.phone,.profile.whatsapp]|join("|")')" "Karel|Novák|Karel Novák|+420 777 333 444|@karel.n"
api w6 PUT /api/profile '{"group":"unlicensed","lastName":""}'
eq "person without lastName -> 400 fieldErrors.lastName" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.lastName != null')" "400/true"
put w6 '{"name":"Worker Sest","phone":"","whatsapp":""}'
put w6 '{"companyName":"Sest Firma s.r.o."}'
api w6 GET /api/profile
eq "companyName set -> name is the company" "$(echo "$BODY" | jq -r '[.profile.companyName,.profile.name,.profile.firstName]|join("|")')" "Sest Firma s.r.o.|Sest Firma s.r.o.|Worker"
api w6 PUT /api/profile '{"group":"firm","lastName":"","companyName":""}'
eq "no company + empty lastName -> 400 lastName in any group" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.lastName != null')" "400/true"
api w6 PUT /api/profile '{"firstName":"","lastName":""}'
eq "company only (no first/last) -> 200" "$CODE" 200
put w6 '{"group":"unlicensed","firstName":"Worker","lastName":"Sest","companyName":""}'
api w1 PUT /api/profile '{"crafts":["neexistuje"]}'
eq "invalid craft -> 400 with fieldErrors" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.crafts != null')" "400/true"
api w1 PUT /api/profile '{"portfolioUrl":"javascript:alert(1)"}'
eq "portfolioUrl javascript: rejected" "$CODE" 400

echo "== a profile without a name cannot post or respond"
api noname GET /api/profile
eq "new profile has an empty name" "$(echo "$BODY" | jq -r '.profile.name')" ""
api noname POST /api/jobs "{\"title\":\"Bez jmena zakazka\",\"jobType\":\"subcontract_needed\",\"monumentStatus\":\"cultural_monument\",\"crafts\":[\"kámen\"],\"region\":\"x\",\"city\":\"Brno\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
eq "nameless POST /api/jobs -> 400 profile=name" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.profile')" "400/name"

echo "== availability"
api w2 POST /api/availability "{\"dateFrom\":\"$(dd 3)\",\"dateTo\":\"$(dd 4)\"}"
eq "w2 partial block" "$CODE" 201
W2_BLOCK=$(echo "$BODY" | jq -r '.block.id')
api w3 POST /api/availability "{\"dateFrom\":\"$D0\",\"dateTo\":\"$(dd 10)\"}"
eq "w3 full block" "$CODE" 201

echo "== availability edit (PUT)"
api w6 POST /api/availability "{\"dateFrom\":\"$(dd 150)\",\"dateTo\":\"$(dd 151)\",\"note\":\"puvodni\"}"
eq "w6 block created" "$CODE" 201
W6_BLOCK=$(echo "$BODY" | jq -r '.block.id')
api w6 PUT /api/availability/$W6_BLOCK "{\"dateFrom\":\"$(dd 152)\",\"dateTo\":\"$(dd 154)\",\"note\":\"upraveno\"}"
eq "owner edits own block" "$CODE/$(echo "$BODY" | jq -r '.block.dateFrom + "|" + .block.note')" "200/$(dd 152)|upraveno"
api w6 GET /api/profile
eq "edited block is in the profile, not duplicated" "$(echo "$BODY" | jq -r "[.profile.blocks[] | select(.id == \"$W6_BLOCK\")] | length")/$(echo "$BODY" | jq -r '.profile.blocks | length')" "1/1"
api w1 PUT /api/availability/$W6_BLOCK "{\"dateFrom\":\"$(dd 152)\",\"dateTo\":\"$(dd 154)\"}"
eq "foreign block PUT -> 404" "$CODE" 404
api w6 PUT /api/availability/b-neexistuje "{\"dateFrom\":\"$(dd 152)\",\"dateTo\":\"$(dd 154)\"}"
eq "missing block PUT -> 404" "$CODE" 404
api w6 PUT /api/availability/$W6_BLOCK '{"dateFrom":"2020-01-01","dateTo":"2020-01-02"}'
eq "PUT with a past dateTo -> 422/400 with fieldErrors" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.dateTo != null')" "400/true"
api - PUT /api/availability/$W6_BLOCK '{}'; eq "unauth PUT /api/availability/:id -> 401" "$CODE" 401
api w6 DELETE /api/availability/$W6_BLOCK
eq "w6 removes the edited block" "$CODE" 200

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

echo "== engagements, contacts for logged-in users, accept"
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
eq "poster sees worker contact before accept (e-mail)" "$(echo "$BODY" | jq -r '.engagements[] | select(.id=="'$E1'") | .workerContact.email')" "w1@e2e.test"
eq "poster sees worker contact before accept (phone)" "$(echo "$BODY" | jq -r '.engagements[] | select(.id=="'$E1'") | .workerContact.phone')" "+420 777 111 222"
api poster GET /api/notifications
echo "$BODY" | grep -q '@'; eq "no '@' in notifications" "$?" 1
api poster2 GET /api/jobs/$J1/engagements
eq "other user engagements -> 403" "$CODE" 403
api - GET /api/jobs
echo "$BODY" | grep -q '@'; eq "no '@' in unauthenticated /api/jobs" "$?" 1
echo "$BODY" | grep -qE '777|603'; eq "no phone in unauthenticated /api/jobs" "$?" 1
api w2 GET /api/jobs
eq "logged-in worker sees poster contact without any acceptance" "$(echo "$BODY" | jq -r '.jobs[] | select(.id=="'$J1'") | .posterContact.email')" "poster@e2e.test"

api poster POST /api/engagements/$E1 '{"action":"accept"}'
eq "poster accepts w1" "$CODE" 200
eq "accept returns worker contact" "$(echo "$BODY" | jq -r '.contact.email')" "w1@e2e.test"
api poster GET /api/jobs/$J1/engagements
eq "poster sees w1 contact after accept" "$(echo "$BODY" | jq -r '.engagements[] | select(.id=="'$E1'") | .workerContact.email')" "w1@e2e.test"
eq "pending w2 contact is visible too" "$(echo "$BODY" | jq -r '.engagements[] | select(.status=="pending") | .workerContact.email')" "w2@e2e.test"
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

echo "== closing a job: accept blocked, dates freed, job_closed notification"
mk_job "Ctvrta zakazka"; J4=$JOBID
eq "fourth job notifies w1 and w2" "$NOTIFIED" 2
api w2 POST /api/jobs/$J4/respond '{}'
E4=$(echo "$BODY" | jq -r '.engagement.id')
api poster PATCH /api/jobs/$J4 '{"status":"closed"}'
eq "poster closes fourth job" "$CODE" 200
api w2 GET /api/notifications
eq "w2 got job_closed" "$(echo "$BODY" | jq -r --arg j "$J4" '[.items[] | select(.type=="job_closed" and .jobId==$j)] | length')" 1
api poster POST /api/engagements/$E4 '{"action":"accept"}'
eq "accept on a closed job -> 409" "$CODE" 409
mk_job "Pata zakazka"; J5=$JOBID
api w1 POST /api/jobs/$J5/respond '{}'
E5=$(echo "$BODY" | jq -r '.engagement.id')
api poster POST /api/engagements/$E5 '{"action":"accept"}'
eq "poster accepts w1 on fifth job" "$CODE" 200
mk_job "Sesta zakazka"; J6=$JOBID
eq "w1 busy (accepted J5): sixth job notifies only w2" "$NOTIFIED" 1
api poster PATCH /api/jobs/$J5 '{"dateFrom":"2099-01-01","dateTo":"2099-01-02"}'
eq "changing dates with an accepted engagement -> 409" "$CODE" 409
api poster PATCH /api/jobs/$J5 '{"status":"closed"}'
eq "poster closes fifth job" "$CODE" 200
api poster PATCH /api/jobs/$J5 '{"status":"closed"}'
eq "closing an already closed job is idempotent -> 200" "$CODE" 200
api w1 GET /api/notifications
eq "w1 (accepted) got job_closed" "$(echo "$BODY" | jq -r --arg j "$J5" '[.items[] | select(.type=="job_closed" and .jobId==$j)] | length')" 1
api w1 GET /api/profile
eq "closed job leaves w1 booked list" "$(echo "$BODY" | jq -r '.profile.booked | length')" 0
mk_job "Sedma zakazka"; J7=$JOBID
eq "closing freed w1: seventh job notifies w1 and w2" "$NOTIFIED" 2
eq "w1 notified of seventh job" "$(has_match w1 $J7)" 1

echo "== accept when the worker is fully busy -> 409"
mk_job "Osma zakazka"; J8=$JOBID
api w3 POST /api/jobs/$J8/respond '{}'
eq "w3 (fully blocked) can express interest" "$CODE" 201
E8=$(echo "$BODY" | jq -r '.engagement.id')
api poster POST /api/engagements/$E8 '{"action":"accept"}'
eq "accept of a fully busy worker -> 409" "$CODE" 409

echo "== directory: visibility rules, privacy, filters"
d1 --command "INSERT INTO profiles (id, name, role, verification_status, region, city, bio, email, availability, consent_at) VALUES ('u-noconsent', 'Bez Souhlasu', 'unlicensed_craftsman', 'not_applicable', 'Praha', '-', '', 'noconsent@e2e.test', 'available_now', NULL);" > /dev/null
api w1 POST /api/availability "{\"dateFrom\":\"$(dd 100)\",\"dateTo\":\"$(dd 101)\",\"note\":\"SOUKROMA-POZNAMKA\"}"
eq "w1 private block with a note" "$CODE" 201
api - GET /api/directory
eq "anonymous directory -> 200" "$CODE" 200
DIR_ANON="$BODY"
eq "anonymous directory lists profiles" "$(echo "$DIR_ANON" | jq -r '(.entries | length) >= 6')" true
echo "$DIR_ANON" | grep -q '@'; eq "no '@' in anonymous /api/directory" "$?" 1
echo "$DIR_ANON" | grep -qE '777|603|604'; eq "no phone digits in anonymous /api/directory" "$?" 1
eq "anonymous entries have no contact field" "$(echo "$DIR_ANON" | jq -r '[.entries[] | select(.contact != null)] | length')" 0
echo "$DIR_ANON" | grep -qiE 'blocks|booked|dateFrom|unavailab|SOUKROMA'; eq "blocks and busy days never appear in the directory" "$?" 1
eq "profile without a name is absent" "$(echo "$DIR_ANON" | jq -r '[.entries[] | select((.name | length) < 3)] | length')" 0
eq "profile without consent is absent" "$(echo "$DIR_ANON" | jq -r '[.entries[] | select(.name == "Bez Souhlasu")] | length')" 0
api w2 GET /api/directory
eq "logged-in directory has w1 contact e-mail" "$(echo "$BODY" | jq -r '.entries[] | select(.name == "Worker Jedna") | .contact.email')" "w1@e2e.test"
eq "logged-in directory has w1 phone" "$(echo "$BODY" | jq -r '.entries[] | select(.name == "Worker Jedna") | .contact.phone')" "+420 777 111 222"
echo "$BODY" | grep -qiE 'blocks|booked|dateFrom|unavailab|SOUKROMA'; eq "blocks and busy days not in the logged-in directory either" "$?" 1

api w6 PUT /api/profile '{"directoryVisible":false}'
eq "w6 opts out of the directory" "$CODE/$(echo "$BODY" | jq -r '.profile.directoryVisible')" "200/false"
api - GET /api/directory
eq "directory_visible=0 profile is absent (anonymous)" "$(echo "$BODY" | jq -r '[.entries[] | select(.name == "Worker Sest")] | length')" 0
api w2 GET /api/directory
eq "directory_visible=0 profile is absent (logged in)" "$(echo "$BODY" | jq -r '[.entries[] | select(.name == "Worker Sest")] | length')" 0
api w6 PUT /api/profile '{"directoryVisible":true}'
api - GET /api/directory
eq "opting back in lists the profile again" "$(echo "$BODY" | jq -r '[.entries[] | select(.name == "Worker Sest")] | length')" 1

api w6 PUT /api/profile '{"group":"licensed"}'
eq "group licensed without a licence number -> 400" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.licenceNumber != null')" "400/true"
api w6 PUT /api/profile '{"group":"nonsense"}'
eq "unknown group -> 400" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.group != null')" "400/true"
api w1 PUT /api/profile '{"group":"licensed","licenceNumber":"MK-100"}'
eq "w1 (with a licence number) becomes licensed" "$CODE/$(echo "$BODY" | jq -r '.profile.group')" "200/licensed"
api w2 PUT /api/profile '{"group":"licensed","licenceNumber":"MK-300"}'
eq "w2 licensed with a number in the same request" "$CODE" 200
api w3 PUT /api/profile '{"group":"firm"}'
eq "w3 becomes a firm" "$CODE/$(echo "$BODY" | jq -r '.profile.group')" "200/firm"
api w4 PUT /api/profile '{"instagram":"https://www.instagram.com/w4.dreva/","whatsapp":"+420 777 444 555","facebook":"https://facebook.com/w4"}'
eq "w4 contact channels saved (instagram normalised)" "$CODE/$(echo "$BODY" | jq -r '.profile.instagram')" "200/w4.dreva"
api w4 PUT /api/profile '{"instagram":"bad handle!"}'
eq "invalid instagram -> 400" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.instagram != null')" "400/true"
api w4 PUT /api/profile '{"facebook":"javascript:alert(1)"}'
eq "facebook javascript: rejected" "$CODE" 400
api w4 PUT /api/profile '{"whatsapp":"123"}'
eq "invalid whatsapp -> 400" "$CODE" 400
api w2 GET /api/directory
eq "w4 contact carries instagram, whatsapp, facebook" "$(echo "$BODY" | jq -r '.entries[] | select(.name == "Worker Ctyri") | [.contact.instagram, .contact.whatsapp, .contact.facebook] | join("|")')" "w4.dreva|420777444555|https://facebook.com/w4"
api - GET "/api/directory?group=licensed"
eq "group filter licensed (w1 + w2)" "$(echo "$BODY" | jq -r '[.entries[].name] | sort | join(",")')" "Worker Dva,Worker Jedna"
api - GET "/api/directory?group=firm"
eq "group filter firm (w3)" "$(echo "$BODY" | jq -r '[.entries[].name] | join(",")')" "Worker Tri"
api - GET "/api/directory?craft=d%C5%99evo"
eq "craft filter dřevo (w4)" "$(echo "$BODY" | jq -r '[.entries[].name] | join(",")')" "Worker Ctyri"
api - GET "/api/directory?q=worker%20jedna"
eq "text filter matches the name case-insensitively" "$(echo "$BODY" | jq -r '[.entries[].name] | join(",")')" "Worker Jedna"
api - GET "/api/directory?group=bogus"
eq "unknown group filter -> empty list" "$(echo "$BODY" | jq -r '.total')" 0

echo "== offers (Nabízím se): no matching, respond is 409 (D40 invitation flow), legacy engagement keeps working"
api poster2 POST /api/jobs "{\"title\":\"Volny kamenik\",\"jobType\":\"craftsman_available\",\"crafts\":[\"kámen\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
eq "offer created" "$CODE/$(echo "$BODY" | jq -r '.job.jobType')" "201/craftsman_available"
eq "offer notifies nobody (notified 0)" "$(echo "$BODY" | jq -r '.notified')" 0
OFFER=$(echo "$BODY" | jq -r '.job.id')
ROWS=$(d1 --json --command "SELECT COUNT(*) AS n FROM notifications WHERE job_id='$OFFER'" | jq -r '.[0].results[0].n')
eq "no notification rows exist for the offer" "$ROWS" 0
api - GET /api/jobs
eq "offer is on the public board" "$(echo "$BODY" | jq -r --arg j "$OFFER" '[.jobs[] | select(.id==$j and .jobType=="craftsman_available")] | length')" 1
echo "$BODY" | grep -q '@'; eq "no '@' in anonymous /api/jobs with an offer" "$?" 1
api w1 GET /api/jobs
eq "logged-in viewer sees the offerer's contact" "$(echo "$BODY" | jq -r --arg j "$OFFER" '.jobs[] | select(.id==$j) | .posterContact.email')" "poster2@e2e.test"
api w1 POST /api/jobs/$OFFER/respond '{"message":"Zajem o spolupraci"}'
eq "respond on an offer -> 409 'Použij Poptat spolupráci.'" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Použij Poptat spolupráci."
# A legacy worker-initiated engagement on an offer (created before D40) is seeded directly.
EO=e-legacy1
d1 --command "INSERT INTO engagements (id, job_id, worker_id, message) VALUES ('$EO', '$OFFER', (SELECT id FROM profiles WHERE email='w1@e2e.test'), 'Zajem o spolupraci')" > /dev/null
api poster2 GET /api/jobs/$OFFER/engagements
eq "offerer sees the legacy interested user with contact" "$(echo "$BODY" | jq -r '.engagements[0].workerContact.email')" "w1@e2e.test"
api poster2 POST /api/engagements/$EO '{"action":"accept"}'
eq "accept on an offer -> 409" "$CODE" 409
api poster2 POST /api/engagements/$EO '{"action":"decline"}'
eq "decline on an offer -> 200" "$CODE" 200
api poster2 GET /api/jobs/$OFFER/engagements
eq "declined interest stays in the offerer's list as declined (D43)" "$(echo "$BODY" | jq -r '.engagements | map(.status) | join(",")')" "declined"
api w1 GET /api/profile
eq "an offer never books or busies anyone" "$(echo "$BODY" | jq -r '.profile.booked | length')" 0
api w1 GET /api/jobs
eq "offers carry no busy-day note" "$(echo "$BODY" | jq -r --arg j "$OFFER" '.jobs[] | select(.id==$j) | .myBusyDays // "none"')" "none"

echo "== D40 invitations: Poptat spolupráci (poster2 = offerer O, poster = viewer V)"
YEST=$(date -u -v-1d +%F 2>/dev/null || date -u -d 'yesterday' +%F)
mk_inv_job() { # title from to crafts-json -> JOBID
  api poster POST /api/jobs "{\"title\":\"$1\",\"jobType\":\"subcontract_needed\",\"monumentStatus\":\"craft_work\",\"crafts\":$4,\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$2\",\"dateTo\":\"$3\",\"rewardType\":\"negotiable\"}"; JOBID=$(echo "$BODY" | jq -r '.job.id')
}
mk_inv_job "Zakazka pro nabidku" "$R_FROM" "$R_TO" '["kámen"]'; VJ=$JOBID
mk_inv_job "Jiny obor nehodi se" "$R_FROM" "$R_TO" '["dřevo"]'; VJX=$JOBID
api poster GET /api/jobs/$OFFER/invite-options
eq "invite-options lists the fitting job, not the other-craft one" "$CODE/$(echo "$BODY" | jq -r --arg a "$VJ" --arg b "$VJX" '[.jobs[].id] as $ids | [($ids | any(. == $a)), ($ids | any(. == $b) | not)] | map(tostring) | join(",")')/$(echo "$BODY" | jq -r '.offer.id')" "200/true,true/$OFFER"
api poster2 GET /api/jobs/$OFFER/invite-options
eq "invite-options on my own offer -> 403" "$CODE" 403
api - GET /api/jobs/$OFFER/invite-options
eq "invite-options without a session -> 401" "$CODE" 401
api poster POST /api/jobs/$VJX/invite "{\"offerId\":\"$OFFER\"}"
eq "invite with a non-fitting job -> 409" "$CODE" 409
api w5 POST /api/jobs/$VJ/invite "{\"offerId\":\"$OFFER\"}"
eq "invite from a job that is not mine -> 403" "$CODE" 403
api poster POST /api/jobs/$VJ/invite "{\"offerId\":\"$J1\"}"
eq "invite to something that is not an offer -> 404" "$CODE" 404
LONG_MSG=$(printf 'x%.0s' $(seq 1 501))
api poster POST /api/jobs/$VJ/invite "{\"offerId\":\"$OFFER\",\"message\":\"$LONG_MSG\"}"
eq "invite message over 500 chars -> 400" "$CODE" 400
api poster POST /api/jobs/$VJ/invite "{\"offerId\":\"$OFFER\",\"message\":\"Mam zajem\"}"
eq "invite to the offer -> 201, deadline today + 3" "$CODE/$(echo "$BODY" | jq -r '.engagement.status + "/" + .engagement.respondBy')" "201/pending/$(fdate 3)"
VE=$(echo "$BODY" | jq -r '.engagement.id')
api poster POST /api/jobs/$VJ/invite "{\"offerId\":\"$OFFER\"}"
eq "second invite while pending -> 409" "$CODE" 409
api poster2 GET /api/notifications
eq "O got an 'invited' notification with the poster name and job title" "$(echo "$BODY" | jq -r --arg j "$VJ" '[.items[] | select(.type=="invited" and .jobId==$j and .jobTitle=="Zakazka pro nabidku" and (.posterName | length) > 0)] | length')" 1
api poster GET /api/jobs/$OFFER/invite-options
eq "invite-options shows the pending invite" "$(echo "$BODY" | jq -r --arg j "$VJ" '.jobs[] | select(.id==$j) | .invite.status + "/" + (.invite.unconfirmed | tostring)')" "pending/false"
api poster GET /api/jobs
eq "V's offer card carries myInvites" "$(echo "$BODY" | jq -r --arg j "$OFFER" '.jobs[] | select(.id==$j) | .myInvites[0].jobId + "/" + .myInvites[0].status')" "$VJ/pending"
api poster2 GET /api/invitations
eq "O sees the invitation with the poster contact" "$(echo "$BODY" | jq -r --arg j "$VJ" '.invitations[] | select(.job.id==$j) | [.status, (.unconfirmed | tostring), .job.posterContact.email, .respondBy] | join("|")')" "pending|false|poster@e2e.test|$(fdate 3)"
api poster GET /api/invitations
eq "V has no invitations as a worker" "$(echo "$BODY" | jq -r '.invitations | length')" 0
api - GET /api/invitations
eq "invitations without a session -> 401" "$CODE" 401
api poster POST /api/engagements/$VE '{"action":"accept"}'
eq "poster cannot accept his own invitation -> 409" "$CODE" 409
api w5 POST /api/engagements/$VE '{"action":"accept"}'
eq "a third user cannot decide on the invitation -> 403" "$CODE" 403
api poster2 POST /api/engagements/$VE '{"action":"accept"}'
eq "O accepts the invitation" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/accepted"
api poster2 GET /api/profile
eq "accepted invitation books O's days" "$(echo "$BODY" | jq -r --arg j "$VJ" '[.profile.booked[] | select(.jobId==$j)] | length')" 1
api poster GET /api/notifications
eq "V got 'invite_accepted'" "$(echo "$BODY" | jq -r --arg e "$VE" '[.items[] | select(.type=="invite_accepted" and .engagementId==$e)] | length')" 1
api poster POST /api/jobs/$VJ/invite "{\"offerId\":\"$OFFER\"}"
eq "invite after accept -> 409" "$CODE" 409

echo "== D40 direct listing (directOfferId): not on the board, only author and invited see it"
DFROM=$(dd 4); DTO=$(dd 8)
direct_body() { echo "{\"title\":\"$1\",\"jobType\":\"subcontract_needed\",\"monumentStatus\":\"craft_work\",\"crafts\":[\"kámen\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$2\",\"dateTo\":\"$3\",\"directOfferId\":\"$OFFER\"}"; }
api poster POST /api/jobs "$(direct_body 'Prima poptavka' "$DFROM" "$DTO")"
eq "direct listing created: 201, notified 0, visibility direct, directTo = O" "$CODE/$(echo "$BODY" | jq -r '[(.notified | tostring), .job.visibility, .job.directTo.name] | join("|")')" "201/0|direct|$(echo "$BODY" | jq -r '.job.directTo.name')"
DJ=$(echo "$BODY" | jq -r '.job.id')
eq "directTo names O" "$(echo "$BODY" | jq -r '.job.directTo.id | length > 0')" true
eq "no job_match rows for the direct listing" "$(d1 --json --command "SELECT COUNT(*) AS n FROM notifications WHERE job_id='$DJ' AND type='job_match'" | jq -r '.[0].results[0].n')" 0
api - GET /api/jobs
eq "direct listing is not on the anonymous board" "$(echo "$BODY" | jq -r --arg j "$DJ" '[.jobs[] | select(.id==$j)] | length')" 0
api w5 GET /api/jobs
eq "direct listing is not on a third user's board" "$(echo "$BODY" | jq -r --arg j "$DJ" '[.jobs[] | select(.id==$j)] | length')" 0
api w5 GET "/api/jobs?mine=1"
eq "direct listing is not in a third user's mine=1" "$(echo "$BODY" | jq -r --arg j "$DJ" '[.jobs[] | select(.id==$j)] | length')" 0
api poster GET "/api/jobs?mine=1"
eq "direct listing is in V's mine=1 with visibility direct" "$(echo "$BODY" | jq -r --arg j "$DJ" '.jobs[] | select(.id==$j) | .visibility')" "direct"
api poster2 GET /api/invitations
eq "O sees the direct listing in invitations" "$(echo "$BODY" | jq -r --arg j "$DJ" '[.invitations[] | select(.job.id==$j)] | length')" 1
api w5 POST /api/jobs/$DJ/respond '{}'
eq "a third user cannot respond to a direct listing -> 404" "$CODE" 404
api w5 GET /api/jobs/$DJ/engagements
eq "a third user cannot read its engagements -> 404/403" "$([ "$CODE" = 404 ] || [ "$CODE" = 403 ] && echo ok || echo "$CODE")" ok
api w5 PATCH /api/jobs/$DJ '{"visibility":"public"}'
eq "a third user cannot publish it -> 403" "$CODE" 403
api w5 GET /api/notifications
eq "a third user has no notification for it" "$(echo "$BODY" | jq -r --arg j "$DJ" '[.items[] | select(.jobId==$j)] | length')" 0
api poster2 GET /api/notifications
eq "O sees the direct listing's title in the notification" "$(echo "$BODY" | jq -r --arg j "$DJ" '[.items[] | select(.type=="invited" and .jobId==$j and .jobTitle=="Prima poptavka")] | length')" 1
api poster GET /api/jobs/$DJ/engagements
eq "V sees O as the single interested person (poster-initiated, pending)" "$(echo "$BODY" | jq -r '[(.engagements | length | tostring), .engagements[0].initiatedBy, .engagements[0].status, .engagements[0].workerContact.email] | join("|")')" "1|poster|pending|poster2@e2e.test"
DE=$(echo "$BODY" | jq -r '.engagements[0].id')
api poster POST /api/jobs "$(direct_body 'Vlastni nabidka' "$DFROM" "$DTO" | sed "s/$OFFER/$VJ/")"
eq "directOfferId that is not an offer -> 404" "$CODE" 404
api poster2 POST /api/jobs "$(direct_body 'Do vlastni nabidky' "$DFROM" "$DTO")"
eq "directOfferId on my own offer -> 403" "$CODE" 403
api poster POST /api/jobs "$(direct_body 'Mimo termin' "$(dd 100)" "$(dd 101)")"
eq "direct listing outside the offer's dates -> 409" "$CODE" 409

echo "== D40/D43 declined invitation stays listed, re-invite stays 409"
api poster2 POST /api/engagements/$DE '{"action":"decline"}'
eq "O declines the invitation" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/declined"
api poster GET /api/jobs/$DJ/engagements
eq "declined engagement stays in V's list (D43)" "$(echo "$BODY" | jq -r '.engagements | map(.status) | join(",")')" "declined"
api poster2 GET /api/invitations
eq "declined invitation stays in O's list as declined with canReopen (D43)" "$(echo "$BODY" | jq -r --arg j "$DJ" '.invitations[] | select(.job.id==$j) | .status + "/" + .endedBy + "/" + (.canReopen | tostring)')" "declined/worker/true"
api poster GET /api/notifications
eq "V got 'invite_declined'" "$(echo "$BODY" | jq -r --arg e "$DE" '[.items[] | select(.type=="invite_declined" and .engagementId==$e)] | length')" 1
api poster POST /api/jobs/$DJ/invite "{\"offerId\":\"$OFFER\"}"
eq "re-invite after decline -> 409 'Tuhle poptávku už odmítl.'" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Tuhle poptávku už odmítl."
api poster POST /api/jobs "$(direct_body 'Nova poptavka po odmitnuti' "$DFROM" "$DTO")"
eq "a NEW direct listing for the same offerer stays allowed" "$CODE" 201
DJN=$(echo "$BODY" | jq -r '.job.id')
api poster POST /api/jobs "$(direct_body 'Druha hned za sebou' "$DFROM" "$DTO")"
eq "a second direct listing while one waits -> 409 spam cap" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Už mu jedna poptávka čeká na potvrzení."
api poster GET "/api/jobs?mine=1"
eq "mine=1 carries directInvite: declined listing / pending listing" "$(echo "$BODY" | jq -r --arg a "$DJ" --arg b "$DJN" '[(.jobs[] | select(.id==$a) | .directInvite.status), (.jobs[] | select(.id==$b) | .directInvite.status + "/" + (.directInvite.unconfirmed | tostring))] | join(",")')" "declined,pending/false"
api poster PATCH /api/jobs/$DJN '{"visibility":"public"}'
eq "publish while the invitation waits -> 409" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Pozvánka ještě čeká na potvrzení."
api poster GET /api/jobs/$DJN/engagements
api poster POST /api/engagements/$(echo "$BODY" | jq -r '.engagements[0].id') '{"action":"decline"}'
eq "poster cancels the waiting one (frees the spam cap)" "$CODE" 200
api poster GET "/api/jobs?mine=1"
eq "cancelled listing: directInvite withdrawn" "$(echo "$BODY" | jq -r --arg b "$DJN" '.jobs[] | select(.id==$b) | .directInvite.status')" "withdrawn"
api poster PATCH /api/jobs/$DJN '{"visibility":"public"}'
eq "publish a cancelled direct listing -> 200 public" "$CODE/$(echo "$BODY" | jq -r '.job.visibility')" "200/public"
api poster2 GET /api/notifications
eq "invited O gets no job_match for the published listing" "$(echo "$BODY" | jq -r --arg j "$DJN" '[.items[] | select(.type=="job_match" and .jobId==$j)] | length')" 0
api poster GET /api/jobs/$OFFER/invite-options
eq "invite-options marks the declined listing as declined" "$(echo "$BODY" | jq -r --arg j "$DJ" '.jobs[] | select(.id==$j) | .invite.status')" "declined"

echo "== D40 deadline: unconfirmed keeps contacts and notification, re-invite resets, publish notifies"
api poster POST /api/jobs "$(direct_body 'Poptavka s lhutou' "$(dd 5)" "$(dd 7)")"
eq "second direct listing created" "$CODE" 201
DJ2=$(echo "$BODY" | jq -r '.job.id')
d1 --command "UPDATE engagements SET respond_by = '$YEST' WHERE job_id = '$DJ2'" > /dev/null
api poster2 POST /api/engagements/$(d1 --json --command "SELECT id FROM engagements WHERE job_id='$DJ2'" | jq -r '.[0].results[0].id') '{"action":"accept"}'
eq "accept after the deadline -> 409 with the deadline message" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Lhůta na potvrzení vypršela. Ozvi se zadavateli."
api poster2 GET /api/invitations
eq "unconfirmed invitation is still listed with the poster contact" "$(echo "$BODY" | jq -r --arg j "$DJ2" '.invitations[] | select(.job.id==$j) | [(.unconfirmed | tostring), .job.posterContact.email] | join("|")')" "true|poster@e2e.test"
api poster2 GET /api/notifications
eq "the 'invited' notification survives the deadline" "$(echo "$BODY" | jq -r --arg j "$DJ2" '[.items[] | select(.type=="invited" and .jobId==$j)] | length')" 1
api poster GET /api/jobs/$DJ2/engagements
eq "V sees the engagement as unconfirmed" "$(echo "$BODY" | jq -r '.engagements[0].unconfirmed')" "true"
api poster POST /api/jobs/$DJ2/invite '{}'
eq "re-send of an unconfirmed direct listing without offerId -> 201, new deadline" "$CODE/$(echo "$BODY" | jq -r '.engagement.respondBy')" "201/$(fdate 3)"
api poster2 GET /api/invitations
eq "after re-invite the invitation is confirmable again" "$(echo "$BODY" | jq -r --arg j "$DJ2" '.invitations[] | select(.job.id==$j) | .unconfirmed | tostring')" "false"
api poster PATCH /api/jobs/$DJ2 '{"visibility":"public"}'
eq "publish while the re-sent invitation waits -> 409" "$CODE" 409
d1 --command "UPDATE engagements SET respond_by = '$YEST' WHERE job_id = '$DJ2'" > /dev/null
api poster PATCH /api/jobs/$DJ2 '{"visibility":"public"}'
eq "publish an unconfirmed direct listing" "$CODE/$(echo "$BODY" | jq -r '.job.visibility')" "200/public"
api - GET /api/jobs
eq "published listing is on the board" "$(echo "$BODY" | jq -r --arg j "$DJ2" '[.jobs[] | select(.id==$j)] | length')" 1
eq "publishing sent job_match notifications" "$([ "$(d1 --json --command "SELECT COUNT(*) AS n FROM notifications WHERE job_id='$DJ2' AND type='job_match'" | jq -r '.[0].results[0].n')" -ge 1 ] && echo yes || echo no)" yes
api poster PATCH /api/jobs/$DJ2 '{"visibility":"public"}'
eq "publishing a public listing again -> 409" "$CODE" 409
api poster PATCH /api/jobs/$VJ '{"visibility":"direct"}'
eq "visibility other than public -> 400" "$CODE" 400

echo "== D40 poster cancels a pending invitation"
api poster POST /api/jobs "$(direct_body 'Poptavka ke zruseni' "$(dd 6)" "$(dd 6)")"
DJ3=$(echo "$BODY" | jq -r '.job.id')
api poster GET /api/jobs/$DJ3/engagements
CE=$(echo "$BODY" | jq -r '.engagements[0].id')
api poster POST /api/engagements/$CE '{"action":"decline"}'
eq "poster cancels his pending invitation" "$CODE" 200
api poster2 GET /api/invitations
eq "cancelled invitation stays in O's list as withdrawn by the poster (D43)" "$(echo "$BODY" | jq -r --arg j "$DJ3" '.invitations[] | select(.job.id==$j) | .status + "/" + .endedBy + "/" + (.canReopen | tostring)')" "withdrawn/poster/null"
api poster2 GET /api/notifications
eq "O got 'invite_cancelled'" "$(echo "$BODY" | jq -r --arg e "$CE" '[.items[] | select(.type=="invite_cancelled" and .engagementId==$e)] | length')" 1
api poster POST /api/jobs/$DJ3/invite "{\"offerId\":\"$OFFER\"}"
eq "re-invite after a cancel -> 201 (engagement re-opened)" "$CODE" 201
api poster POST /api/jobs "$(direct_body 'Treti pri cekajici' "$DFROM" "$DTO")"
eq "spam cap again while DJ3 waits -> 409" "$CODE" 409
api poster2 GET /api/invitations
eq "re-opened invitation is listed for O again" "$(echo "$BODY" | jq -r --arg j "$DJ3" '[.invitations[] | select(.job.id==$j)] | length')" 1

echo "== D40 review: cancelled invite then Mám zájem; invite guards"
mk_inv_job "Zruseni a zajem" "$(dd 6)" "$(dd 8)" '["kámen"]'; CJ=$JOBID
api poster POST /api/jobs/$CJ/invite "{\"offerId\":\"$OFFER\"}"
eq "invite to a public job" "$CODE" 201
api poster GET /api/jobs/$CJ/engagements
CEI=$(echo "$BODY" | jq -r '.engagements[0].id')
api poster POST /api/engagements/$CEI '{"action":"decline"}'
eq "poster cancels the invitation" "$CODE" 200
api poster2 POST /api/jobs/$CJ/respond '{}'
eq "O responds with Mám zájem after the cancel -> 201" "$CODE" 201
api poster GET /api/jobs/$CJ/engagements
eq "the re-opened engagement is worker-initiated, no deadline" "$(echo "$BODY" | jq -r '[.engagements[0].initiatedBy, (.engagements[0].respondBy // "none"), (.engagements[0].unconfirmed // false | tostring)] | join("|")')" "worker|none|false"
api poster POST /api/engagements/$CEI '{"action":"accept"}'
eq "poster accepts the worker's interest" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/accepted"
api poster POST /api/jobs "{\"title\":\"Nabidka zadavatele\",\"jobType\":\"craftsman_available\",\"crafts\":[\"kámen\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
OFFV=$(echo "$BODY" | jq -r '.job.id')
api poster2 POST /api/jobs/$OFFER/invite "{\"offerId\":\"$OFFV\"}"
eq "inviting with an offer as the :id job -> 409" "$CODE" 409
api poster2 POST /api/jobs/$OFFER/invite '{}'
eq "same without offerId -> not accepted (409/400)" "$([ "$CODE" = 409 ] || [ "$CODE" = 400 ] && echo ok || echo "$CODE")" ok

echo "== D40 worker declined on a regular listing: re-respond -> 409 'Zadavatel už vybral jinak.'"
mk_inv_job "Zakazka k odmitnuti" "$R_FROM" "$R_TO" '["kámen"]'; RJ=$JOBID
api w6 POST /api/jobs/$RJ/respond '{}'
RE=$(echo "$BODY" | jq -r '.engagement.id')
api poster POST /api/engagements/$RE '{"action":"decline"}'
eq "poster declines w6" "$CODE" 200
api w6 POST /api/jobs/$RJ/respond '{}'
eq "w6 re-respond after decline -> 409 with the text" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Zadavatel už vybral jinak."
api w6 GET /api/jobs
eq "w6 board shows the declined engagement (card text, no button)" "$(echo "$BODY" | jq -r --arg j "$RJ" '.jobs[] | select(.id==$j) | .myEngagement.status')" "declined"

echo "== D41 contact step (Kontakt navázán): worker flow"
mk_inv_job "Kontakt zakazka" "$(dd 6)" "$(dd 12)" '["kámen"]'; KJ=$JOBID
api w6 POST /api/jobs/$KJ/respond '{}'
KE=$(echo "$BODY" | jq -r '.engagement.id')
api poster POST /api/engagements/$KE '{"action":"no_deal"}'
eq "no_deal without contact -> 409" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Nejdřív potvrďte navázání kontaktu."
api w5 POST /api/engagements/$KE '{"action":"contact"}'
eq "a third user cannot confirm contact -> 403" "$CODE" 403
api - POST /api/engagements/$KE '{"action":"contact"}'
eq "contact without a session -> 401" "$CODE" 401
api w6 POST /api/engagements/$KE '{"action":"contact"}'
eq "worker confirms contact -> 200 pending with contactedAt" "$CODE/$(echo "$BODY" | jq -r '.engagement.status + "/" + (.engagement.contactedAt | length > 0 | tostring)')" "200/pending/true"
api poster GET /api/jobs/$KJ/engagements
eq "poster's engagements show contactedAt" "$(echo "$BODY" | jq -r --arg e "$KE" '.engagements[] | select(.id==$e) | (.contactedAt | length > 0) | tostring')" "true"
api poster GET /api/notifications
eq "poster got 'contacted' with the actor name" "$(echo "$BODY" | jq -r --arg e "$KE" '[.items[] | select(.type=="contacted" and .engagementId==$e and (.actorName | length) > 0 and .jobTitle=="Kontakt zakazka")] | length')" 1
api w6 POST /api/engagements/$KE '{"action":"contact"}'
eq "second contact -> 409 'Kontakt už je potvrzený.'" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Kontakt už je potvrzený."
api poster POST /api/engagements/$KE '{"action":"contact"}'
eq "contact from the other side after contact -> 409" "$CODE" 409
api w6 GET /api/jobs
eq "worker's myEngagement is pending with contactedAt" "$(echo "$BODY" | jq -r --arg j "$KJ" '.jobs[] | select(.id==$j) | .myEngagement | .status + "/" + (.contactedAt | length > 0 | tostring)')" "pending/true"
api poster POST /api/engagements/$KE '{"action":"no_deal"}'
eq "poster no_deal after contact -> 200 declined" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/declined"
api poster GET /api/jobs/$KJ/engagements
eq "no_deal engagement stays in the poster's list with contactedAt and canReopen (D43)" "$(echo "$BODY" | jq -r --arg e "$KE" '.engagements[] | select(.id==$e) | .status + "/" + .endedBy + "/" + (.contactedAt | length > 0 | tostring) + "/" + (.canReopen | tostring)')" "declined/poster/true/true"
api w6 GET /api/jobs
eq "worker's myEngagement is declined and keeps contactedAt" "$(echo "$BODY" | jq -r --arg j "$KJ" '.jobs[] | select(.id==$j) | .myEngagement | .status + "/" + (.contactedAt | length > 0 | tostring)')" "declined/true"
api w6 GET /api/notifications
eq "worker got 'no_deal'" "$(echo "$BODY" | jq -r --arg e "$KE" '[.items[] | select(.type=="no_deal" and .engagementId==$e)] | length')" 1
api w6 POST /api/engagements/$KE '{"action":"no_deal"}'
eq "no_deal on a finished engagement -> 409" "$CODE" 409

echo "== D43 reopen: only the side that ended it, with the right notification"
api w6 POST /api/engagements/$KE '{"action":"reopen"}'
eq "worker reopen of a row the poster ended -> 403" "$CODE/$(echo "$BODY" | jq -r '.error')" "403/Vrátit může jen ten, kdo jednání ukončil."
api w4 POST /api/engagements/$KE '{"action":"reopen"}'
eq "reopen by a stranger -> 403" "$CODE" 403
api poster POST /api/engagements/$KE '{"action":"reopen"}'
eq "poster reopens his no-deal -> 200 pending, contactedAt kept" "$CODE/$(echo "$BODY" | jq -r '.engagement | .status + "/" + (.contactedAt | length > 0 | tostring)')" "200/pending/true"
api poster POST /api/engagements/$KE '{"action":"reopen"}'
eq "reopen of a running engagement -> 409 'Tohle jednání není ukončené.'" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Tohle jednání není ukončené."
api w6 GET /api/notifications
eq "worker got 'reopened' with the actor name" "$(echo "$BODY" | jq -r --arg e "$KE" '[.items[] | select(.type=="reopened" and .engagementId==$e and (.actorName | length) > 0)] | length')" 1
api poster GET /api/jobs/$KJ/engagements
eq "reopened engagement is pending again and still contacted" "$(echo "$BODY" | jq -r --arg e "$KE" '.engagements[] | select(.id==$e) | .status + "/" + (.contactedAt | length > 0 | tostring) + "/" + (.canReopen | tostring)')" "pending/true/null"
api poster POST /api/engagements/$KE '{"action":"no_deal"}'
eq "poster ends it again -> declined (state restored)" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/declined"
api poster POST /api/engagements/$DE '{"action":"reopen"}'
eq "poster reopen of an invitation the worker declined -> 403" "$CODE" 403
api poster2 POST /api/engagements/$DE '{"action":"reopen"}'
eq "reopen of a direct invitation while another one waits -> 409 spam cap" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Už mu jedna poptávka čeká na potvrzení."
mk_inv_job "Kontakt a prijeti" "$(dd 6)" "$(dd 12)" '["kámen"]'; KJ2=$JOBID
api w6 POST /api/jobs/$KJ2/respond '{}'
KE2=$(echo "$BODY" | jq -r '.engagement.id')
api poster POST /api/engagements/$KE2 '{"action":"contact"}'
eq "poster confirms contact -> 200" "$CODE" 200
api w6 GET /api/notifications
eq "worker got 'contacted' from the poster" "$(echo "$BODY" | jq -r --arg e "$KE2" '[.items[] | select(.type=="contacted" and .engagementId==$e)] | length')" 1
api poster POST /api/engagements/$KE2 '{"action":"accept"}'
eq "accept after contact works" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/accepted"
api w6 POST /api/engagements/$KE2 '{"action":"no_deal"}'
eq "no_deal on an accepted engagement -> 409" "$CODE" 409
eq "'contacted' / 'no_deal' rows are never e-mailed" "$(d1 --json --command "SELECT COUNT(*) AS n FROM notifications WHERE type IN ('contacted','no_deal') AND emailed_at IS NOT NULL" | jq -r '.[0].results[0].n')" 0

echo "== D41 contact step: invitation flow (poster2 = offerer O)"
mk_inv_job "Kontakt pozvanka" "$(dd 6)" "$(dd 12)" '["kámen"]'; KI=$JOBID
api poster POST /api/jobs/$KI/invite "{\"offerId\":\"$OFFER\"}"
eq "invite for the contact test -> 201" "$CODE" 201
KIE=$(echo "$BODY" | jq -r '.engagement.id')
d1 --command "UPDATE engagements SET respond_by = '$YEST' WHERE id = '$KIE'" > /dev/null
api poster2 GET /api/invitations
eq "the invitation is unconfirmed after the deadline" "$(echo "$BODY" | jq -r --arg j "$KI" '.invitations[] | select(.job.id==$j) | .unconfirmed | tostring')" "true"
api poster2 POST /api/engagements/$KIE '{"action":"contact"}'
eq "O confirms contact on an unconfirmed invitation -> 200" "$CODE" 200
api poster2 GET /api/invitations
eq "the contacted invitation is no longer unconfirmed and carries contactedAt" "$(echo "$BODY" | jq -r --arg j "$KI" '.invitations[] | select(.job.id==$j) | [(.unconfirmed | tostring), (.contactedAt | length > 0 | tostring), .status] | join("|")')" "false|true|pending"
api poster GET /api/jobs/$KI/engagements
eq "poster sees the engagement contacted and not unconfirmed" "$(echo "$BODY" | jq -r '.engagements[0] | [(.unconfirmed // false | tostring), (.contactedAt | length > 0 | tostring)] | join("|")')" "false|true"
api poster GET /api/jobs/$OFFER/invite-options
eq "invite-options carries contactedAt of the invite" "$(echo "$BODY" | jq -r --arg j "$KI" '.jobs[] | select(.id==$j) | .invite | [(.unconfirmed | tostring), (.contactedAt | length > 0 | tostring)] | join("|")')" "false|true"
api poster2 POST /api/engagements/$KIE '{"action":"accept"}'
eq "O accepts the contacted invitation past respond_by" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/accepted"
mk_inv_job "Kontakt pozvanka 2" "$(dd 6)" "$(dd 12)" '["kámen"]'; KI2=$JOBID
api poster POST /api/jobs/$KI2/invite "{\"offerId\":\"$OFFER\"}"
KIE2=$(echo "$BODY" | jq -r '.engagement.id')
api poster2 POST /api/engagements/$KIE2 '{"action":"contact"}'
eq "O confirms contact on a fresh invitation" "$CODE" 200
api poster POST /api/engagements/$KIE2 '{"action":"decline"}'
eq "poster cancel on a contacted invitation -> 409 'Použij Nedohodli jsme se.'" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Použij Nedohodli jsme se."
api poster2 POST /api/engagements/$KIE2 '{"action":"no_deal"}'
eq "O no_deal -> 200 withdrawn" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/withdrawn"
api poster2 GET /api/invitations
eq "no_deal invitation stays in O's list as withdrawn (D43)" "$(echo "$BODY" | jq -r --arg j "$KI2" '.invitations[] | select(.job.id==$j) | .status + "/" + .endedBy')" "withdrawn/worker"
api poster GET /api/notifications
eq "poster got 'no_deal' from O" "$(echo "$BODY" | jq -r --arg e "$KIE2" '[.items[] | select(.type=="no_deal" and .engagementId==$e)] | length')" 1
api poster POST /api/engagements/$KIE2 '{"action":"reopen"}'
eq "poster reopen of an invitation O ended -> 403" "$CODE" 403
api poster2 POST /api/engagements/$KIE2 '{"action":"reopen"}'
eq "O reopens his no-deal invitation -> 200 pending, contact kept" "$CODE/$(echo "$BODY" | jq -r '.engagement | .status + "/" + (.contactedAt | length > 0 | tostring)')" "200/pending/true"
api poster GET /api/notifications
eq "poster got 'reopened' from O" "$(echo "$BODY" | jq -r --arg e "$KIE2" '[.items[] | select(.type=="reopened" and .engagementId==$e)] | length')" 1
api poster2 POST /api/engagements/$KIE2 '{"action":"no_deal"}'
eq "O ends it again (state restored)" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/withdrawn"
api poster POST /api/jobs/$KI2/invite "{\"offerId\":\"$OFFER\"}"
eq "re-invite after no_deal -> 201" "$CODE" 201
mk_inv_job "Kontakt pozvanka 3" "$(dd 6)" "$(dd 12)" '["kámen"]'; KI3=$JOBID
api poster POST /api/jobs/$KI3/invite "{\"offerId\":\"$OFFER\"}"
KIE3=$(echo "$BODY" | jq -r '.engagement.id')
api poster2 POST /api/engagements/$KIE3 '{"action":"contact"}'
api poster POST /api/engagements/$KIE3 '{"action":"no_deal"}'
eq "poster no_deal on a contacted invitation -> withdrawn" "$CODE/$(echo "$BODY" | jq -r '.engagement.status')" "200/withdrawn"
api poster POST /api/jobs/$KI3/invite "{\"offerId\":\"$OFFER\"}"
eq "re-invite after the poster's no_deal succeeds" "$CODE" 201
api poster2 GET /api/notifications
eq "O's no_deal notification carries the actor name" "$(echo "$BODY" | jq -r --arg e "$KIE3" '[.items[] | select(.type=="no_deal" and .engagementId==$e and (.actorName | length) > 0)] | length')" 1
d1 --command "UPDATE jobs SET status='archived' WHERE id='$KI3'" > /dev/null
api poster2 POST /api/engagements/$KIE3 '{"action":"contact"}'
eq "contact on a closed job -> 409 'Zakázka už není aktivní.'" "$CODE/$(echo "$BODY" | jq -r '.error')" "409/Zakázka už není aktivní."
api poster2 GET /api/invitations
eq "re-invite clears contactedAt" "$(echo "$BODY" | jq -r --arg j "$KI2" '.invitations[] | select(.job.id==$j) | [.status, (.contactedAt // "none")] | join("|")')" "pending|none"

echo "== login code brute force and second code request"
SQL="INSERT INTO login_codes (email, code_hash, expires_at) VALUES ('bf@e2e.test', '$(sha "bf@e2e.test:654321")', datetime('now','+1 hour'));"
SQL="$SQL INSERT INTO login_codes (email, code_hash, expires_at) VALUES ('cc@e2e.test', '$(sha "cc@e2e.test:111111")', datetime('now','+1 hour'));"
d1 --command "$SQL" > /dev/null
for i in 1 2 3 4 5; do api - POST /api/auth/verify-code '{"email":"bf@e2e.test","code":"000000","consent":true}'; done
eq "5th wrong code -> 401" "$CODE" 401
api - POST /api/auth/verify-code '{"email":"bf@e2e.test","code":"654321","consent":true}'
eq "6th attempt (even the right code) -> 429" "$CODE" 429
api - POST /api/auth/request-code '{"email":"cc@e2e.test"}'
eq "second code request ok" "$CODE" 200
eq "no testCode without TEST_LOGIN_ECHO" "$(echo "$BODY" | jq -r '.testCode // "none"')" "none"
api cc POST /api/auth/verify-code '{"email":"cc@e2e.test","code":"111111","consent":true}'
eq "first code still valid after a second request" "$CODE" 200

echo "== verify-code without a live code -> 401; rate limit leaves no rows for rejected attempts"
api - POST /api/auth/verify-code '{"email":"nocode@e2e.test","code":"123456","consent":true}'
eq "no unexpired code -> 401" "$CODE" 401
RL_KEY=$(sha "rl:rl2@e2e.test")
for i in 1 2 3 4 5 6 7 8; do api - POST /api/auth/request-code '{"email":"rl2@e2e.test"}'; done
eq "8th request -> 429" "$CODE" 429
ROWS=$(d1 --json --command "SELECT COUNT(*) AS n FROM rate_limit_events WHERE bucket='code-email' AND key_hash='$RL_KEY'" | jq -r '.[0].results[0].n')
eq "rejected attempts left no rate-limit rows (5 kept)" "$ROWS" 5

echo "== per-e-mail verify limit (10/h) holds even after a fresh code"
d1 --command "INSERT INTO login_codes (email, code_hash, expires_at) VALUES ('ve@e2e.test', '$(sha "ve@e2e.test:111222")', datetime('now','+1 hour'));" > /dev/null
for i in 1 2 3 4 5 6 7 8 9 10; do api - POST /api/auth/verify-code '{"email":"ve@e2e.test","code":"000000","consent":true}'; done
d1 --command "INSERT INTO login_codes (email, code_hash, expires_at) VALUES ('ve@e2e.test', '$(sha "ve@e2e.test:333444")', datetime('now','+1 hour'));" > /dev/null
api - POST /api/auth/verify-code '{"email":"ve@e2e.test","code":"333444","consent":true}'
eq "11th verify for one e-mail -> 429 despite a fresh valid code" "$CODE" 429

echo "== authorization"
api poster2 PATCH /api/jobs/$J1 '{"title":"Hacknuto zakazka"}'
eq "non-owner PATCH job -> 403" "$CODE" 403
api poster PATCH /api/jobs/$J3 '{"status":"closed"}'
eq "owner closes job" "$CODE/$(echo "$BODY" | jq -r '.job.status')" "200/closed"
api - GET /api/jobs
eq "closed job leaves the board" "$(echo "$BODY" | jq -r --arg j "$J3" '[.jobs[] | select(.id==$j)] | length')" 0
api poster PATCH /api/jobs/$J3 '{"title":"Upraveno po ukončení"}'
eq "PATCH on a closed job -> 409" "$CODE" 409
api - GET "/api/jobs?mine=1"
eq "GET /api/jobs?mine=1 without session -> 401" "$CODE" 401
api poster GET "/api/jobs?mine=1"
eq "mine=1 includes the closed job with status closed" "$(echo "$BODY" | jq -r --arg j "$J3" '[.jobs[] | select(.id==$j and .status=="closed" and .isMine==true)] | length')" 1
api poster2 GET "/api/jobs?mine=1"
eq "mine=1 never lists someone else's jobs" "$(echo "$BODY" | jq -r --arg j "$J3" '[.jobs[] | select(.id==$j)] | length')" 0
api poster PATCH /api/jobs/$J1 '{"title":"Upravená zakázka","crafts":["kámen","dřevo"]}'
eq "owner edits title + crafts" "$CODE/$(echo "$BODY" | jq -r '.job.title')/$(echo "$BODY" | jq -r '.job.crafts | length')" "200/Upravená zakázka/2"
api poster PATCH /api/jobs/$J1 '{"crafts":["neexistuje"]}'
eq "unknown craft id on edit -> 400" "$CODE" 400
api poster PATCH /api/jobs/$J1 '{"crafts":[]}'
eq "edit with empty crafts -> 400" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.crafts != null')" "400/true"
api poster PATCH /api/jobs/$J1 '{"jobType":"craftsman_available"}'
eq "changing jobType -> 400" "$CODE" 400
api poster2 PATCH /api/jobs/$OFFER '{"title":"Volný kameník upraveno","city":"Brno"}'
eq "offer edited by its owner" "$CODE/$(echo "$BODY" | jq -r '.job.city')" "200/Brno"
api poster2 PATCH /api/jobs/$OFFER '{"status":"closed"}'
eq "offer closed by its owner" "$CODE/$(echo "$BODY" | jq -r '.job.status')" "200/closed"
api poster2 DELETE /api/availability/$W2_BLOCK
eq "DELETE someone's block -> 403" "$CODE" 403
api w2 DELETE /api/availability/$W2_BLOCK
eq "owner deletes own block" "$CODE" 200

echo "== structured reward (offers, so nobody is notified)"
OFFER_BASE="\"jobType\":\"craftsman_available\",\"crafts\":[\"kámen\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\""
api poster POST /api/jobs "{\"title\":\"Odměna bez rozsahu\",$OFFER_BASE,\"rewardType\":\"fixed\",\"rewardAmount\":25000,\"rewardCurrency\":\"CZK\"}"
eq "fixed reward without a scope -> 400" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.rewardScope != null')" "400/true"
api poster POST /api/jobs "{\"title\":\"Odměna bez částky\",$OFFER_BASE,\"rewardType\":\"hourly\"}"
eq "hourly reward without an amount -> 400" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.rewardAmount != null')" "400/true"
api poster POST /api/jobs "{\"title\":\"Odměna s rozsahem\",$OFFER_BASE,\"rewardType\":\"fixed\",\"rewardAmount\":25000,\"rewardCurrency\":\"CZK\",\"rewardScope\":\"Oprava fasády do 40 m2, materiál v ceně\"}"
eq "fixed reward with a scope -> 201 and returned reward" "$CODE/$(echo "$BODY" | jq -r '[.job.reward.type, .job.reward.amount, .job.reward.currency, .job.budgetNote] | join("|")')" "201/fixed|25000|CZK|25 000 Kč za celou práci"
JREW=$(echo "$BODY" | jq -r '.job.id')
api poster PATCH /api/jobs/$JREW '{"rewardType":"hourly","rewardAmount":450,"rewardCurrency":"EUR"}'
eq "edit to hourly -> 200, scope cleared" "$CODE/$(echo "$BODY" | jq -r '[.job.reward.type, .job.reward.amount, .job.reward.currency, .job.budgetNote, (.job.reward.scope // "none")] | join("|")')" "200/hourly|450|EUR|450 €/hod|none"
api poster PATCH /api/jobs/$JREW '{"rewardType":"fixed","rewardAmount":900,"rewardCurrency":"CZK"}'
eq "edit to fixed without a scope -> 400" "$CODE" 400
api poster PATCH /api/jobs/$JREW '{"rewardAmount":900}'
eq "PATCH rewardAmount without rewardType -> 400" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.rewardType')" "400/Vyber typ odměny."
api poster POST /api/jobs "{\"title\":\"Odměna dohodou\",$OFFER_BASE,\"rewardType\":\"negotiable\",\"rewardAmount\":999}"
eq "negotiable ignores the amount" "$CODE/$(echo "$BODY" | jq -r '[.job.reward.type, (.job.reward.amount // "none"), .job.budgetNote] | join("|")')" "201/negotiable|none|Dohodou"
api - POST /api/jobs '{"title":"anonymni zakazka"}'; eq "unauth POST /api/jobs -> 401" "$CODE" 401
api - POST /api/availability '{}'; eq "unauth POST /api/availability -> 401" "$CODE" 401
api - PUT /api/profile '{"name":"Hacker"}'; eq "unauth PUT /api/profile -> 401" "$CODE" 401
api - POST /api/jobs/$J1/respond '{}'; eq "unauth respond -> 401" "$CODE" 401
api - POST /api/engagements/$E1 '{"action":"accept"}'; eq "unauth engagements -> 401" "$CODE" 401
api - GET /api/notifications; eq "unauth notifications -> 401" "$CODE" 401
api poster POST /api/jobs '{"title":"x"}'
eq "invalid job -> 400 with fieldErrors" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.title != null')" "400/true"
api poster POST /api/jobs "{\"title\":\"Ve včerejšku\",\"jobType\":\"craftsman_available\",\"monumentStatus\":\"cultural_monument\",\"crafts\":[\"kámen\"],\"region\":\"x\",\"city\":\"Brno\",\"dateFrom\":\"2020-01-01\",\"dateTo\":\"2020-01-02\"}"
eq "craftsman_available + past dates rejected (dates only)" "$CODE/$(echo "$BODY" | jq -r '(.fieldErrors.jobType == null) and (.fieldErrors.dateFrom != null)')" "400/true"

echo "== notifications read"
api w2 GET /api/notifications
UNREAD=$(echo "$BODY" | jq -r '.unread')
FIRST=$(echo "$BODY" | jq -r '.items[0].id')
api w2 POST /api/notifications/read "{\"ids\":[\"$FIRST\"]}"
eq "read one notification decrements unread" "$(echo "$BODY" | jq -r '.unread')" "$((UNREAD-1))"
api w2 POST /api/notifications/read '{}'
eq "read all -> 0 unread" "$(echo "$BODY" | jq -r '.unread')" 0

echo "== admin soft delete of a listing"
api poster POST /api/jobs "{\"title\":\"Zakazka ke smazani\",\"jobType\":\"subcontract_needed\",\"monumentStatus\":\"cultural_monument\",\"crafts\":[\"dřevo\"],\"region\":\"Jihomoravský kraj\",\"city\":\"Brno\",\"dateFrom\":\"$(dd 60)\",\"dateTo\":\"$(dd 62)\"}"
eq "job to delete created" "$CODE" 201
JDEL=$(echo "$BODY" | jq -r '.job.id')
api w4 POST /api/jobs/$JDEL/respond '{}'
eq "w4 is interested in it" "$CODE" 201
api - DELETE /api/jobs/$JDEL; eq "unauth DELETE /api/jobs/:id -> 401" "$CODE" 401
api w1 DELETE /api/jobs/$JDEL; eq "non-admin DELETE -> 403" "$CODE" 403
api poster DELETE /api/jobs/$JDEL; eq "even the owner cannot DELETE (admin only) -> 403" "$CODE" 403
api admin DELETE /api/jobs/nonexistent; eq "admin DELETE of a missing job -> 404" "$CODE" 404
api admin DELETE /api/jobs/$JDEL; eq "admin DELETE without a reason -> 400 fieldErrors.reason (D46)" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.reason | length > 0')" "400/true"
api admin DELETE /api/jobs/$JDEL '{"reason":"ab"}'; eq "admin DELETE with a 2-char reason -> 400" "$CODE" 400
api admin DELETE /api/jobs/$JDEL '{"reason":"Mimo téma, jde o reklamu."}'; eq "admin DELETE of someone else's job with a reason -> 200" "$CODE" 200
api poster GET /api/notifications
eq "author got 'job_removed' with the reason and the title (D46)" "$(echo "$BODY" | jq -r --arg j "$JDEL" '[.items[] | select(.type=="job_removed" and .jobId==$j and .reason=="Mimo téma, jde o reklamu." and (.jobTitle | length) > 0)] | length')" 1
api admin DELETE /api/jobs/$JDEL; eq "repeated DELETE is idempotent -> 200" "$CODE" 200
api poster GET /api/notifications
eq "a repeated DELETE adds no second 'job_removed'" "$(echo "$BODY" | jq -r --arg j "$JDEL" '[.items[] | select(.type=="job_removed" and .jobId==$j)] | length')" 1
api w4 GET /api/jobs
eq "deleted job is gone from the board" "$(echo "$BODY" | jq -r "[.jobs[] | select(.id == \"$JDEL\")] | length")" 0
api poster GET '/api/jobs?mine=1'
eq "deleted job is gone from mine=1" "$(echo "$BODY" | jq -r "[.jobs[] | select(.id == \"$JDEL\")] | length")" 0
api poster PATCH /api/jobs/$JDEL '{"title":"Zmenene po smazani"}'
eq "owner PATCH of a deleted job -> 404" "$CODE" 404
api w4 POST /api/jobs/$JDEL/respond '{}'
eq "respond to a deleted job is refused" "$CODE" 404
api w4 GET /api/notifications
eq "interested worker got job_closed for it" "$(echo "$BODY" | jq -r "[.items[] | select(.jobId == \"$JDEL\" and .type == \"job_closed\")] | length")" 1
eq "job_closed after admin delete still shows the title and dates" "$(echo "$BODY" | jq -r "[.items[] | select(.jobId == \"$JDEL\" and .type == \"job_closed\") | .jobTitle] | first")" "Zakazka ke smazani"
eq "row stays in D1 (soft delete)" "$(d1 --command "SELECT visibility || '/' || status AS v FROM jobs WHERE id = '$JDEL'" | grep -o 'deleted/archived' | head -1)" "deleted/archived"

echo "== removed routes"
for p in "GET /api/settings" "GET /api/admin/verify" "POST /api/admin/verify" "POST /api/jobs/manage" "GET /api/jobs/manage" "POST /api/licenses/verify" "GET /api/photos/x" "GET /api/licence/request" "GET /api/admin/licence-requests"; do
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

echo "== TEST_LOGIN_ECHO=1 returns testCode (Resend unset)"
kill $SERVER 2>/dev/null; pkill -P $SERVER 2>/dev/null; sleep 2
npx wrangler pages dev "$STUB" --port $PORT --d1 DB=4aab6ba2-9391-49b4-8f52-d57792274bb9 --binding ADMIN_EMAILS=admin@e2e.test --binding TEST_LOGIN_ECHO=1 > "$LOG.echo" 2>&1 &
SERVER=$!
for _ in $(seq 1 60); do curl -s -o /dev/null "$BASE/api/jobs" && break; sleep 1; done
api - POST /api/auth/request-code '{"email":"echo@e2e.test"}'
TESTCODE=$(echo "$BODY" | jq -r '.testCode // "none"')
echo "$TESTCODE" | grep -qE '^[0-9]{6}$'; eq "request-code returns a 6-digit testCode (got '$TESTCODE')" "$?" 0
api echo POST /api/auth/verify-code "{\"email\":\"echo@e2e.test\",\"code\":\"$TESTCODE\",\"consent\":true,\"directoryVisible\":false}"
eq "login with the echoed code (directory checkbox off)" "$CODE/$(echo "$BODY" | jq -r '.user.directoryVisible')" "200/false"
d1 --command "DELETE FROM rate_limit_events" >/dev/null
api - POST /api/auth/request-code '{"email":"echo@e2e.test"}'
TESTCODE=$(echo "$BODY" | jq -r '.testCode // "none"')
api echo POST /api/auth/verify-code "{\"email\":\"echo@e2e.test\",\"code\":\"$TESTCODE\",\"consent\":true,\"directoryVisible\":true}"
eq "re-login with the checkbox on never re-enables an opt-out" "$CODE/$(echo "$BODY" | jq -r '.user.directoryVisible')" "200/false"
api echo PUT /api/profile '{"directoryVisible":true}'
api - POST /api/auth/request-code '{"email":"echo@e2e.test"}'
TESTCODE=$(echo "$BODY" | jq -r '.testCode // "none"')
api echo POST /api/auth/verify-code "{\"email\":\"echo@e2e.test\",\"code\":\"$TESTCODE\",\"consent\":true,\"directoryVisible\":false}"
eq "login with the checkbox off hides an existing profile" "$CODE/$(echo "$BODY" | jq -r '.user.directoryVisible')" "200/false"

echo "== password login (echo server, TEST_LOGIN_ECHO=1)"
d1 --command "DELETE FROM rate_limit_events" >/dev/null
PW1="first-password-123"; PW2="second-password-456"
api echo GET /api/auth/me
eq "me.hasPassword is false before setting one" "$(echo "$BODY" | jq -r '.user.hasPassword')" "false"
api echo POST /api/auth/password "{\"newPassword\":\"short\"}"
eq "too short new password -> 400 fieldErrors.newPassword" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.newPassword != null')" "400/true"
ECHO_SESS="UPDATE auth_sessions SET created_at = datetime('now', '%s') WHERE user_id = (SELECT id FROM profiles WHERE email = 'echo@e2e.test')"
d1 --command "$(printf "$ECHO_SESS" '-2 hours')" >/dev/null
api echo POST /api/auth/password "{\"newPassword\":\"$PW1\"}"
eq "first password from a session older than 30 min -> 403" "$CODE" 403
d1 --command "$(printf "$ECHO_SESS" '+0 minutes')" >/dev/null
api echo POST /api/auth/password "{\"newPassword\":\"$PW1\"}"
eq "set a first password (no current needed)" "$CODE/$(echo "$BODY" | jq -r '.user.hasPassword')" "200/true"
api echo GET /api/auth/me
eq "me.hasPassword is true" "$(echo "$BODY" | jq -r '.user.hasPassword')" "true"
eq "no response leaks password_hash" "$(echo "$BODY" | grep -c 'password_hash\|pbkdf2')" "0"
api echo POST /api/auth/logout
api echo GET /api/auth/me
eq "logged out" "$(echo "$BODY" | jq -c '.user')" "null"
api pw POST /api/auth/login-password "{\"email\":\"echo@e2e.test\",\"password\":\"$PW1\"}"
eq "login-password ok" "$CODE/$(echo "$BODY" | jq -r '.user.email')" "200/echo@e2e.test"
api pw GET /api/auth/me
eq "password login sets a working session" "$(echo "$BODY" | jq -r '.user.email')" "echo@e2e.test"
api - POST /api/auth/login-password "{\"email\":\"echo@e2e.test\",\"password\":\"wrong-password-000\"}"
eq "wrong password -> 401" "$CODE" 401
MSG_WRONG=$(echo "$BODY" | jq -r '.error')
api - POST /api/auth/login-password "{\"email\":\"nobody@e2e.test\",\"password\":\"$PW1\"}"
eq "unknown e-mail -> 401 with the same message" "$CODE/$(echo "$BODY" | jq -r '.error')" "401/$MSG_WRONG"
api - POST /api/auth/login-password "{\"email\":\"w6@e2e.test\",\"password\":\"$PW1\"}"
eq "account without a password -> 401 with the same message" "$CODE/$(echo "$BODY" | jq -r '.error')" "401/$MSG_WRONG"
api pw POST /api/auth/password "{\"newPassword\":\"$PW2\"}"
eq "change without currentPassword -> 400 fieldErrors.currentPassword" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.currentPassword != null')" "400/true"
api pw POST /api/auth/password "{\"currentPassword\":\"nope-nope-nope\",\"newPassword\":\"$PW2\"}"
eq "change with a wrong currentPassword -> 400" "$CODE" 400
echo "-- reset via e-mail code + newPassword"
api - POST /api/auth/request-code '{"email":"echo@e2e.test"}'
TESTCODE=$(echo "$BODY" | jq -r '.testCode // "none"')
api pwreset POST /api/auth/verify-code "{\"email\":\"echo@e2e.test\",\"code\":\"$TESTCODE\",\"consent\":true,\"newPassword\":\"short\"}"
eq "reset with a short password -> 400 and the code is not consumed" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.newPassword != null')" "400/true"
api pwreset POST /api/auth/verify-code "{\"email\":\"echo@e2e.test\",\"code\":\"$TESTCODE\",\"consent\":true,\"newPassword\":\"$PW2\"}"
eq "reset: code + newPassword" "$CODE/$(echo "$BODY" | jq -r '.user.hasPassword')" "200/true"
api pw GET /api/auth/me
eq "the session from before the reset is invalid" "$(echo "$BODY" | jq -c '.user')" "null"
api pwreset GET /api/auth/me
eq "the session created by the reset works" "$(echo "$BODY" | jq -r '.user.email')" "echo@e2e.test"
api - POST /api/auth/login-password "{\"email\":\"echo@e2e.test\",\"password\":\"$PW1\"}"
eq "old password -> 401 after reset" "$CODE" 401
api - POST /api/auth/login-password "{\"email\":\"echo@e2e.test\",\"password\":\"$PW2\"}"
eq "new password -> 200" "$CODE" 200
api pwreset POST /api/auth/password "{\"currentPassword\":\"$PW2\",\"newPassword\":\"$PW1\"}"
eq "change with the correct currentPassword" "$CODE/$(echo "$BODY" | jq -r '.user.hasPassword')" "200/true"
api pwreset GET /api/auth/me
eq "the current session survives a password change" "$(echo "$BODY" | jq -r '.user.email')" "echo@e2e.test"

echo "== listing photo (R2, local)"
PNG_B64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
printf '%s' "$PNG_B64" | base64 -d > "$JARS/tiny.png"
echo 'this is not an image, just text' > "$JARS/not-image.txt"
head -c 6000000 /dev/zero > "$JARS/big.bin"
# photo <user> METHOD <jobId> [file|photoId] -> body in $BODY, status in $CODE (raw bytes, header deliberately says image/png)
# POST <jobId> <file> adds a photo; DELETE <jobId> <photoId> removes one.
photo() {
  local url="$BASE/api/jobs/$3/photos"
  [ "$2" = DELETE ] && url="$url/${4:-none}"
  local args=(-s -o "$JARS/body" -w '%{http_code}' -X "$2" "$url" -b "$JARS/$1.jar" -c "$JARS/$1.jar")
  [ "$2" = POST ] && [ -n "${4:-}" ] && args+=(-H 'Content-Type: image/png' --data-binary "@$4")
  CODE=$(curl "${args[@]}"); BODY=$(cat "$JARS/body")
}
api poster POST /api/jobs "{\"title\":\"Nabidka s fotkou\",\"jobType\":\"craftsman_available\",\"crafts\":[\"kámen\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
PJ=$(echo "$BODY" | jq -r '.job.id')
photo poster POST "$PJ" "$JARS/tiny.png"
eq "owner uploads a PNG -> 200" "$CODE" 200
PURL=$(echo "$BODY" | jq -r '.job.imageUrl')
PID1=$(echo "$BODY" | jq -r '.job.photos[0].id')
case "$PURL" in /api/photos/jobs/*) check "imageUrl starts with /api/photos/jobs/ ($PURL)" 0;; *) check "imageUrl starts with /api/photos/jobs/ (got '$PURL')" 1;; esac
eq "photos[0].url equals imageUrl" "$(echo "$BODY" | jq -r '.job.photos[0].url')" "$PURL"
curl -s -D "$JARS/hdr" -o "$JARS/got.png" -w '%{http_code}' "$BASE$PURL" > "$JARS/code"
eq "GET the photo without a session -> 200" "$(cat "$JARS/code")" 200
eq "photo content-type is image/png" "$(grep -i '^content-type:' "$JARS/hdr" | tr -d '\r' | awk '{print tolower($2)}')" "image/png"
eq "photo has nosniff" "$(grep -ci '^x-content-type-options: nosniff' "$JARS/hdr")" 1
eq "photo bytes round-trip" "$(shasum -a 256 < "$JARS/got.png" | cut -d' ' -f1)" "$(shasum -a 256 < "$JARS/tiny.png" | cut -d' ' -f1)"
api - GET "/api/photos/jobs/../../etc/passwd"
eq "path traversal -> 404" "$CODE" 404
api - GET "/api/photos/licence/x"
eq "key outside jobs/ -> 404" "$CODE" 404
photo poster POST "$PJ" "$JARS/not-image.txt"
eq "text upload -> 400" "$CODE" 400
photo poster POST "$PJ" "$JARS/big.bin"
eq "> 5 MB -> 413" "$CODE" 413
photo poster2 POST "$PJ" "$JARS/tiny.png"
eq "other user upload -> 403" "$CODE" 403
photo poster2 DELETE "$PJ" "$PID1"
eq "other user delete -> 403" "$CODE" 403
curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/jobs/$PJ/photos" --data-binary "@$JARS/tiny.png" > "$JARS/code"
eq "upload without session -> 401" "$(cat "$JARS/code")" 401
photo poster POST "$PJ" "$JARS/tiny.png"
PID2=$(echo "$BODY" | jq -r '.job.photos[1].id')
PURL2=$(echo "$BODY" | jq -r '.job.photos[1].url')
eq "second upload -> 200, job.photos has 2, imageUrl stays the first" "$CODE/$(echo "$BODY" | jq -r '.job.photos | length')/$([ "$(echo "$BODY" | jq -r '.job.imageUrl')" = "$PURL" ] && echo same)" "200/2/same"
eq "second photo differs from the first" "$([ "$PURL2" != "$PURL" ] && echo yes)" yes
api poster GET /api/jobs
eq "the board returns both photos in order" "$(echo "$BODY" | jq -r --arg id "$PJ" '[.jobs[] | select(.id == $id) | .photos[].id] | join(",")')" "$PID1,$PID2"
for i in 3 4 5 6; do photo poster POST "$PJ" "$JARS/tiny.png"; done
eq "6th upload -> 200 with 6 photos" "$CODE/$(echo "$BODY" | jq -r '.job.photos | length')" "200/6"
photo poster POST "$PJ" "$JARS/tiny.png"
eq "7th upload -> 409 (limit 6)" "$CODE" 409
photo poster DELETE "$PJ" "does-not-exist"
eq "delete of an unknown photo -> 404" "$CODE" 404
# photo captions (D47): PATCH { caption } on the first photo, owner only
cap() { api "$1" PATCH "/api/jobs/$PJ/photos/$2" "$3"; }
cap poster "$PID1" '{"caption":"  Oltář po restaurování  "}'
eq "PATCH caption -> 200, trimmed in job.photos[0].caption" "$CODE/$(echo "$BODY" | jq -r '.job.photos[0].caption')" "200/Oltář po restaurování"
cap poster "$PID1" "{\"caption\":\"$(head -c 201 /dev/zero | tr '\0' 'x')\"}"
eq "PATCH caption of 201 characters -> 400 with fieldErrors.caption" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.caption | length > 0')" "400/true"
cap poster2 "$PID1" '{"caption":"cizí"}'
eq "PATCH caption by a non-owner -> 403" "$CODE" 403
cap poster "does-not-exist" '{"caption":"x"}'
eq "PATCH caption of an unknown photo -> 404" "$CODE" 404
cap poster "$PID1" '{"caption":""}'
eq "PATCH empty caption -> 200, caption absent" "$CODE/$(echo "$BODY" | jq -r '.job.photos[0] | has("caption")')" "200/false"
photo poster DELETE "$PJ" "$PID1"
eq "owner deletes the first photo -> 200, 5 left, imageUrl moves to the next" "$CODE/$(echo "$BODY" | jq -r '.job.photos | length')/$(echo "$BODY" | jq -r '.job.imageUrl')" "200/5/$PURL2"
eq "the deleted photo is gone from R2" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$PURL")" 404
eq "the other photo is still served" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$PURL2")" 200
for pid in $(echo "$BODY" | jq -r '.job.photos[].id'); do photo poster DELETE "$PJ" "$pid"; done
eq "deleting the last photo -> 200, imageUrl and photos gone" "$CODE/$(echo "$BODY" | jq -r '.job.imageUrl // "none"')/$(echo "$BODY" | jq -r '.job.photos // "none"')" "200/none/none"
photo poster POST "$PJ" "$JARS/tiny.png"
eq "after deleting all, a new upload works again" "$CODE/$(echo "$BODY" | jq -r '.job.photos | length')" "200/1"

api poster POST /api/jobs "{\"title\":\"Nabidka s fotkou ke smazani\",\"jobType\":\"craftsman_available\",\"crafts\":[\"kámen\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
PJ2=$(echo "$BODY" | jq -r '.job.id')
photo poster POST "$PJ2" "$JARS/tiny.png"
PURL3=$(echo "$BODY" | jq -r '.job.imageUrl')
eq "photo of a live listing -> 200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$PURL3")" 200
api admin DELETE /api/jobs/$PJ2 '{"reason":"Test odstranění"}'; eq "admin soft deletes the listing with a photo -> 200" "$CODE" 200
eq "GET the photo of a deleted listing -> 404" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$PURL3")" 404

api poster POST /api/jobs "{\"title\":\"Dlouhy popis\",\"description\":\"$(printf 'x%.0s' $(seq 1 5000))\",\"jobType\":\"craftsman_available\",\"crafts\":[\"kámen\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
eq "description of 5000 characters -> 201" "$CODE" 201
api poster POST /api/jobs "{\"title\":\"Prilis dlouhy popis\",\"description\":\"$(printf 'x%.0s' $(seq 1 5001))\",\"jobType\":\"craftsman_available\",\"crafts\":[\"kámen\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
eq "description of 5001 characters -> 400 fieldErrors.description" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.description != null')" "400/true"

echo "== theme preference"
api pwreset GET /api/auth/me
eq "me.themePreference defaults to system" "$(echo "$BODY" | jq -r '.user.themePreference')" "system"
api pwreset PUT /api/profile '{"themePreference":"light"}'
eq "PUT themePreference light -> 200 light" "$CODE/$(echo "$BODY" | jq -r '.profile.themePreference')" "200/light"
api pwreset PUT /api/profile '{"themePreference":"purple"}'
eq "invalid themePreference -> 400 fieldErrors.themePreference" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.themePreference != null')" "400/true"

echo "== withdraw reason (D38)"
api poster POST /api/jobs "{\"title\":\"Zakazka pro duvod\",\"jobType\":\"subcontract_needed\",\"monumentStatus\":\"craft_work\",\"crafts\":[\"dřevo\"],\"region\":\"Praha\",\"city\":\"Praha\",\"dateFrom\":\"$R_FROM\",\"dateTo\":\"$R_TO\"}"
WJ=$(echo "$BODY" | jq -r '.job.id')
api w2 POST /api/jobs/$WJ/respond '{}'
WE=$(echo "$BODY" | jq -r '.engagement.id')
LONG=$(printf 'x%.0s' $(seq 1 501))
api w2 POST /api/engagements/$WE "{\"action\":\"withdraw\",\"reason\":\"$LONG\"}"
eq "501-char reason -> 400 fieldErrors.reason" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.reason != null')" "400/true"
api w2 POST /api/engagements/$WE '{"action":"withdraw","reason":42}'
eq "non-string reason -> 400 fieldErrors.reason" "$CODE/$(echo "$BODY" | jq -r '.fieldErrors.reason != null')" "400/true"
EMOJI500=$(printf '😀%.0s' $(seq 1 500))
api w2 POST /api/engagements/$WE '{"action":"withdraw","reason":"Nestihnu termín"}'
eq "withdraw with a reason -> 200" "$CODE" 200
api poster GET /api/notifications
eq "poster's withdrawn notification carries the reason" "$(echo "$BODY" | jq -r --arg e "$WE" '[.items[] | select(.type=="withdrawn" and .engagementId==$e and .reason=="Nestihnu termín")] | length')" 1
api w2 POST /api/jobs/$WJ/respond '{}'
eq "re-respond after withdraw -> 201" "$CODE" 201
api w2 POST /api/engagements/$WE "{\"action\":\"withdraw\",\"reason\":\"$EMOJI500\"}"
eq "500 code points (emoji) reason -> 200" "$CODE" 200
api poster GET /api/notifications
eq "first notification's reason is unchanged" "$(echo "$BODY" | jq -r --arg e "$WE" '[.items[] | select(.type=="withdrawn" and .engagementId==$e and .reason=="Nestihnu termín")] | length')" 1
eq "second withdrawn notification has its own reason" "$(echo "$BODY" | jq -r --arg e "$WE" '[.items[] | select(.type=="withdrawn" and .engagementId==$e)] | length')" 2

echo
if [ "$FAILS" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "$FAILS CHECK(S) FAILED (server log: $LOG)"; cp "$LOG" "${TMPDIR:-/tmp}/e2e-pages-dev.log" 2>/dev/null; fi
exit $((FAILS > 0))
