// API contract between Pages Functions (functions/api) and the frontend (src/).
// Dates are 'YYYY-MM-DD' strings (calendar days, no time zone). Timestamps are ISO-like
// SQLite datetime strings ('YYYY-MM-DD HH:MM:SS', UTC).
// PRIVACY: contacts (e-mail, phone, web, Instagram, WhatsApp, Facebook) are returned ONLY to a
// LOGGED-IN viewer (ContactInfo); anonymous responses never contain them. Unavailability blocks
// and busy dates appear ONLY in OwnProfile / MyBusy fields, never in the directory.

export type MvpJobType = 'subcontract_needed' | 'guarantor_needed' | 'craftsman_available';
export type DirectoryGroup = 'firm' | 'licensed' | 'unlicensed';
export type MvpMonumentStatus = 'cultural_monument' | 'national_monument' | 'historic_unregistered' | 'craft_work';
export type RewardType = 'negotiable' | 'hourly' | 'fixed';
export type RewardCurrency = 'CZK' | 'EUR';
export type EngagementStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
export type NotificationType =
  | 'job_match' // new job matching the worker (to worker)
  | 'interest' // a worker clicked "Mám zájem" (to poster)
  | 'accepted' // poster accepted the worker (to worker)
  | 'declined' // poster declined the worker (to worker)
  | 'withdrawn' // worker withdrew (to poster)
  | 'job_closed' // poster closed the job (to workers with a pending or accepted engagement)
  | 'invited' // poster sent an invitation ("Poptat spolupráci") to the offerer (to offerer)
  | 'invite_accepted' // offerer confirmed the invitation (to poster)
  | 'invite_declined' // offerer declined the invitation (to poster)
  | 'invite_cancelled' // poster cancelled the invitation (to offerer)
  | 'contacted' // the other side confirmed "Kontakt navázán" (D41, to the other side)
  | 'no_deal' // the other side ended it with "Nedohodli jsme se" (D41, to the other side)
  | 'reopened' // the side that ended the engagement took it back (D43, to the other side)
  | 'job_removed'; // an administrator removed the listing, with a reason (D46, to the author)
/** POST /api/engagements/:id actions ('contact' and 'no_deal' since D41, 'reopen' since D43). */
export type EngagementAction = 'accept' | 'decline' | 'withdraw' | 'contact' | 'no_deal' | 'reopen';

/** Public summary of a person. Never contains contacts or availability. */
export interface PublicPerson {
  id: string;
  name: string;
  group: DirectoryGroup;
  region: string;
  crafts: string[]; // craft category ids from src/lib/crafts.ts
  experienceText: string;
  licenceNumber?: string; // self-declared; checked automatically against the MK ČR registry (D49)
  /** Set only when the registry has the number AND the name matches (public data, also for anonymous viewers). */
  licenceVerified?: true;
  licenceScope?: string[]; // permit scopes from the registry
  licenceRegistryUrl?: string; // `${base}/rejstrik/<id>`
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  website?: string; // profile portfolio_url, http(s) URL
  instagram?: string; // handle without @
  whatsapp?: string; // digits (wa.me) or @username
  facebook?: string; // http(s) URL
}

/** One directory listing. `contact` only for logged-in viewers. */
export type DirectoryEntry = PublicPerson & { contact?: ContactInfo };

/** The viewer's own engagement on a job (D40: `initiatedBy` 'poster' = an invitation sent to the viewer). */
export interface MyEngagement {
  id: string;
  status: EngagementStatus;
  initiatedBy: 'worker' | 'poster';
  /** Invitations only: last day to confirm ('YYYY-MM-DD'). */
  respondBy?: string;
  /** Invitation still 'pending' after `respondBy` (derived, no extra status). Never set when contact was confirmed. */
  unconfirmed?: boolean;
  /** D41: contact confirmed by either side. Set for 'pending'; also for 'declined'/'withdrawn' (= "Nedohodli jste se"). */
  contactedAt?: string;
  /** D43, ended rows only: who ended it (absent for a legacy no-deal row where nobody recorded it). */
  endedBy?: 'worker' | 'poster';
  /** D43, ended rows only: the viewer ended it (or it is a legacy no-deal row) and the listing is still open. */
  canReopen?: true;
}

