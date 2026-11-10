// API contract between Pages Functions (functions/api) and the frontend (src/).
// Dates are 'YYYY-MM-DD' strings (calendar days, no time zone). Timestamps are ISO-like
// SQLite datetime strings ('YYYY-MM-DD HH:MM:SS', UTC).
// PRIVACY: email and phone appear ONLY in OwnProfile and in ContactInfo of an accepted
// engagement. Unavailability blocks and busy dates appear ONLY in OwnProfile / MyBusy fields.

export type MvpJobType = 'subcontract_needed' | 'guarantor_needed';
export type MvpMonumentStatus = 'cultural_monument' | 'national_monument' | 'historic_unregistered' | 'craft_work';
export type EngagementStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
export type NotificationType =
  | 'job_match' // new job matching the worker (to worker)
  | 'interest' // a worker clicked "Mám zájem" (to poster)
  | 'accepted' // poster accepted the worker (to worker)
  | 'declined' // poster declined the worker (to worker)
  | 'withdrawn'; // worker withdrew (to poster)

/** Public summary of a person. Never contains email, phone or availability. */
export interface PublicPerson {
  id: string;
  name: string;
  crafts: string[]; // craft category ids from src/lib/crafts.ts
  experienceText: string;
  portfolioUrl?: string;
  licenceNumber?: string; // self-declared
  licenceVerified: boolean; // set manually by an admin in D1
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface PublicJob {
  id: string;
  title: string;
  description: string;
  jobType: MvpJobType;
  monumentStatus: MvpMonumentStatus;
  monumentName?: string;
  imageUrl?: string; // legacy jobs only; no upload in MVP
  crafts: string[]; // craft category ids
  region: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  budgetNote: string;
  status: 'active' | 'closed';
  createdAt: string;
  poster: { id: string; name: string; licenceVerified: boolean };
  interestedCount: number; // pending + accepted engagements
  // Viewer-specific fields (present only when a session exists):
  isMine?: boolean;
  myEngagement?: { id: string; status: EngagementStatus };
  /** Days of this job's range that the VIEWER has busy (blocks + accepted jobs). Only for the viewer. */
  myBusyDays?: number;
  /** Contacts of the poster, only when the viewer's engagement is accepted. */
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

export interface OwnProfile extends PublicPerson {
  email: string;
  phone?: string;
  region: string;
  emailDigest: boolean;
  acceptingJobs: boolean;
  blocks: UnavailabilityBlock[]; // only blocks with dateTo >= today
  booked: BookedJob[]; // accepted engagements with job dateTo >= today
}

/** Interested worker as the job's poster sees it. Contact only after acceptance. */
export interface EngagementForPoster {
  id: string;
  status: EngagementStatus;
  message?: string;
  createdAt: string;
  worker: PublicPerson;
  workerContact?: ContactInfo; // only when status === 'accepted'
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
// POST /api/auth/request-code  {email}      → { ok: true } | 429 { error }
// POST /api/auth/verify-code   {email, code, consent: true} → { user: OwnProfile } + Set-Cookie
// POST /api/auth/logout                     → { ok: true } (clears cookie, deletes session)
// GET  /api/jobs                            → { jobs: PublicJob[] } active, not expired, with dates
// POST /api/jobs  {title, description?, jobType, monumentStatus, monumentName?, crafts[], region, city,
//                  dateFrom, dateTo, budgetNote?}  → 201 { job: PublicJob, notified: number }
// PATCH /api/jobs/:id {title?, description?, budgetNote?, dateFrom?, dateTo?, status?: 'closed'} (owner) → { job }
// POST /api/jobs/:id/respond {message?}     → 201 { engagement: { id, status } }  (worker; not own job)
// GET  /api/jobs/:id/engagements            → { engagements: EngagementForPoster[] } (owner only)
// POST /api/engagements/:id {action: 'accept'|'decline'} (poster) | {action: 'withdraw'} (worker)
//                                           → { engagement: { id, status }, contact?: ContactInfo }
// GET  /api/profile                         → { profile: OwnProfile } (session only, own profile)
// PUT  /api/profile {name?, phone?, region?, crafts?, experienceText?, portfolioUrl?, licenceNumber?,
//                    emailDigest?, acceptingJobs?} → { profile: OwnProfile }
// POST /api/availability {dateFrom, dateTo, note?} → 201 { block }
// DELETE /api/availability/:id              → { ok: true } (owner only, else 403)
// GET  /api/notifications                   → { items: NotificationItem[], unread: number }
// POST /api/notifications/read {ids?: string[]} (no ids = all) → { unread: number }
// Errors: { error: string, fieldErrors?: Record<string,string> } with 400/401/403/404/409/429/503.
