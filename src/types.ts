export interface UserData {
  displayName: string;
  email: string;
  wallet: number;
  verifiedWatchTime: number;
  referrals: number;
}

export interface Transaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  note: string;
  date: string;
}

export type ActiveTab = 'dailyDrop' | 'leaderboard' | 'wallet' | 'referrals';

export interface LeaderboardUser {
  rank: number;
  name: string;
  value: string;
  avatar: string;
}

export interface RewardItem {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