/** On an offer card: the viewer's invitation (job of the viewer sent to this offer's author). */
export interface MyInvite {
  engagementId: string;
  jobId: string;
  jobTitle: string;
  status: EngagementStatus;
  unconfirmed: boolean;
  respondBy?: string;
  /** D41: contact confirmed (pending only). */
  contactedAt?: string;
}

export interface PublicJob {
  id: string;
  title: string;
  description: string;
  jobType: MvpJobType;
  monumentStatus: MvpMonumentStatus;
  monumentName?: string;
  imageUrl?: string; // first photo (compat, D45): '/api/photos/jobs/<jobId>/<uuid>.<ext>' (owner upload, D34); legacy rows may hold an old URL
  /** D45: up to 6 photos in display order (first = card photo). Absent when the listing has none. */
  photos?: { id: string; url: string; caption?: string }[];
  crafts: string[]; // craft category ids
  region: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  budgetNote: string; // derived human string ("450 Kč/hod"); the only reward info of legacy rows
  /** Structured reward; absent on legacy rows (then show budgetNote). amount/currency/scope are absent for 'negotiable'. */
  reward?: { type: RewardType; amount?: number; currency?: RewardCurrency; scope?: string };
  status: 'active' | 'closed';
  /** 'direct' = invitation-only listing (not on the board), visible to its author and `directTo`. */
  visibility: 'public' | 'direct';
  directTo?: { id: string; name: string };
  /** Owner of a direct listing only: state of the invitation ('none' = no engagement). `unconfirmed` = pending after `respondBy`. */
  directInvite?: {
    engagementId?: string;
    status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'none';
    unconfirmed: boolean;
    respondBy?: string;
    /** D41: contact confirmed (pending only). */
    contactedAt?: string;
  };
  createdAt: string;
  poster: { id: string; name: string; group: DirectoryGroup };
  interestedCount: number; // pending + accepted engagements
  /** Author only (D43): declined + withdrawn engagements, which stay listed in `Zájemci`. */
  endedCount?: number;
  // Viewer-specific fields (present only when a session exists):
  isMine?: boolean;
  myEngagement?: MyEngagement;
  /** Offers only: invitations the VIEWER sent to this offer's author (pending/accepted, D40). */
  myInvites?: MyInvite[];
  /** Days of this job's range that the VIEWER has busy (blocks + accepted jobs). Only for the viewer. */
  myBusyDays?: number;
  /** Contacts of the poster, for ANY logged-in viewer. */
  posterContact?: ContactInfo;
}

export interface UnavailabilityBlock {
  id: string;
  dateFrom: string;
  dateTo: string;
  note?: string;
}

