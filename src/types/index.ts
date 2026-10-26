export type UserRole =
  | 'licensed_restorer'      // Restaurátor s povolením MK ČR
  | 'unlicensed_craftsman'   // Odborník / umělecký řemeslník bez licence
  | 'student_graduate'       // Student / absolvent (např. Fakulta restaurování UPCE)
  | 'atelier_firm';          // Ateliér / firma

export type VerificationStatus =
  | 'not_applicable'         // Nelicencovaný (nevyžaduje se)
  | 'verified_auto'          // Automaticky ověřeno v rejstříku MK ČR
  | 'verified_manual'        // Ručně ověřeno a schváleno administrátorem
  | 'manual_review_needed'   // Vyžaduje kontrolu administrátorem
  | 'unverified';

export type JobType =
  | 'subcontract_needed'     // Licencovaný restaurátor hledá subdodávku / výpomoc
  | 'guarantor_needed'       // Řemeslník hledá garanta s licencí MK ČR
  | 'craftsman_available'    // Nabízím se / volné kapacity
  | 'general_commission';    // Přímá poptávka práce

export type MonumentStatus =
  | 'cultural_monument'      // Zapsaná kulturní památka (vyžaduje licenci MK ČR)
  | 'national_monument'      // Národní kulturní památka (přísný dohled MK ČR)
  | 'historic_unregistered'  // Běžný historický objekt / sbírka (bez licence)
  | 'craft_work';            // Běžná řemeslná zakázka / replika

export interface UserProfile {
  id: string;
  name: string;
  title?: string;
  role: UserRole;
  avatarUrl?: string;
  region: string;
  city: string;
  phone?: string;
  email: string;
  bio: string;
  specializations: string[];
  mkLicenseNumber?: string;
  mkLicenseFields?: string[];
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  availability: 'available_now' | 'available_soon' | 'busy';
  availableFrom?: string;
  completedJobsCount: number;
  colleagueEndorsementsCount: number;
  schoolOrBackground?: string; // např. "Fakulta restaurování Univerzita Pardubice (Litomyšl)"
}

export interface MatchedPartner {
  id?: string;
  name: string;
  roleLabel?: string;
}

export interface ReviewReply {
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface JobReview {
  rating: number;
  text: string;
  authorName: string;
  createdAt: string;
  reply?: ReviewReply;
}

/**
 * Hodnocení držené přímo na osobě (profilu), ze kterého vede vazba na zakázku.
 * Zůstává zachováno i v případě, že někdo původní inzerát zakázky smaže.
 * Na každé hodnocení lze reagovat pouze jednou (pole `reply`), aby nevznikalo diskuzní vlákno.
 */
export interface UserReview {
  id: string;
  jobId?: string;
  jobTitle: string;
  jobCity?: string;
  completedAt?: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  revieweeName: string;
  revieweeRoleLabel?: string;
  rating: number;
  text: string;
  createdAt: string;
  reply?: ReviewReply;
}

export interface JobResponseItem {
  id: string;
  jobId: string;
  applicantId?: string;
  senderName: string;
  senderEmail?: string;
  senderPhone: string;
  message: string;
  attachProfile: boolean;
  status: string;
  createdAt: string;
  isRead?: boolean;
}

export type JobStatus = 'active' | 'completed';

export interface Job {
  id: string;
  title: string;
  description: string;
  jobType: JobType;
  monumentStatus: MonumentStatus;
  status?: JobStatus;
  monumentName?: string;
  monumentRegNumber?: string;
  imageUrl?: string;
  requiredCrafts: string[];
  region: string;
  city: string;
  startDate?: string;
  deadline?: string;
  budgetNote: string;
  author: UserProfile;
  createdAt: string;
  responsesCount: number;
  urgent?: boolean;
  completedAt?: string;
  matchedPartner?: MatchedPartner;
  review?: JobReview;
}

export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge1: string;
  heroBadge2: string;
  heroBadge3: string;
  announcementBanner: string;
  footerText: string;
}

export interface FilterState {
  searchQuery: string;
  region: string;
  craft: string;
  monumentStatus: string;
  jobType: string;
  statusFilter: 'active' | 'completed' | 'all';
}
