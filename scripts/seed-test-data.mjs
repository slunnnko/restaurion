#!/usr/bin/env node
// Prints SQL with realistic Czech test listings (jobs, offers, one second profile, 3 engagements).
// Usage:
//   node scripts/seed-test-data.mjs --owner-email <a> --second-email <b> [--second-name "..."] [--only seed-j-01] > out.sql
//   npx wrangler d1 execute restaurion-db --local --file=out.sql        (never add --remote without the owner's go)
// The owner profile must already exist (log in once). Re-running is harmless (INSERT OR IGNORE).
// Images are /seed/<name>.svg from public/seed/. Remove everything again with scripts/seed-test-data-remove.sql.
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const owner = opt('owner-email');
const second = opt('second-email');
const secondName = opt('second-name') || 'Slunko restaurování';
const only = opt('only');
if (!owner || !second) {
  console.error('Usage: seed-test-data.mjs --owner-email <a> --second-email <b> [--second-name "..."] [--only <jobId>]');
  process.exit(1);
}

const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const amountFmt = new Intl.NumberFormat('cs-CZ');
// Same text as formatRewardText in src/lib/format.ts (budget_note).
const budgetNote = (type, amount, cur) => {
  if (type === 'negotiable' || amount === null) return 'Dohodou';
  return `${amountFmt.format(amount)} ${cur === 'EUR' ? '€' : 'Kč'}${type === 'hourly' ? '/hod' : ' za celou práci'}`;
};
const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

const secondId = `seed-u-${createHash('sha1').update(second.toLowerCase()).digest('hex').slice(0, 8)}`;
const sub = (email) => `(SELECT id FROM profiles WHERE LOWER(email)=LOWER(${q(email)}))`;

const SCOPE_A = 'Očištění a konzervace kamenných článků, doplnění chybějících částí, spárování a závěrečná fotodokumentace. Materiál hradí zadavatel.';
const SCOPE_B = 'Pozlacení plátkovým zlatem včetně přípravy podkladu a lazur. Součástí je předávací protokol a fotodokumentace postupu.';
const SCOPE_C = 'Oprava okenních křídel, výměna poškozených částí, nový nátěr lněným olejem. Cena zahrnuje materiál i dopravu.';
const SCOPE_D = 'Výroba a osazení kopií kování podle dochovaných vzorů, povrchová úprava a předání s dokumentací.';