export interface BookedJob {
  engagementId: string;
  jobId: string;
  title: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  posterContact: ContactInfo;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface OwnProfile extends PublicPerson {
  /** Name parts (own profile only); `name` is derived: companyName when set, else `${firstName} ${lastName}`. */
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  /** True for e-mails listed in the ADMIN_EMAILS env var. Gates the admin UI; the API re-checks on every call. */
  isAdmin: boolean;
  /** True when a password is set (login-password works). The hash itself never leaves the server. */
  hasPassword: boolean;
  /** Own theme choice (profiles.theme_preference); 'system' follows the OS. Never in a public mapping. */
  themePreference: ThemePreference;
  phone?: string;
  region: string;
  emailDigest: boolean;
  acceptingJobs: boolean;
  directoryVisible: boolean;
  portfolioUrl?: string; // "Web / portfolio"; public only as ContactInfo.website
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  /** Result of the last registry check (only when a licence number is saved and was checked). */
  licenceCheck?: {
    result: 'verified' | 'not_found' | 'name_mismatch' | 'ambiguous' | 'unavailable';
    checkedAt?: string;
    scope?: string[];
    registryUrl?: string;
  };
  blocks: UnavailabilityBlock[]; // only blocks with dateTo >= today
  booked: BookedJob[]; // accepted engagements with job dateTo >= today
}

/** Interested worker as the job's (or offer's) poster sees it. The poster is logged in, so contacts are always present. */
export interface EngagementForPoster {
  id: string;
  status: EngagementStatus;
  message?: string;
  createdAt: string;
  initiatedBy: 'worker' | 'poster';
  /** Invitations only (D40). */
  respondBy?: string;
  unconfirmed?: boolean;
  /** D41: contact confirmed (pending, and ended rows: = "Nedohodli jsme se"). */
  contactedAt?: string;
  /** D43, ended rows (declined / withdrawn) only. */
  endedBy?: 'worker' | 'poster';
  canReopen?: true;
  worker: PublicPerson;
  workerContact: ContactInfo;
}

/** One invitation as the invited offerer sees it (GET /api/invitations). Contacts: job.posterContact. */
export interface Invitation {
  engagementId: string;
  /** D43: declined / withdrawn invitations stay in the list (muted). */
  status: EngagementStatus;
  message?: string;
  createdAt: string;
  respondBy: string;
  unconfirmed: boolean;
  /** D41: contact confirmed (pending, and ended rows: = "Nedohodli jsme se"). */
  contactedAt?: string;
  /** D43, ended rows only. */
  endedBy?: 'worker' | 'poster';
  canReopen?: true;
  job: PublicJob;
}

export interface InviteOptionJob {
  id: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  crafts: string[];
  visibility: 'public' | 'direct';
  invite?: { engagementId: string; status: EngagementStatus; unconfirmed: boolean; contactedAt?: string };
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  jobId?: string;
  jobTitle?: string;
  engagementId?: string;
  /** For job_match: days of the job range the recipient has busy (> 0 → show the note). */
  busyDays?: number;
  /** For withdrawn: the worker's optional reason (D38). For job_removed: the administrator's reason (D46). */
  reason?: string;
  /** For invited: name of the poster who sent the invitation. */
  posterName?: string;
  /** For contacted / no_deal (D41) and reopened (D43): name of the person who caused the event. */
  actorName?: string;
}

// ---- Endpoints ----
// GET  /api/auth/me                         → { user: OwnProfile | null }
// POST /api/auth/request-code  {email}      → { ok: true, testCode?: string } | 429 | 502 { error }
//   testCode only when Resend is NOT configured AND the TEST_LOGIN_ECHO=1 env var is set (testing only).
// POST /api/auth/verify-code   {email, code, consent: true, directoryVisible?: boolean, newPassword?: string} → { user: OwnProfile } + Set-Cookie
//   directoryVisible is applied only when the profile is created (default true).
//   newPassword (10..200 chars, else 400 fieldErrors.newPassword) sets/resets the password and logs out all older sessions.
// POST /api/auth/login-password {email, password} → { user: OwnProfile } + Set-Cookie | 401 (one message for every failure) | 429
// POST /api/auth/password      {currentPassword?, newPassword} → { user: OwnProfile } (needs a session; currentPassword is
//                                required when a password exists; a first password needs a code-login session < 30 min old, else 403; 400 fieldErrors.newPassword / currentPassword; 429;
//                                all other sessions of the user are deleted)
// POST /api/auth/logout                     → { ok: true } (clears cookie, deletes session)
// GET  /api/jobs                            → { jobs: PublicJob[] } active, not expired, with dates; jobs AND
//                                             offers (jobType 'craftsman_available'); posterContact only when logged in
// GET  /api/jobs?mine=1                    → { jobs: PublicJob[] } the caller's own jobs (public AND direct) and offers, status 'active' and
//                                             'closed', regardless of dates, newest first, max 100; 401 without a session
// POST /api/jobs  {title, description? (max 5000 characters, D45), jobType, monumentStatus?, monumentName?, crafts[], region, city,
//                  dateFrom, dateTo, rewardType?, rewardAmount?, rewardCurrency?, rewardScope?, directOfferId?}  → 201 { job: PublicJob, notified: number }
//   directOfferId (D40): the job is created with visibility 'direct' (not on the board), direct_to = the offer's author, NO
//   matching notifications, and an invitation (engagement initiated_by 'poster', respond_by = today + 3) plus an 'invited'
//   notification are created in the same db.batch. Only jobs (not offers); the offer must be active, not mine, and
//   `offerFitsJob` must hold (else 409). Response: notified 0.
//   Reward: rewardType 'negotiable' (default) | 'hourly' | 'fixed'. hourly/fixed need rewardAmount (integer
//   1..10 000 000) and rewardCurrency 'CZK' (default) | 'EUR'; fixed needs rewardScope (20..1000 chars), optional
//   for hourly. negotiable ignores the rest. budgetNote is derived server-side ("450 Kč/hod", "Dohodou").
//   Offers (craftsman_available): dates mean "free from / to", no matching notifications (notified 0),
//   monumentStatus is ignored.
// GET  /api/directory?group=&craft=&region=&q= → { entries: DirectoryEntry[], total: number }
//   Public. Listed: directory_visible, consent given, name >= 3 chars. Max 200, by name.
//   contact only for a logged-in viewer. region also matches profiles with region 'Celá ČR'.
// PATCH /api/jobs/:id {title?, description?, rewardType?+rewardAmount?+rewardCurrency?+rewardScope? (sent together), dateFrom?, dateTo?, crafts?, region?, city?,
//                      status?: 'closed'} (owner) → { job }
//   visibility: 'public' (owner, direct → public only, else 409) publishes a direct listing on the board and sends the same
//   matching notifications as creating a job.
//   jobType is immutable (400 if sent and different). A closed job is read-only (409). Editing sends NO new
//   match notifications (job_match only on create). Closing notifies workers with a pending/accepted engagement.
// POST /api/jobs/:id/respond {message?}     → 201 { engagement: { id, status } }  (not own job; 409 on an offer: use the invitation flow, D40)
// GET  /api/jobs/:id/engagements            → { engagements: EngagementForPoster[] } (owner only, with contacts; all four statuses,
//                                             pending/accepted first, then ended rows (D43) with endedBy / canReopen / contactedAt)
// GET  /api/jobs/:id/invite-options         → { offer: { id, authorName }, jobs: InviteOptionJob[] } (D40; :id = an active offer that
//                                             is not mine; jobs = my active public/direct listings that fit it; `invite` = O's existing engagement)
// POST /api/jobs/:id/invite {offerId, message? (≤ 500)} → 201 { engagement: { id, status, respondBy } } (D40; :id = my active job;
//                                             offer active, not mine, offerFitsJob else 409; a direct job only to its direct_to.
//                                             Existing engagement: pending (not unconfirmed) / accepted / declined → 409;
//                                             withdrawn or unconfirmed → re-opened with a new deadline). Notification 'invited'.
// GET  /api/invitations                     → { invitations: Invitation[] } (session; poster-initiated engagements where I am the
//                                             worker, pending/accepted incl. unconfirmed, newest first; job.posterContact = contacts)
// POST /api/engagements/:id {action: 'contact'} (D41; the job author OR the worker of the engagement, else 403; engagement 'pending' without
//                                             contacted_at, else 409; not on an offer; also allowed on an unconfirmed invitation, which it
//                                             revives) → { engagement: { id, status: 'pending', contactedAt } }. Notification 'contacted' to the other side.
//                                           | {action: 'no_deal'} (D41; author or worker, 'pending' WITH contacted_at, else 409) → worker: status
//                                             'withdrawn', author: 'declined'; notification 'no_deal' to the other side. Every ending
//                                             stores engagements.ended_by (D43); ended rows stay in the lists.
//                                           | {action: 'reopen'} (D43; only the side that ended it (legacy rows: derived, no-deal → either side), else 403;
//                                             only from declined/withdrawn, else 409; job active and not expired, else 409) → status 'pending',
//                                             ended_by NULL, contacted_at kept; an invitation without contact gets a new respond_by; a direct
//                                             listing keeps the one-waiting-invitation cap (409). Notification 'reopened' to the other side.
//                                           | {action: 'accept'|'decline'} (poster, jobs only; 409 on an offer)
//                                           | {action: 'accept'|'decline'} (the INVITED worker of a poster-initiated engagement, pending,
//                                             not unconfirmed; after respond_by → 409 'Lhůta na potvrzení vypršela. Ozvi se zadavateli.')
//                                           | {action: 'decline'} (the poster cancels his own pending, NOT contacted invitation → status 'withdrawn';
//                                             contacted → 409 'Použij Nedohodli jsme se.')
//                                           | {action: 'withdraw', reason?: string (≤ 500)} (interested user)
//                                           → { engagement: { id, status }, contact?: ContactInfo }
//   Accepting books the worker's dates (busy days) and notifies; contacts do not depend on it.
//   Invitation notifications: 'invite_accepted' / 'invite_declined' (to the poster), 'invite_cancelled' (to the worker).
// GET  /api/profile                         → { profile: OwnProfile } (session only, own profile)
// PUT  /api/profile {firstName?, lastName?, companyName? (optional, shown instead of the name), phone? (normalized to '+420 777 111 222', else 400; legacy `name` is split at the first space), region?, crafts?, experienceText?, portfolioUrl?, licenceNumber?,
//                    emailDigest?, acceptingJobs?, group?, directoryVisible?, instagram?, whatsapp? (digits or '@username', stored normalized), facebook?,
//                    themePreference? ('system'|'light'|'dark', else 400 fieldErrors.themePreference)}
//                                           → { profile: OwnProfile }
//   group 'licensed' requires a licence number. A changed licence number (or name while a number is set) resets the verification and
//   re-checks it in the registry (D49); a failing check never fails the save → OwnProfile.licenceCheck.
// POST /api/profile/licence-check           → { profile: OwnProfile } re-checks the saved number in the MK ČR registry (D49); no saved number 400;
//                                           429 after 5 per hour; 401 without session. 'unavailable' keeps an earlier verification.
// POST /api/availability {dateFrom, dateTo, note?} → 201 { block }
// PUT  /api/availability/:id {dateFrom, dateTo, note?} → { block } (owner only; foreign or missing id → 404;
//                                           same validation as POST, 400 with fieldErrors)
// DELETE /api/availability/:id              → { ok: true } (owner only, else 403)
// DELETE /api/jobs/:id {reason}             → { ok: true } (ADMIN_EMAILS only: 401 without session, 403 otherwise; reason 3..500 chars, else 400
//   fieldErrors.reason, D46). Soft delete of any job or offer (visibility 'deleted', status 'archived'; the row stays in D1). Pending and
//   accepted workers get 'job_closed'; the author gets 'job_removed' with the reason (not when the admin is the author).
//   Idempotent: an already deleted job → 200 (before the reason is checked). Owner PATCH on it → 404.
// POST /api/jobs/:id/photos  (raw image bytes, owner) → { job, photoId }  adds ONE photo (photoId = the new photo's id, D47) (D45): JPEG/PNG/WebP by magic bytes (else 400),
//   max 5 MB (413), max 6 photos per listing (409 'Inzerát už má 6 fotek.'), closed or deleted job 409, 401/403/404 like PATCH,
//   429 (30/h), 503 { error } when R2 is not enabled.
// DELETE /api/jobs/:id/photos/:photoId (owner) → { job } without that photo; unknown photo 404. 503 without R2.
// PATCH /api/jobs/:id/photos/:photoId { caption } (owner, active listing) → { job }  (D47): trimmed, max 200 characters (400 with fieldErrors.caption),
//   empty string clears it (the caption is then absent); unknown photo or the legacy fake id 404; 401/403/409 like DELETE.
// GET  /api/photos/jobs/<jobId>/<uuid>.<ext> → the image (public, immutable cache); 404 when missing, 503 without R2.
// GET  /api/notifications                   → { items: NotificationItem[], unread: number }
// POST /api/notifications/read {ids?: string[]} (no ids = all) → { unread: number }
// Errors: { error: string, fieldErrors?: Record<string,string> } with 400/401/403/404/409/429/503.
