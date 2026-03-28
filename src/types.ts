export interface UserData {
  displayName: string;
  email: string;
  wallet: number;
  earnedFromVideos: number;
  earnedFromReferrals: number;
  verifiedWatchTime: number;
  personalWatchTime: number;
  networkWatchTime: number;
  referrals: number;
  extraLives: number;
  totalCorrect: number;
  claimedVideos: string[];
  lifetimePoints?: number;
  coins?: number;
  activeMissionId?: string | null;
  createdAt?: any;
  // Timeframe stats
  dailyPoints?: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
  dailyWatchTime?: number;
  weeklyWatchTime?: number;
  monthlyWatchTime?: number;
  lastEarnedTimestamp?: number;
}

export interface Transaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  note: string;
  date: string;
  createdAt?: any;
}

export type ActiveTab = 'missionBoard' | 'leaderboard' | 'wallet' | 'referrals' | 'admin' | 'history' | 'settings' | 'guest';

export interface Video {
  id?: string;
  youtubeVideoId: string;
  correctColor: string;
  createdAt: any; // Firestore Timestamp
  isActive: boolean;
}

export interface Settings {
  youtubeVideoId: string;
  correctColor: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  value: string;
  avatar: string;
}

export interface Reward {
  id?: string;
  title: string;
  cost: number;
  isActive: boolean;
  createdAt: any; // Firestore Timestamp
}

export interface RewardItem {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export interface Redemption {
  id?: string;
  userId: string;
  userEmail: string;
  displayName: string;
  rewardName: string;
  cost: number;
  status: 'Pending' | 'Completed';
  createdAt: any; // Firestore Timestamp
  completedAt?: any; // Firestore Timestamp
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
