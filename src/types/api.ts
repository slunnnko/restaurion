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
  | 'job_closed'; // poster closed the job (to workers with a pending or accepted engagement)

/** Public summary of a person. Never contains contacts or availability. */
export interface PublicPerson {
  id: string;
  name: string;
  group: DirectoryGroup;
  region: string;
  crafts: string[]; // craft category ids from src/lib/crafts.ts
  experienceText: string;
  licenceNumber?: string; // self-declared, never verified by Restaurion
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  website?: string; // profile portfolio_url, http(s) URL
  instagram?: string; // handle without @
  whatsapp?: string; // phone number
  facebook?: string; // http(s) URL
}

/** One directory listing. `contact` only for logged-in viewers. */
export type DirectoryEntry = PublicPerson & { contact?: ContactInfo };

export interface PublicJob {
  id: string;
  title: string;
  description: string;
  jobType: MvpJobType;
  monumentStatus: MvpMonumentStatus;
  monumentName?: string;
  imageUrl?: string; // optional photo: '/api/photos/jobs/<jobId>/<uuid>.<ext>' (owner upload, D34); legacy rows may hold an old URL
  crafts: string[]; // craft category ids
  region: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  budgetNote: string; // derived human string ("450 Kč/hod"); the only reward info of legacy rows
  /** Structured reward; absent on legacy rows (then show budgetNote). amount/currency/scope are absent for 'negotiable'. */
  reward?: { type: RewardType; amount?: number; currency?: RewardCurrency; scope?: string };
  status: 'active' | 'closed';
  createdAt: string;
  poster: { id: string; name: string; group: DirectoryGroup };
  interestedCount: number; // pending + accepted engagements
  // Viewer-specific fields (present only when a session exists):
  isMine?: boolean;
  myEngagement?: { id: string; status: EngagementStatus };
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
  blocks: UnavailabilityBlock[]; // only blocks with dateTo >= today
  booked: BookedJob[]; // accepted engagements with job dateTo >= today
}

/** Interested worker as the job's (or offer's) poster sees it. The poster is logged in, so contacts are always present. */
export interface EngagementForPoster {
  id: string;
  status: EngagementStatus;
  message?: string;
  createdAt: string;
  worker: PublicPerson;
  workerContact: ContactInfo;
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
// GET  /api/jobs?mine=1                    → { jobs: PublicJob[] } the caller's own jobs and offers, status 'active' and
//                                             'closed', regardless of dates, newest first, max 100; 401 without a session
// POST /api/jobs  {title, description?, jobType, monumentStatus?, monumentName?, crafts[], region, city,
//                  dateFrom, dateTo, rewardType?, rewardAmount?, rewardCurrency?, rewardScope?}  → 201 { job: PublicJob, notified: number }
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
//   jobType is immutable (400 if sent and different). A closed job is read-only (409). Editing sends NO new
//   match notifications (job_match only on create). Closing notifies workers with a pending/accepted engagement.
// POST /api/jobs/:id/respond {message?}     → 201 { engagement: { id, status } }  (not own job; on an offer
//                                             the offerer gets an 'interest' notification)
// GET  /api/jobs/:id/engagements            → { engagements: EngagementForPoster[] } (owner only, with contacts)
// POST /api/engagements/:id {action: 'accept'|'decline'} (poster, jobs only; 409 on an offer)
//                                           | {action: 'withdraw'} (interested user)
//                                           → { engagement: { id, status }, contact?: ContactInfo }
//   Accepting books the worker's dates (busy days) and notifies; contacts do not depend on it.
// GET  /api/profile                         → { profile: OwnProfile } (session only, own profile)
// PUT  /api/profile {name?, phone?, region?, crafts?, experienceText?, portfolioUrl?, licenceNumber?,
//                    emailDigest?, acceptingJobs?, group?, directoryVisible?, instagram?, whatsapp?, facebook?,
//                    themePreference? ('system'|'light'|'dark', else 400 fieldErrors.themePreference)}
//                                           → { profile: OwnProfile }
//   group 'licensed' requires a licence number.
// POST /api/availability {dateFrom, dateTo, note?} → 201 { block }
// PUT  /api/availability/:id {dateFrom, dateTo, note?} → { block } (owner only; foreign or missing id → 404;
//                                           same validation as POST, 400 with fieldErrors)
// DELETE /api/availability/:id              → { ok: true } (owner only, else 403)
// DELETE /api/jobs/:id                      → { ok: true } (ADMIN_EMAILS only: 401 without session, 403 otherwise).
//   Soft delete of any job or offer (visibility 'deleted', status 'archived'; the row stays in D1). Pending and
//   accepted workers get 'job_closed'. Idempotent: an already deleted job → 200. Owner PATCH on it → 404.
// POST /api/jobs/:id/photo  (raw image bytes, owner) → { job }  JPEG/PNG/WebP by magic bytes (else 400), max 5 MB (413),
//   closed or deleted job 409, 401/403/404 like PATCH, 429 (30/h), 503 { error } when R2 is not enabled. Replaces the old photo.
// DELETE /api/jobs/:id/photo (owner) → { job } (imageUrl absent). 503 without R2.
// GET  /api/photos/jobs/<jobId>/<uuid>.<ext> → the image (public, immutable cache); 404 when missing, 503 without R2.
// GET  /api/notifications                   → { items: NotificationItem[], unread: number }
// POST /api/notifications/read {ids?: string[]} (no ids = all) → { unread: number }
// Errors: { error: string, fieldErrors?: Record<string,string> } with 400/401/403/404/409/429/503.