// o: owner A or B; t: type; m: monument status; r: [type, amount, currency, scope]
const J = [
  { id: '01', o: 'A', t: 'subcontract_needed', m: 'cultural_monument', mn: 'Zámecká jízdárna, Český Krumlov', title: 'Kameník na obnovu barokního portálu, Český Krumlov', desc: 'Hledáme zkušeného kameníka na očištění a doplnění pískovcového portálu zámecké jízdárny. Práce probíhají pod dohledem licencovaného restaurátora. Potřebujeme vlastní nářadí a praxi na památkových objektech.', crafts: ['kámen'], region: 'Jihočeský kraj', city: 'Český Krumlov', r: ['hourly', 450, 'CZK'], s: 5, l: 30, img: 'stone' },
  { id: '02', o: 'A', t: 'guarantor_needed', m: 'national_monument', mn: 'Chrám sv. Barbory, Kutná Hora', title: 'Hledám garanta s licencí MK pro sgrafita v Kutné Hoře', desc: 'Na fasádě měšťanského domu u chrámu sv. Barbory obnovujeme sgrafitovou výzdobu. Pro zpracování restaurátorského záměru a závěrečné zprávy hledáme licencovaného restaurátora nástěnných maleb.', crafts: ['malba', 'kámen'], region: 'Středočeský kraj', city: 'Kutná Hora', r: ['fixed', 60000, 'CZK', SCOPE_A], s: 14, l: 45, img: 'mural' },
  { id: '03', o: 'A', t: 'subcontract_needed', m: 'historic_unregistered', mn: 'Měšťanský dům čp. 14, Telč', title: 'Truhlář na opravu renesančního krovu a stropu, Telč', desc: 'Dům na náměstí v Telči potřebuje opravu trámového stropu a části krovu. Hledáme truhláře nebo tesaře zvyklého na tradiční spoje bez hřebíků. Termín je pevný kvůli dotaci.', crafts: ['dřevo'], region: 'Kraj Vysočina', city: 'Telč', r: ['fixed', 3200, 'EUR', SCOPE_C], s: 20, l: 40, img: 'timber' },
  { id: '04', o: 'A', t: 'craftsman_available', m: 'craft_work', mn: null, title: 'Nabízím se: zlacení a restaurování dřevěných rámů', desc: 'Mám volnou kapacitu na zlacení na poliment a mixtion, doplnění křídových podkladů a retuše polychromie. Pracuji v Praze v dílně nebo na místě. Reference rád pošlu.', crafts: ['zlacení', 'dřevo'], region: 'Praha', city: 'Praha', r: ['negotiable'], s: 3, l: 60, img: 'gilding' },
  { id: '05', o: 'A', t: 'subcontract_needed', m: 'cultural_monument', mn: 'Kostel Nanebevzetí Panny Marie, Opava', title: 'Kovář na kopie historického kování, Opava', desc: 'Pro dveře kostela potřebujeme vyrobit kopie dochovaného kování a pantů. Hledáme kováře s praxí v ručním kování a povrchových úpravách. Vzory předáme na místě.', crafts: ['kov'], region: 'Moravskoslezský kraj', city: 'Opava', r: ['hourly', 18, 'EUR'], s: 10, l: 25, img: 'smith' },
  { id: '06', o: 'A', t: 'guarantor_needed', m: 'cultural_monument', mn: 'Kaple sv. Jana, Olomouc', title: 'Garance restaurátorského záměru pro kapli v Olomouci', desc: 'Obnova barokní kaple zahrnuje zlacení oltáře, truhlářské práce a čištění maleb. Hledáme restaurátora s licencí, který převezme odborný dohled. Rozsah a odměnu domluvíme osobně.', crafts: ['zlacení', 'dřevo', 'malba'], region: 'Olomoucký kraj', city: 'Olomouc', r: ['negotiable'], s: 30, l: 20, img: null },
  { id: '07', o: 'A', t: 'subcontract_needed', m: 'craft_work', mn: null, title: 'Truhlář na repliky oken do vily v Liberci', desc: 'Vyrábíme repliky dřevěných oken do secesní vily. Potřebujeme truhláře na výrobu oken podle výkresů. Dřevo dodáme, práce probíhá v naší dílně.', crafts: ['dřevo'], region: 'Liberecký kraj', city: 'Liberec', r: ['hourly', 380, 'CZK'], s: 7, l: 35, img: 'window' },
  { id: '08', o: 'B', t: 'subcontract_needed', m: 'cultural_monument', mn: 'Morový sloup, Plzeň', title: 'Sochař na doplnění soch morového sloupce, Plzeň', desc: 'Na morovém sloupu v Plzni chybí několik pískovcových detailů. Hledáme sochaře nebo kameníka na jejich doplnění podle dokumentace. Práce jsou plánované na jaro.', crafts: ['kámen'], region: 'Plzeňský kraj', city: 'Plzeň', r: ['fixed', 85000, 'CZK', SCOPE_A], s: 25, l: 45, img: 'statue' },
  { id: '09', o: 'B', t: 'subcontract_needed', m: 'national_monument', mn: 'Zámek Litomyšl, sgrafita', title: 'Restaurátor sgrafit a fasád, Litomyšl', desc: 'Při obnově fasády hledáme pomocníka na čištění, sondy a doplnění sgrafitové omítky. Vhodné i pro absolventa oboru s praxí. Práce pod dohledem restaurátora.', crafts: ['malba', 'kámen'], region: 'Pardubický kraj', city: 'Litomyšl', r: ['hourly', 420, 'CZK'], s: 12, l: 30, img: 'stucco' },
  { id: '10', o: 'B', t: 'craftsman_available', m: 'craft_work', mn: null, title: 'Nabízím se: restaurátor při práci na kameni a štuku', desc: 'Nabízím čištění, konzervaci a doplňování kamene i štuku. Mám vlastní lešení a zkušenost s moravskými zámky. Volný od příštího měsíce.', crafts: ['kámen'], region: 'Jihomoravský kraj', city: 'Brno', r: ['hourly', 500, 'CZK'], s: 8, l: 50, img: 'work' },
  { id: '11', o: 'B', t: 'subcontract_needed', m: 'cultural_monument', mn: 'Městské hradby, Znojmo', title: 'Tesař na šindelovou střechu hradební věže, Znojmo', desc: 'Věž městských hradeb dostane novou šindelovou krytinu. Hledáme tesaře nebo pokrývače s praxí v dřevěných šindelích. Práce ve výšce, lešení zajištěno.', crafts: ['dřevo'], region: 'Jihomoravský kraj', city: 'Znojmo', r: ['fixed', 1800, 'EUR', SCOPE_C], s: 15, l: 28, img: 'roof' },
  { id: '12', o: 'B', t: 'guarantor_needed', m: 'cultural_monument', mn: 'Zámek Kroměříž, hudební sál', title: 'Garant pro obnovu varhanní skříně, Kroměříž', desc: 'Historická varhanní skříň vyžaduje zlacení a opravu řezbářské výzdoby. Pro zpracování záměru hledáme licencovaného restaurátora dřeva a polychromie.', crafts: ['dřevo', 'zlacení'], region: 'Zlínský kraj', city: 'Kroměříž', r: ['fixed', 48000, 'CZK', SCOPE_B], s: 18, l: 40, img: 'organ' },
  { id: '13', o: 'B', t: 'subcontract_needed', m: 'cultural_monument', mn: 'Kostel sv. Jakuba, Jihlava', title: 'Vitráže: pomocník při restauraci oken, Jihlava', desc: 'V kostele sv. Jakuba obnovujeme gotická vitrážová okna. Hledáme pomocníka na demontáž, čištění skel a retuše malby na skle. Nutná pečlivost a praxe.', crafts: ['malba', 'zlacení'], region: 'Kraj Vysočina', city: 'Jihlava', r: ['fixed', 2400, 'EUR', SCOPE_B], s: 40, l: 30, img: 'glass' },
  { id: '14', o: 'B', t: 'craftsman_available', m: 'craft_work', mn: null, title: 'Nabízím se: kovářské a truhlářské repliky, Cheb', desc: 'Vyrábím repliky kování, mříží a dřevěných dveří podle dochovaných vzorů. Mám dílnu v Chebu a dopravu po celém kraji. Cena podle rozsahu.', crafts: ['kov', 'dřevo'], region: 'Karlovarský kraj', city: 'Cheb', r: ['fixed', 25000, 'CZK', SCOPE_D], s: 4, l: 45, img: null },
];

