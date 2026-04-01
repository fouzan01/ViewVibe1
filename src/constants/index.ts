import { UserData, Transaction, LeaderboardUser } from '../types';

export const ADMIN_EMAIL = "fouzan1605@gmail.com";

export const COLORS = [
  { name: 'Red Fire', color: 'bg-rose-500', shadow: 'hover:shadow-rose-500/40 hover:border-rose-500/50' },
  { name: 'Blue Water', color: 'bg-blue-500', shadow: 'hover:shadow-blue-500/40 hover:border-blue-500/50' },
  { name: 'Neon Green', color: 'bg-emerald-500', shadow: 'hover:shadow-emerald-500/40 hover:border-emerald-500/50' },
  { name: 'Yellow Thunder', color: 'bg-yellow-500', shadow: 'hover:shadow-yellow-500/40 hover:border-yellow-500/50' }
];

export const INITIAL_USER_DATA: UserData = {
  displayName: 'Guest User',
  email: '',
  wallet: 0,
  coins: 0,
  earnedFromVideos: 0,
  earnedFromReferrals: 0,
  verifiedWatchTime: 0,
  personalWatchTime: 0,
  networkWatchTime: 0,
  referrals: 0,
  extraLives: 0,
  totalCorrect: 0,
  claimedVideos: [],
  activeMissionId: null,
  instagram: '',
  facebook: '',
  state: '',
  district: '',
  photoURL: '',
  redeemedPromos: [],
  referredBy: null,
};

export const INITIAL_HISTORY: Transaction[] = [
  { id: '1', type: 'earn', amount: 50, note: 'Daily Drop Verification', date: '2024-03-19' },
  { id: '2', type: 'earn', amount: 100, note: 'Referral Bonus: user_88', date: '2024-03-18' },
  { id: '3', type: 'spend', amount: 2000, note: 'VIP Discord Role', date: '2024-03-15' },
];

export const WATCHERS_LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'ShadowSlayer', value: '142h 15m', avatar: 'https://picsum.photos/seed/1/100' },
  { rank: 2, name: 'VibeMaster', value: '128h 40m', avatar: 'https://picsum.photos/seed/2/100' },
  { rank: 3, name: 'NeonKnight', value: '115h 10m', avatar: 'https://picsum.photos/seed/3/100' },
  { rank: 4, name: 'PixelPioneer', value: '98h 55m', avatar: 'https://picsum.photos/seed/4/100' },
  { rank: 5, name: 'CyberGhost', value: '84h 20m', avatar: 'https://picsum.photos/seed/5/100' },
];

export const PROMOTERS_LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'ReferralKing', value: '245 Invites', avatar: 'https://picsum.photos/seed/6/100' },
  { rank: 2, name: 'CommunityHero', value: '182 Invites', avatar: 'https://picsum.photos/seed/7/100' },
  { rank: 3, name: 'LinkSharer', value: '156 Invites', avatar: 'https://picsum.photos/seed/8/100' },
  { rank: 4, name: 'ViralVibe', value: '124 Invites', avatar: 'https://picsum.photos/seed/9/100' },
  { rank: 5, name: 'GrowthHacker', value: '92 Invites', avatar: 'https://picsum.photos/seed/10/100' },
];

export const REWARD_CATALOG = [
  { id: 'upi50', title: '₹50 UPI Cash', cost: 5000, type: 'upi', description: 'Get ₹50 directly into your UPI linked bank account.' },
  { id: 'upi100', title: '₹100 UPI Cash', cost: 10000, type: 'upi', description: 'Get ₹100 directly into your UPI linked bank account.' },
  { id: 'shoutout', title: 'Guaranteed Video Shoutout', cost: 5000, type: 'shoutout', description: 'Get a personal shoutout in our next main video.' },
  { id: 'vip_role', title: 'VIP Discord Role', cost: 2000, type: 'discord', description: 'Exclusive access to private channels and perks.' },
  { id: 'credits', title: 'Name in Credits', cost: 10000, type: 'credits', description: 'Your name immortalized in our video credits forever.' },
  { id: 'badge', title: 'Custom Profile Badge', cost: 1500, type: 'badge', description: 'Stand out in the community with a unique badge.' },
];
