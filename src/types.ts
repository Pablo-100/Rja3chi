export interface District {
  id: number;
  name_ar: string;
  name_fr: string;
}

export interface Delegation {
  id: number;
  name_ar: string;
  name_fr: string;
  districts: District[];
}

export interface Governorate {
  id: number;
  name_ar: string;
  name_fr: string;
  delegations: Delegation[];
}

export type OutageType = 'blackout' | 'partial' | 'voltage' | 'streetlights';

export type OutageStatus = 'active' | 'restored';

export type AffectedCategory = 'home' | 'business' | 'public';

export interface OutageReport {
  id: string;
  governorateId: number;
  governorateNameFr: string;
  governorateNameAr: string;
  delegationId: number;
  delegationNameFr: string;
  delegationNameAr: string;
  districtId: number;
  districtNameFr: string;
  districtNameAr: string;
  type: OutageType;
  status: OutageStatus;
  reportedAt: string;
  restoredAt?: string;
  upvotes: number;
  userUpvoted?: boolean;
  details: string;
  reporterName: string;
  affectedCategory: AffectedCategory;
  deviceId?: string;
  ipHash?: string;
  reputationWeight?: number;
}

export interface DeviceSecurityProfile {
  deviceId: string;
  ipHash: string;
  reputationScore: number;
  trustLevel: 'Verified Citizen' | 'Standard' | 'Flagged';
  lastSubmissionTimestamp?: number;
  cooldownUntilTimestamp?: number;
}

export interface OutageStats {
  totalActive: number;
  totalRestored: number;
  criticalCount: number;
  mostAffectedGov: { nameFr: string; nameAr: string; count: number } | null;
  averageRestorationTimeHours: number;
}