const out = [];
out.push(`-- Seed test data (generated ${new Date().toISOString().slice(0, 10)}). Remove: scripts/seed-test-data-remove.sql`);
out.push(
  `INSERT INTO profiles (id, email, name, title, role, region, city, bio, crafts, experience_text, directory_group, directory_visible, consent_at, availability, accepting_jobs)
SELECT ${q(secondId)}, ${q(second)}, ${q(secondName)}, 'Restaurátorský ateliér', 'atelier_firm', 'Jihomoravský kraj', 'Brno',
  'Ateliér se zaměřením na kámen, štuk a dřevo. Pracujeme na památkových objektech po celé ČR.',
  '["kámen","dřevo","zlacení"]',
  'Patnáct let praxe na zámcích a kostelích, spolupráce s NPÚ. Rádi přibereme subdodavatele na větší zakázky.',
  'firm', 1, datetime('now'), 'available_now', 1
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE LOWER(email)=LOWER(${q(second)}));`
);

const jobs = only ? J.filter((j) => j.id === only.replace('seed-j-', '')) : J;
if (only && jobs.length === 0) {
  console.error(`Unknown job id ${only}`);
  process.exit(1);
}
for (const j of jobs) {
  const from = iso(j.s);
  const to = iso(j.s + j.l);
  const [rt, ra = null, rc = null, rs = null] = j.r;
  const author = j.o === 'A' ? sub(owner) : sub(second);
  out.push(
    `INSERT OR IGNORE INTO jobs (id, author_id, title, description, job_type, monument_status, monument_name, image_url, required_crafts_json, region, city, start_date, budget_note, status, date_from, date_to, visibility, expires_at, reward_type, reward_amount, reward_currency, reward_scope)
VALUES (${q('seed-j-' + j.id)}, ${author}, ${q(j.title)}, ${q(j.desc)}, ${q(j.t)}, ${q(j.m)}, ${q(j.mn)}, ${q(j.img ? `/seed/${j.img}.svg` : null)}, ${q(JSON.stringify(j.crafts))}, ${q(j.region)}, ${q(j.city)}, ${q(from)}, ${q(budgetNote(rt, ra, rc))}, 'active', ${q(from)}, ${q(to)}, 'public', ${q(iso(j.s + j.l + 14))}, ${q(rt)}, ${ra === null ? 'NULL' : ra}, ${q(rc)}, ${q(rs)});`
  );
}

if (!only) {
  out.push(
    `INSERT OR IGNORE INTO engagements (id, job_id, worker_id, initiated_by, status, message, responded_at)
VALUES ('seed-e-01', 'seed-j-02', ${sub(second)}, 'worker', 'pending', 'Dobrý den, naše restaurátorka má licenci MK pro nástěnné malby a sgrafita. Rádi převezmeme garanci a připravíme záměr. Ozvěte se prosím.', NULL);`,
    `INSERT OR IGNORE INTO engagements (id, job_id, worker_id, initiated_by, status, message, responded_at)
VALUES ('seed-e-02', 'seed-j-05', ${sub(second)}, 'worker', 'accepted', 'Máme ve spolupráci kováře s praxí na kostelním kování. Termín nám vyhovuje.', datetime('now'));`,
    `INSERT OR IGNORE INTO engagements (id, job_id, worker_id, initiated_by, status, message, responded_at)
VALUES ('seed-e-03', 'seed-j-10', ${sub(owner)}, 'worker', 'pending', 'Zajímá mě spolupráce na kamenných článcích v Brně. Můžeme se domluvit na termínu?', NULL);`
  );
}
process.stdout.write(out.join('\n') + '\n');
