/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect, useMemo } from 'react';
import YouTube from 'react-youtube';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Play, 
  Trophy, 
  Wallet, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Crown, 
  Copy, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  History,
  Gift,
  Menu,
  X,
  LogIn,
  LogOut,
  Lock,
  RefreshCw,
  Save,
  Trash2,
  EyeOff,
  Eye,
  ShoppingBag,
  Activity,
  Share2,
  Heart,
  Clock,
  Settings as SettingsIcon,
  Search,
  Filter,
  UserCheck,
  UserMinus,
  Coins,
  Instagram,
  Facebook,
  MapPin,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserData, Transaction, ActiveTab, LeaderboardUser, RewardItem, OperationType, FirestoreErrorInfo, Settings, Video, Redemption, Reward } from './types';
import Leaderboards from './components/Leaderboards';
import { auth, db, googleProvider } from './firebase';
import Profile from './components/Profile';
import OnboardingGate from './components/OnboardingGate';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  onSnapshot, 
  increment,
  getDocFromServer,
  arrayUnion,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  deleteDoc,
  where,
  serverTimestamp
} from 'firebase/firestore';

const ADMIN_EMAIL = "fouzan1605@gmail.com";

const COLORS = [
  { name: 'Red Fire', color: 'bg-rose-500', shadow: 'hover:shadow-rose-500/40 hover:border-rose-500/50' },
  { name: 'Blue Water', color: 'bg-blue-500', shadow: 'hover:shadow-blue-500/40 hover:border-blue-500/50' },
  { name: 'Neon Green', color: 'bg-emerald-500', shadow: 'hover:shadow-emerald-500/40 hover:border-emerald-500/50' },
  { name: 'Yellow Thunder', color: 'bg-yellow-500', shadow: 'hover:shadow-yellow-500/40 hover:border-yellow-500/50' }
];

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        if (this.state.error && this.state.error.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) message = `Database Error: ${parsed.error}`;
          else message = this.state.error.message;
        } else if (this.state.error) {
          message = String(this.state.error);
        }
      } catch (e) {
        if (this.state.error && this.state.error.message) {
          message = this.state.error.message;
        }
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#05050a] text-white">
          <div className="glass-card p-8 max-w-md text-center">
            <XCircle className="text-rose-500 mx-auto mb-4" size={48} />
            <h2 className="text-2xl font-black mb-4">System Error</h2>
            <p className="text-slate-400 mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-orange-500 rounded-xl font-black uppercase tracking-widest text-xs"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Mock Data ---
const INITIAL_USER_DATA: UserData = {
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
  lifetimePoints: 0,
  activeMissionId: null,
  instagram: '',
  facebook: '',
  state: '',
  district: '',
  photoURL: ''
};

const INITIAL_HISTORY: Transaction[] = [
  { id: '1', type: 'earn', amount: 50, note: 'Daily Drop Verification', date: '2024-03-19' },
  { id: '2', type: 'earn', amount: 100, note: 'Referral Bonus: user_88', date: '2024-03-18' },
  { id: '3', type: 'spend', amount: 2000, note: 'VIP Discord Role', date: '2024-03-15' },
];

const WATCHERS_LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'ShadowSlayer', value: '142h 15m', avatar: 'https://picsum.photos/seed/1/100' },
  { rank: 2, name: 'VibeMaster', value: '128h 40m', avatar: 'https://picsum.photos/seed/2/100' },
  { rank: 3, name: 'NeonKnight', value: '115h 10m', avatar: 'https://picsum.photos/seed/3/100' },
  { rank: 4, name: 'PixelPioneer', value: '98h 55m', avatar: 'https://picsum.photos/seed/4/100' },
  { rank: 5, name: 'CyberGhost', value: '84h 20m', avatar: 'https://picsum.photos/seed/5/100' },
];

const PROMOTERS_LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'ReferralKing', value: '245 Invites', avatar: 'https://picsum.photos/seed/6/100' },
  { rank: 2, name: 'CommunityHero', value: '182 Invites', avatar: 'https://picsum.photos/seed/7/100' },
  { rank: 3, name: 'LinkSharer', value: '156 Invites', avatar: 'https://picsum.photos/seed/8/100' },
  { rank: 4, name: 'ViralVibe', value: '124 Invites', avatar: 'https://picsum.photos/seed/9/100' },
  { rank: 5, name: 'GrowthHacker', value: '92 Invites', avatar: 'https://picsum.photos/seed/10/100' },
];

const REWARDS: RewardItem[] = [
  { id: 'r1', name: 'Guaranteed Video Shoutout', cost: 5000, description: 'Get a personal shoutout in our next main video.' },
  { id: 'r2', name: 'VIP Discord Role', cost: 2000, description: 'Exclusive access to private channels and perks.' },
  { id: 'r3', name: 'Name in Credits', cost: 10000, description: 'Your name immortalized in our video credits forever.' },
  { id: 'r4', name: 'Custom Profile Badge', cost: 1500, description: 'Stand out in the community with a unique badge.' },
];

// --- Admin Dashboard ---

const AdminDashboard = ({ 
  currentUser,
}: { 
  currentUser: FirebaseUser | null, 
}) => {
  const [videoId, setVideoId] = useState('');
  const [color, setColor] = useState('Neon Green');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardCost, setRewardCost] = useState('');
  const [userPoints, setUserPoints] = useState('50');
  const [userCoins, setUserCoins] = useState('10');
  const [guestPoints, setGuestPoints] = useState('10');
  const [guestCoins, setGuestCoins] = useState('2');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [videos, setVideos] = useState<Video[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedemptionsLoading, setIsRedemptionsLoading] = useState(true);
  const [isRewardsLoading, setIsRewardsLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 10;

  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    const uQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(uQuery, (snapshot) => {
      const uList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any as UserData))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      setUsers(uList);
      setIsUsersLoading(false);
    }, (error) => {
      console.error("Users fetch error:", error);
      setIsUsersLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, userPage]);

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  useEffect(() => {
    if (!isAdmin) return;
    const vQuery = query(collection(db, 'videos'));
    const unsubscribe = onSnapshot(vQuery, (snapshot) => {
      const vList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Video))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      setVideos(vList);
      setIsLoading(false);
    }, (error) => {
      console.error("AdminDashboard fetch error:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const rQuery = query(
      collection(db, 'redemptions'), 
      where('status', '==', 'Pending')
    );
    const unsubscribe = onSnapshot(rQuery, (snapshot) => {
      const rList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Redemption))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeA - timeB; // asc
        });
      setRedemptions(rList);
      setIsRedemptionsLoading(false);
    }, (error) => {
      console.error("Redemptions fetch error:", error);
      setIsRedemptionsLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const rwQuery = query(collection(db, 'rewards'));
    const unsubscribe = onSnapshot(rwQuery, (snapshot) => {
      const rwList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Reward))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      setRewards(rwList);
      setIsRewardsLoading(false);
    }, (error) => {
      console.error("Rewards fetch error:", error);
      setIsRewardsLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handlePublish = async () => {
    if (!isAdmin || isSaving || !videoId) return;
    setIsSaving(true);
    setStatus('idle');

    try {
      await addDoc(collection(db, 'videos'), {
        youtubeVideoId: videoId,
        correctColor: color,
        createdAt: serverTimestamp(),
        isActive: true,
        userPoints: parseInt(userPoints),
        userCoins: parseInt(userCoins),
        guestPoints: parseInt(guestPoints),
        guestCoins: parseInt(guestCoins)
      });
      setVideoId('');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'videos');
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateReward = async () => {
    if (!isAdmin || isSaving || !rewardTitle || !rewardCost) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'rewards'), {
        title: rewardTitle,
        cost: parseInt(rewardCost),
        isActive: true,
        createdAt: serverTimestamp()
      });
      setRewardTitle('');
      setRewardCost('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rewards');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRewardStatus = async (reward: Reward) => {
    if (!isAdmin || !reward.id) return;
    try {
      await updateDoc(doc(db, 'rewards', reward.id), {
        isActive: !reward.isActive
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rewards/${reward.id}`);
    }
  };

  const deleteReward = async (id: string) => {
    if (!isAdmin || !id) return;
    try {
      await deleteDoc(doc(db, 'rewards', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rewards/${id}`);
    }
  };

  const toggleVideoStatus = async (video: Video) => {
    if (!isAdmin || !video.id) return;
    try {
      await updateDoc(doc(db, 'videos', video.id), {
        isActive: !video.isActive
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `videos/${video.id}`);
    }
  };

  const deleteVideo = async (id: string) => {
    if (!isAdmin || !id) return;
    // Removed window.confirm as per iframe restrictions
    try {
      await deleteDoc(doc(db, 'videos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${id}`);
    }
  };

  const completeRedemption = async (redemption: Redemption) => {
    if (!isAdmin || !redemption.id || !redemption.userId) return;
    try {
      // Fetch the latest user data to check coins
      const userDoc = await getDoc(doc(db, 'users', redemption.userId));
      if (!userDoc.exists()) {
        console.error("User not found");
        return;
      }
      
      const userData = userDoc.data() as any as UserData;
      const currentCoins = userData.coins || 0;
      
      if (currentCoins < redemption.cost) {
        alert("Insufficient Coins: User does not have enough coins to complete this payout.");
        return;
      }

      // 1. Deduct coins from user (Strictly coins, NOT wallet)
      await updateDoc(doc(db, 'users', redemption.userId), {
        coins: increment(-redemption.cost)
      });

      // 2. Mark redemption as completed
      await updateDoc(doc(db, 'redemptions', redemption.id), {
        status: 'Completed',
        completedAt: serverTimestamp()
      });
      
      // 3. Add transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: redemption.userId,
        type: 'spend',
        amount: redemption.cost,
        note: `Payout Approved: ${redemption.rewardName}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `redemptions/${redemption.id}`);
    }
  };

  const updateUserCoins = async (userId: string, amount: number) => {
    if (!isAdmin || !userId) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        coins: increment(amount)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const seedSampleData = async () => {
    if (!isAdmin || isSaving) return;
    setIsSaving(true);
    try {
      const sampleVideos = [
        { youtubeVideoId: 'jNQXAC9IVRw', correctColor: 'Neon Green', isActive: true },
        { youtubeVideoId: 'dQw4w9WgXcQ', correctColor: 'Blue Water', isActive: true },
        { youtubeVideoId: '9bZkp7q19f0', correctColor: 'Red Fire', isActive: true }
      ];

      for (const v of sampleVideos) {
        await addDoc(collection(db, 'videos'), {
          ...v,
          createdAt: serverTimestamp()
        });
      }
      console.log("Sample missions seeded successfully!");
    } catch (error) {
      console.error("Failed to seed data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const seedSamplePayouts = async () => {
    if (!isAdmin || isSaving) return;
    setIsSaving(true);
    try {
      const samples = [
        { displayName: 'CryptoKing', rewardName: 'Litecoin Payout', cost: 5000 },
        { displayName: 'VibeMaster', rewardName: 'Amazon Gift Card', cost: 2500 },
        { displayName: 'Alex_99', rewardName: 'Discord Nitro', cost: 1500 },
        { displayName: 'Sarah_Vibe', rewardName: 'Litecoin Payout', cost: 5000 },
        { displayName: 'User_404', rewardName: 'Steam Wallet', cost: 3000 }
      ];

      for (const s of samples) {
        await addDoc(collection(db, 'redemptions'), {
          ...s,
          userId: 'sample-user-id',
          userEmail: 'sample@example.com',
          status: 'Completed',
          createdAt: serverTimestamp(),
          completedAt: serverTimestamp()
        });
      }
      console.log("Sample payouts seeded successfully!");
    } catch (error) {
      console.error("Failed to seed payouts:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto mt-20 text-center"
      >
        <div className="p-6 glass-card border-rose-500/30 bg-rose-500/5">
          <AlertTriangle className="text-rose-500 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Access Denied</h2>
          <p className="text-slate-400">This area is restricted to administrators only.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-500">
          <Lock size={32} />
        </div>
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Mission Control</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Global Drop Management System</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add New Mission */}
        <div className="glass-card p-8 space-y-8 h-fit sticky top-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Publish New Mission</h3>
          
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">YouTube Video ID</label>
            <div className="relative">
              <input 
                type="text"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="e.g. jNQXAC9IVRw"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:border-orange-500 outline-none transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                <Play size={18} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">User Points</label>
              <input 
                type="number"
                value={userPoints}
                onChange={(e) => setUserPoints(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">User Coins</label>
              <input 
                type="number"
                value={userCoins}
                onChange={(e) => setUserCoins(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Guest Points</label>
              <input 
                type="number"
                value={guestPoints}
                onChange={(e) => setGuestPoints(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Guest Coins</label>
              <input 
                type="number"
                value={guestCoins}
                onChange={(e) => setGuestCoins(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Correct Verification Color</label>
            <div className="grid grid-cols-2 gap-4">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  className={`p-4 glass-card flex items-center gap-3 transition-all ${
                    color === c.name ? 'border-orange-500 bg-orange-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${c.color}`} />
                  <span className="text-xs font-bold uppercase tracking-tight">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePublish}
            disabled={isSaving || !videoId}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all ${
              status === 'success' 
                ? 'bg-emerald-500 text-white' 
                : status === 'error'
                ? 'bg-rose-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white hover:scale-[1.02] shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:hover:scale-100'
            }`}
          >
            {isSaving ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : status === 'success' ? (
              <CheckCircle2 size={20} />
            ) : status === 'error' ? (
              <AlertTriangle size={20} />
            ) : (
              <Save size={20} />
            )}
            {isSaving ? 'Publishing...' : status === 'success' ? 'Mission Published!' : status === 'error' ? 'Update Failed' : 'Add to Mission Board'}
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={seedSampleData}
              disabled={isSaving}
              className="w-full py-3 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all"
            >
              Seed Missions
            </button>
            <button
              onClick={seedSamplePayouts}
              disabled={isSaving}
              className="w-full py-3 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all"
            >
              Seed Payouts
            </button>
          </div>
        </div>

        {/* Mission Backlog */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 px-2">Active Mission Backlog</h3>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="animate-spin text-orange-500" size={32} />
              </div>
            ) : videos.length === 0 ? (
              <div className="glass-card p-12 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                No missions published yet
              </div>
            ) : (
              videos.map((v) => (
                <div key={v.id} className={`glass-card p-4 flex items-center gap-4 border-l-4 ${v.isActive ? 'border-emerald-500' : 'border-slate-700 opacity-60'}`}>
                  <div className="w-24 aspect-video rounded-lg overflow-hidden bg-black/40 relative group">
                    <img 
                      src={`https://img.youtube.com/vi/${v.youtubeVideoId}/mqdefault.jpg`} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={16} className="text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-400 truncate">{v.youtubeVideoId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${COLORS.find(c => c.name === v.correctColor)?.color || 'bg-white'}`} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-white">{v.correctColor}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleVideoStatus(v)}
                      className={`p-2 rounded-lg transition-colors ${v.isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/5'}`}
                      title={v.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {v.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button 
                      onClick={() => v.id && deleteVideo(v.id)}
                      className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Store Management Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="text-purple-500" />
          <h3 className="text-2xl font-black uppercase tracking-tight">Store Management</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Reward */}
          <div className="glass-card p-8 space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500">Create New Reward</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reward Title</label>
                <input 
                  type="text"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  placeholder="e.g. Amazon Gift Card"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cost (Points)</label>
                <input 
                  type="number"
                  value={rewardCost}
                  onChange={(e) => setRewardCost(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                onClick={handleCreateReward}
                disabled={isSaving || !rewardTitle || !rewardCost}
                className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin mx-auto" size={18} /> : 'Create Reward'}
              </button>
            </div>
          </div>

          {/* Rewards List */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 px-2">Active Store Items</h4>
            {isRewardsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="animate-spin text-purple-500" size={24} />
              </div>
            ) : rewards.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                No rewards created yet
              </div>
            ) : (
              rewards.map((r) => (
                <div key={r.id} className={`glass-card p-4 flex items-center justify-between gap-4 border-l-4 ${r.isActive ? 'border-purple-500' : 'border-slate-700 opacity-60'}`}>
                  <div>
                    <h5 className="font-black text-sm">{r.title}</h5>
                    <p className="text-xs font-bold text-slate-500">{r.cost.toLocaleString()} Points</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleRewardStatus(r)}
                      className={`p-2 rounded-lg transition-colors ${r.isActive ? 'text-purple-500 hover:bg-purple-500/10' : 'text-slate-500 hover:bg-white/5'}`}
                    >
                      {r.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button 
                      onClick={() => r.id && deleteReward(r.id)}
                      className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending Redemptions Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Gift className="text-purple-500" />
          <h3 className="text-2xl font-black uppercase tracking-tight">Pending Redemptions</h3>
        </div>
        
        <div className="glass-card overflow-hidden">
          {isRedemptionsLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="animate-spin text-purple-500" size={32} />
            </div>
          ) : redemptions.length === 0 ? (
            <div className="p-12 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
              No pending orders in queue
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {redemptions.map((r) => (
                <div key={r.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white uppercase tracking-tight">{r.rewardName}</h4>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-black rounded uppercase tracking-widest">
                        {r.cost} PTS
                      </span>
                    </div>
                    <div className="flex flex-col text-xs text-slate-400 font-medium">
                      <span>{r.displayName} ({r.userEmail})</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                        Ordered: {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : 'Recently'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => r.id && completeRedemption(r)}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    Mark as Completed
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Management Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-orange-500" />
            <h3 className="text-2xl font-black uppercase tracking-tight">User Management</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Search users..."
                className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-orange-500 transition-colors w-64"
              />
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          {isUsersLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="animate-spin text-orange-500" size={32} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
              No users found matching your search
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Spendable Coins</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Stats</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-black">
                              {u.displayName?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="font-black text-white text-sm">{u.displayName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Coins size={14} className="text-orange-500" />
                            <span className="font-black text-white">{(u.coins || 0).toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Points</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <Play size={10} />
                              <span>{u.claimedVideos?.length || 0} Missions</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <Users size={10} />
                              <span>{u.referrals || 0} Referrals</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => u.id && updateUserCoins(u.id, 100)}
                              className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors"
                              title="Add 100 Points"
                            >
                              <Coins size={16} />
                            </button>
                            <button 
                              onClick={() => u.id && updateUserCoins(u.id, -100)}
                              className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-colors"
                              title="Deduct 100 Points"
                            >
                              <UserMinus size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Showing {((userPage - 1) * usersPerPage) + 1} to {Math.min(userPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setUserPage(p => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                      className="p-2 glass-card hover:bg-white/10 disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setUserPage(i + 1)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                            userPage === i + 1 
                              ? 'bg-orange-500 text-white' 
                              : 'glass-card hover:bg-white/10 text-slate-500'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                      disabled={userPage === totalPages}
                      className="p-2 glass-card hover:bg-white/10 disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Helper Functions ---

const isNewDay = (lastTimestamp?: number) => {
  if (!lastTimestamp) return true;
  const lastDate = new Date(lastTimestamp);
  const nowDate = new Date();
  return (
    lastDate.getDate() !== nowDate.getDate() ||
    lastDate.getMonth() !== nowDate.getMonth() ||
    lastDate.getFullYear() !== nowDate.getFullYear()
  );
};

const isNewWeek = (lastTimestamp?: number) => {
  if (!lastTimestamp) return true;
  
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const lastMonday = getMonday(new Date(lastTimestamp));
  const nowMonday = getMonday(new Date());
  
  return lastMonday.getTime() !== nowMonday.getTime();
};

const isNewMonth = (lastTimestamp?: number) => {
  if (!lastTimestamp) return true;
  const lastDate = new Date(lastTimestamp);
  const nowDate = new Date();
  return (
    lastDate.getMonth() !== nowDate.getMonth() ||
    lastDate.getFullYear() !== nowDate.getFullYear()
  );
};

const formatWatchTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

// --- Mission Board ---

const MissionBoard = ({ 
  user, 
  currentUser, 
  onRewardClaimed,
  recentPayouts,
  showToast,
  setActiveTab
}: { 
  user: UserData, 
  currentUser: FirebaseUser | null,
  onRewardClaimed: (videoId: string, points: number, coins: number, watchTime: number) => void,
  recentPayouts: Redemption[],
  showToast: (message: string, type: 'success' | 'error') => void,
  setActiveTab: (tab: ActiveTab) => void
}) => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [verificationState, setVerificationState] = useState<'idle' | 'success' | 'fail' | 'claimed'>('idle');
  const [isOutOfLives, setIsOutOfLives] = useState(false);
  
  // Anti-Cheat States
  const [player, setPlayer] = useState<any>(null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const isProcessingRef = React.useRef(false);
  const timerRef = React.useRef<any>(null);

  const formatWatchTimeLocal = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // 1. THE "TAB-SWITCHING" EXPLOIT (Page Visibility)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && player) {
        player.pauseVideo();
        showToast("Video paused! Keep this tab open to earn your watch time.", "error");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, player, showToast]);

  useEffect(() => {
    const vQuery = query(collection(db, 'videos'));
    const unsubscribe = onSnapshot(vQuery, (snapshot) => {
      const vList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Video))
        .filter(v => v.isActive)
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      setVideos(vList);
      setIsLoading(false);
    }, (error) => {
      console.error("MissionBoard fetch error:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Anti-Cheat Watch Time Tracker & Skip Enforcer
  useEffect(() => {
    if (isPlaying && player && selectedVideo) {
      timerRef.current = setInterval(() => {
        const currentTime = player.getCurrentTime();
        
        // 1. Real Watch Time Tracking
        setWatchedSeconds(prev => prev + 1);

        // 2. Anti-Skip Enforcer
        if (currentTime > maxWatchedTime + 2) {
          player.seekTo(maxWatchedTime, true);
          showToast("Skipping is disabled! Watch the full drop to earn points.", "error");
        } else {
          setMaxWatchedTime(Math.max(maxWatchedTime, currentTime));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, player, selectedVideo, maxWatchedTime]);

  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
    setDuration(event.target.getDuration());
  };

  const onPlayerStateChange = (event: any) => {
    // YouTube.PlayerState.PLAYING is 1
    setIsPlaying(event.data === 1);
  };

  const handleVideoSelect = async (video: Video) => {
    if (user.claimedVideos.includes(video.youtubeVideoId)) return;
    setSelectedVideo(video);
    setVerificationState('idle');
    setIsOutOfLives(false);
    
    // Reset Anti-Cheat States
    setWatchedSeconds(0);
    setMaxWatchedTime(0);
    setDuration(0);
    setIsPlaying(false);

    // Persist active mission if logged in
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          activeMissionId: video.id
        });
      } catch (error) {
        console.error("Failed to persist active mission:", error);
      }
    }
  };

  const handleCancelMission = async () => {
    setSelectedVideo(null);
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          activeMissionId: null
        });
      } catch (error) {
        console.error("Failed to clear active mission:", error);
      }
    }
  };

  const handleShareVideo = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast("Please sign in to share drops!", "error");
      return;
    }
    const shareLink = `https://viewvibeus.netlify.app/guest/${videoId}?ref=${currentUser.uid}`;
    navigator.clipboard.writeText(shareLink);
    showToast("Referral link for this drop copied!", "success");
  };

  useEffect(() => {
    if (user.activeMissionId && videos.length > 0 && !selectedVideo) {
      const active = videos.find(v => v.id === user.activeMissionId);
      if (active && !user.claimedVideos.includes(active.youtubeVideoId)) {
        setSelectedVideo(active);
      }
    }
  }, [user.activeMissionId, videos, selectedVideo, user.claimedVideos]);

  const handleVerify = async (color: string) => {
    if (!currentUser || isProcessingRef.current || !selectedVideo || isOutOfLives) return;
    if (verificationState !== 'idle') return;

    // 3. Anti-Guess Button Lock Check
    if (maxWatchedTime < duration * 0.8) {
      showToast("Keep watching to unlock verification!", "error");
      return;
    }
    
    if (user.claimedVideos?.includes(selectedVideo.youtubeVideoId)) {
      setVerificationState('fail');
      showToast('You have already claimed this drop!', 'error');
      setTimeout(() => {
        setVerificationState('idle');
        isProcessingRef.current = false;
      }, 2000);
      return;
    }

    isProcessingRef.current = true;

    try {
      if (color === selectedVideo.correctColor) {
        setVerificationState('success');
        
        // 4. Dynamic Reward Payout
        const earnedPoints = selectedVideo.userPoints || 50;
        const earnedCoins = selectedVideo.userCoins || 10;
        await onRewardClaimed(selectedVideo.youtubeVideoId, earnedPoints, earnedCoins, watchedSeconds);
        
        // Clear active mission on success
        if (currentUser) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            activeMissionId: null
          });
        }

        setTimeout(() => {
          setSelectedVideo(null);
          isProcessingRef.current = false;
        }, 2000);
      } else {
        // WRONG GUESS LOGIC
        if (user.extraLives > 0) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            extraLives: increment(-1)
          });
          setVerificationState('fail');
          showToast(`Wrong Color! -1 Life used. Try again! (${user.extraLives - 1} left)`, 'error');
          setTimeout(() => {
            setVerificationState('idle');
            isProcessingRef.current = false;
          }, 2000);
        } else {
          setVerificationState('fail');
          setIsOutOfLives(true);
          showToast("Incorrect! Out of lives. You lost the points for this drop.", "error");
          isProcessingRef.current = false;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      isProcessingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="animate-spin text-orange-500 mb-4" size={48} />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Loading Missions...</p>
      </div>
    );
  }

  const isUnlocked = duration > 0 && maxWatchedTime >= duration * 0.8;
  const completedCount = user?.totalCorrect || user?.claimedVideos?.length || 0;

  // Legacy Fallback Logic for Stats
  const networkPoints = user?.earnedFromReferrals || 0;
  const personalPoints = user?.earnedFromVideos || (networkPoints === 0 ? user?.wallet || 0 : 0);

  const networkWatchTime = user?.networkWatchTime || 0;
  const personalWatchTime = user?.personalWatchTime || (networkWatchTime === 0 ? user?.verifiedWatchTime || 0 : 0);

  return (
    <div className="space-y-12">
      {/* Three-Pillar Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lifetime Points Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/leaderboards?tab=earners')}
          className="bg-[#1A1A1D] border border-white/5 p-6 rounded-2xl flex flex-col justify-center cursor-pointer hover:scale-105 transition-transform group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
              <Trophy size={16} className="text-orange-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lifetime Points</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-white">
              {(user?.wallet || 0).toLocaleString()}
            </h3>
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">XP</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              From Videos: {personalPoints.toLocaleString()} XP | From Network: {networkPoints.toLocaleString()} XP
            </p>
          </div>
        </motion.div>

        {/* Spendable Coins Card - Clickable */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/wallet')}
          className="bg-[#1A1A1D] border border-white/5 p-6 rounded-2xl flex flex-col justify-center cursor-pointer hover:scale-105 transition-transform group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
              <Wallet size={16} className="text-yellow-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spendable Coins</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-white">
              {(user?.coins || 0).toLocaleString()}
            </h3>
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">COINS</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Click to visit the store
            </p>
          </div>
        </motion.div>

        {/* Watch Time Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate('/leaderboards?tab=watchers')}
          className="bg-[#1A1A1D] border border-white/5 p-6 rounded-2xl flex flex-col justify-center cursor-pointer hover:scale-105 transition-transform group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
              <Activity size={16} className="text-emerald-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Verified Watch Time</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-white">
              {formatWatchTimeLocal(user?.verifiedWatchTime || 0)}
            </h3>
          </div>
          <div className="mt-2 pt-2 border-t border-white/5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Personal: {formatWatchTimeLocal(personalWatchTime)} | Network: {formatWatchTimeLocal(networkWatchTime)}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-1">Mission Board</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Complete drops to earn elite rewards</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 bg-[#1A1A1D] border border-white/5 px-5 py-3 rounded-xl">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Next Life</p>
              <p className="text-lg font-black text-rose-500">{(user?.totalCorrect || 0) % 5} / 5 to next life</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <Heart className={`text-rose-500 ${user.extraLives > 0 ? 'animate-pulse' : ''}`} size={20} fill={user.extraLives > 0 ? "currentColor" : "none"} />
          </div>
          <div className="flex items-center gap-4 bg-[#1A1A1D] border border-white/5 px-5 py-3 rounded-xl">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Completed</p>
              <p className="text-lg font-black text-white">{completedCount} Drops Completed</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <Trophy className="text-orange-500" size={20} />
          </div>
        </div>
      </div>

      {/* Recent Payouts Feed */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="text-orange-500" />
          <h3 className="text-xl font-black uppercase tracking-tight">Live Activity</h3>
        </div>
        {recentPayouts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPayouts.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card p-4 flex items-center gap-4 bg-emerald-500/5 border-emerald-500/20"
              >
                <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-500">
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    🎉 <span className="text-emerald-400">{p.displayName}</span> redeemed <span className="text-orange-400">{p.rewardName}</span>
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                    for {p.cost.toLocaleString()} pts
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center border-dashed border-white/10">
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Waiting for live activity...</p>
            <p className="text-slate-600 text-[8px] mt-1">Completed redemptions will appear here in real-time</p>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selectedVideo ? (
          <motion.div
            key="active-mission"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-2 aspect-video relative overflow-hidden">
                <YouTube
                  videoId={selectedVideo.youtubeVideoId}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 1,
                      controls: 1,
                      rel: 0,
                      modestbranding: 1,
                    },
                  }}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  className="w-full h-full rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between p-6 glass-card">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-xl text-orange-500">
                    <Play size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Active Mission</h3>
                    <p className="text-xs text-slate-500 font-mono">{selectedVideo.youtubeVideoId}</p>
                  </div>
                </div>
                <button 
                  onClick={handleCancelMission}
                  className="px-4 py-2 text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
                >
                  Cancel Mission
                </button>
              </div>
            </div>

            <div className="glass-card p-8 flex flex-col items-center text-center">
              <div className="flex items-center justify-between w-full mb-6">
                <h3 className="text-xl font-black uppercase tracking-widest">Verification</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 rounded-full border border-rose-500/20">
                  <Heart className="text-rose-500" size={12} fill="currentColor" />
                  <span className="text-rose-500 text-xs font-black">{user.extraLives}</span>
                </div>
              </div>
              
              {!isUnlocked ? (
                <div className="flex flex-col items-center justify-center flex-1 py-10">
                  <Lock className="text-slate-600 mb-4 animate-pulse" size={48} />
                  <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] max-w-[200px]">
                    Keep watching to unlock verification...
                  </p>
                  <p className="text-orange-500 font-mono text-xs mt-2">
                    {Math.floor(maxWatchedTime)}s / {Math.floor(duration * 0.8)}s
                  </p>
                </div>
              ) : (
                <>
                  <p className={`text-sm font-bold uppercase tracking-widest mb-8 ${
                    verificationState === 'idle' ? 'text-slate-500' : 
                    verificationState === 'success' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {verificationState === 'idle' && 'Select the Hidden Color'}
                    {verificationState === 'success' && 'Mission Accomplished!'}
                    {verificationState === 'fail' && 'Incorrect Selection!'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    {COLORS.map((btn) => (
                      <motion.button
                        key={btn.name}
                        whileHover={{ scale: (verificationState === 'idle' && !isOutOfLives) ? 1.05 : 1 }}
                        whileTap={{ scale: (verificationState === 'idle' && !isOutOfLives) ? 0.95 : 1 }}
                        disabled={verificationState !== 'idle' || isOutOfLives}
                        onClick={() => handleVerify(btn.name)}
                        className={`glass-card p-6 flex flex-col items-center gap-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${btn.shadow} ${
                          verificationState === 'success' && btn.name === selectedVideo.correctColor ? 'border-emerald-500 bg-emerald-500/20 animate-pulse' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full ${btn.color} shadow-lg shadow-black/50`} />
                        <span className="text-xs font-black uppercase tracking-tighter">{btn.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              {isOutOfLives && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 p-6 w-full glass-card border-rose-500/50 bg-rose-500/10 flex flex-col items-center gap-3"
                >
                  <XCircle className="text-rose-500" size={32} />
                  <p className="font-black text-rose-400 uppercase tracking-tighter text-sm">Incorrect! Out of lives.</p>
                  <p className="text-[10px] text-rose-500/70 font-bold uppercase">You lost the points for this drop.</p>
                </motion.div>
              )}

              {verificationState === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-4 w-full glass-card border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center gap-3"
                >
                  <CheckCircle2 className="text-emerald-500" />
                  <span className="font-bold text-emerald-400">+{selectedVideo.userPoints || 50} PTS AWARDED</span>
                </motion.div>
              )}

              {verificationState === 'fail' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-4 w-full glass-card border-rose-500/30 bg-rose-500/10 flex items-center justify-center gap-3"
                >
                  <XCircle className="text-rose-500" />
                  <span className="font-bold text-rose-400">ACCESS DENIED</span>
                </motion.div>
              )}

              <div className="mt-auto pt-8 w-full">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  <span>Watch Progress</span>
                  <span>{duration > 0 ? Math.min(100, Math.floor((maxWatchedTime / duration) * 100)) : 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${duration > 0 ? Math.min(100, (maxWatchedTime / duration) * 100) : 0}%` }}
                    className="h-full bg-orange-500"
                  />
                </div>
                <p className="text-[8px] font-mono text-slate-600 mt-2 uppercase">
                  Effort: {watchedSeconds}s / {Math.floor(duration)}s
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mission-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {videos.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-card">
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No active missions available</p>
                <p className="text-slate-600 text-[10px] mt-2">Check back later for new drops!</p>
              </div>
            ) : (
              videos.map((v) => {
                const isClaimed = user.claimedVideos.includes(v.youtubeVideoId);
                return (
                  <motion.div
                    key={v.id}
                    whileHover={!isClaimed ? { y: -5, scale: 1.02 } : {}}
                    onClick={() => !isClaimed && handleVideoSelect(v)}
                    onKeyDown={(e) => {
                      if (!isClaimed && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleVideoSelect(v);
                      }
                    }}
                    tabIndex={isClaimed ? -1 : 0}
                    role="button"
                    className={`glass-card p-4 text-left group transition-all duration-300 ${
                      isClaimed ? 'opacity-50 grayscale cursor-default' : 'hover:border-orange-500/50 cursor-pointer'
                    }`}
                  >
                    <div className="aspect-video rounded-xl overflow-hidden mb-4 relative">
                      <img 
                        src={`https://img.youtube.com/vi/${v.youtubeVideoId}/maxresdefault.jpg`} 
                        alt="Mission Thumbnail" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {!isClaimed && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-3 bg-orange-500 rounded-full text-white shadow-xl shadow-orange-500/40">
                            <Play size={24} fill="currentColor" />
                          </div>
                        </div>
                      )}
                      {isClaimed && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            Completed
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black uppercase tracking-tight text-lg mb-1 group-hover:text-orange-500 transition-colors">
                          Mission Drop
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {v.createdAt?.toDate ? v.createdAt.toDate().toLocaleDateString() : 'Recent Drop'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-orange-500">
                          <span className="text-sm font-black">+{v.userPoints || 50}</span>
                          <span className="text-[8px] font-bold uppercase">PTS</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <span className="text-sm font-black">+{v.userCoins || 10}</span>
                          <span className="text-[8px] font-bold uppercase">COINS</span>
                        </div>
                        <button
                          onClick={(e) => handleShareVideo(v.youtubeVideoId, e)}
                          className="p-2 bg-white/5 hover:bg-orange-500/20 text-slate-400 hover:text-orange-500 rounded-lg transition-all border border-white/5 hover:border-orange-500/30 group/share mt-1"
                          title="Share for Referral Points"
                        >
                          <Share2 size={14} className="group-hover/share:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Guest View ---

const GuestView = ({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) => {
  const [player, setPlayer] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  
  const timerRef = React.useRef<any>(null);
  
  // 1. BULLETPROOF REFERRAL ID GRABBING
  const queryParams = new URLSearchParams(window.location.search);
  const referrerUid = queryParams.get('ref');
  
  // Get videoId from URL
  const pathParts = window.location.pathname.split('/');
  const videoId = pathParts[2];

  useEffect(() => {
    const initFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setVisitorId(result.visitorId);
    };
    initFingerprint();
  }, []);

  // ANTI-CHEAT: Tab Block (Page Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && player && isPlaying) {
        player.pauseVideo();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [player, isPlaying]);

  useEffect(() => {
    if (isPlaying && player && videoId && visitorId && !isProcessed) {
      timerRef.current = setInterval(async () => {
        const currentTime = player.getCurrentTime();
        
        // ANTI-CHEAT: Anti-Skip Engine
        if (currentTime > maxWatchedTime + 2) {
          player.seekTo(maxWatchedTime);
          showToast("Anti-Cheat: Skipping is not allowed!", "error");
          return;
        }

        const newMaxTime = Math.max(maxWatchedTime, currentTime);
        setMaxWatchedTime(newMaxTime);

        // Check for 80% watch time using VERIFIED maxWatchedTime
        if (newMaxTime >= duration * 0.8 && duration > 0 && !isProcessed) {
          clearInterval(timerRef.current);
          setIsProcessed(true);
          await handleGuestReward(newMaxTime);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, player, duration, videoId, visitorId, isProcessed, maxWatchedTime]);

  const handleGuestReward = async (verifiedTime: number) => {
    if (!referrerUid) return;
    if (!visitorId || !videoId) return;

    const guestViewId = `${visitorId}_${videoId}`;
    const guestViewRef = doc(db, 'guest_views', guestViewId);
    
    try {
      const guestViewDoc = await getDoc(guestViewRef);
      
      if (guestViewDoc.exists()) {
        showToast("Thanks for watching! Create an account to start earning your own points.", "success");
        return;
      }

      // Lock this device for this video
      await setDoc(guestViewRef, {
        visitorId,
        videoId,
        createdAt: serverTimestamp()
      });

      // Fetch dynamic guest rewards from video document
      const vQuery = query(collection(db, "videos"), where("youtubeVideoId", "==", videoId));
      const vSnapshot = await getDocs(vQuery);
      const videoData = !vSnapshot.empty ? (vSnapshot.docs[0].data() as Video) : null;
      const referralPoints = videoData?.guestPoints || 10;
      const referralCoins = videoData?.guestCoins || 2;

      // THE FIRESTORE PAYLOAD (Syncing the Network Buckets)
      const referrerRef = doc(db, "users", referrerUid);
      const referrerDoc = await getDoc(referrerRef);
      const referrerData = referrerDoc.data() as UserData;
      const lastTs = referrerData?.lastEarnedTimestamp;
      const watchMins = Math.floor(verifiedTime / 60);

      const updatePayload: any = {
        wallet: increment(referralPoints),
        coins: increment(referralCoins),
        earnedFromReferrals: increment(referralPoints),
        networkWatchTime: increment(watchMins),
        lastEarnedTimestamp: Date.now(),
      };

      // Lazy Reset Logic for Referrer
      if (isNewDay(lastTs)) {
        updatePayload.dailyPoints = referralPoints;
        updatePayload.dailyWatchTime = watchMins;
      } else {
        updatePayload.dailyPoints = increment(referralPoints);
        updatePayload.dailyWatchTime = increment(watchMins);
      }

      if (isNewWeek(lastTs)) {
        updatePayload.weeklyPoints = referralPoints;
        updatePayload.weeklyWatchTime = watchMins;
      } else {
        updatePayload.weeklyPoints = increment(referralPoints);
        updatePayload.weeklyWatchTime = increment(watchMins);
      }

      if (isNewMonth(lastTs)) {
        updatePayload.monthlyPoints = referralPoints;
        updatePayload.monthlyWatchTime = watchMins;
      } else {
        updatePayload.monthlyPoints = increment(referralPoints);
        updatePayload.monthlyWatchTime = increment(watchMins);
      }

      await updateDoc(referrerRef, updatePayload);

      showToast(
        `Success! You just earned ${referralPoints} Points & ${referralCoins} Coins for your friend! Sign up to start earning your own cash.`,
        "success"
      );
    } catch (error) {
      console.error("Failed to award points. Database error:", error);
      showToast("Failed to award points. Database error.", "error");
    }
  };

  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
    setDuration(event.target.getDuration());
  };

  const onPlayerStateChange = (event: any) => {
    setIsPlaying(event.data === 1);
  };

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <AlertTriangle className="text-orange-500 mb-4" size={48} />
        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Invalid Guest Link</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Please use a valid referral link to watch drops.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500/30">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full border border-orange-500/20 mb-4">
            <Play className="text-orange-500" size={16} />
            <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Guest Mission Mode</span>
          </div>
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
            Watch & <span className="text-orange-500">Support</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs max-w-md mx-auto">
            You are watching a mission drop to help a friend earn points. Watch 80% to complete the support!
          </p>
        </div>

        <div className="glass-card p-2 aspect-video relative overflow-hidden shadow-2xl shadow-orange-500/10">
          <YouTube
            videoId={videoId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                controls: 1,
                rel: 0,
                modestbranding: 1,
              },
            }}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            className="w-full h-full rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Support Progress</h3>
              <span className="text-orange-500 font-mono text-xs">
                {duration > 0 ? Math.min(100, Math.floor((maxWatchedTime / (duration * 0.8)) * 100)) : 0}%
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${duration > 0 ? Math.min(100, (maxWatchedTime / (duration * 0.8)) * 100) : 0}%` }}
                className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
              {isProcessed ? "Support Completed! 🎉" : "Keep watching to support your friend"}
            </p>
          </div>

          <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4 border-orange-500/20 bg-orange-500/5">
            <Gift className="text-orange-500" size={32} />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Want to earn too?</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Create an account and start earning cash for every drop you watch!
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-orange-500/20"
            >
              Join ViewVibe Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Components ---

const SidebarLink = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 group relative ${
      active 
        ? 'bg-white/10 text-white border-l-4 border-orange-500' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon size={20} className={active ? 'text-orange-500' : 'group-hover:text-orange-400 transition-colors'} />
    <span className="font-medium tracking-wide">{label}</span>
    {active && (
      <motion.div 
        layoutId="active-pill"
        className="absolute right-4 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
      />
    )}
  </button>
);

// --- App Component ---

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ViewVibeApp />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

function ViewVibeApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<UserData>(INITIAL_USER_DATA);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('missionBoard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [leaderboardCategory, setLeaderboardCategory] = useState<'earners' | 'watchers'>('earners');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'overall'>('overall');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isRewardsLoading, setIsRewardsLoading] = useState(true);
  const [recentPayouts, setRecentPayouts] = useState<Redemption[]>([]);
  const isProcessingRef = React.useRef(false);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('missionBoard');
    else if (path === '/leaderboards') {
      setActiveTab('leaderboard');
      const tab = searchParams.get('tab');
      if (tab === 'earners' || tab === 'watchers') {
        setLeaderboardCategory(tab);
      }
    }
    else if (path === '/wallet') setActiveTab('wallet');
    else if (path === '/referrals') setActiveTab('referrals');
    else if (path === '/history') setActiveTab('history');
    else if (path === '/settings') setActiveTab('settings');
    else if (path === '/profile') setActiveTab('profile');
    else if (path === '/admin') setActiveTab('admin');
    else if (path.startsWith('/guest/')) setActiveTab('guest');
  }, [location, searchParams]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Rewards Sync ---
  useEffect(() => {
    const rwQuery = query(collection(db, 'rewards'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(rwQuery, (snapshot) => {
      const rwList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
      setRewards(rwList);
      setIsRewardsLoading(false);
    }, (error) => {
      console.error("Rewards fetch error:", error);
      setIsRewardsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Live Activity Sync ---
  useEffect(() => {
    const pQuery = query(
      collection(db, 'redemptions'),
      where('status', '==', 'Completed')
    );
    const unsubscribe = onSnapshot(pQuery, (snapshot) => {
      const pList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Redemption))
        .sort((a, b) => {
          const timeA = a.completedAt?.toMillis?.() || 0;
          const timeB = b.completedAt?.toMillis?.() || 0;
          return timeB - timeA;
        })
        .slice(0, 5);
      setRecentPayouts(pList);
    }, (error) => {
      console.error("Recent payouts fetch error:", error);
    });
    return () => unsubscribe();
  }, []);

  // --- Routing & Referrals ---
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setActiveTab('admin');
    }
    
    if (window.location.pathname.startsWith('/guest/')) {
      setActiveTab('guest' as any);
    }

    // Capture Referral Code
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
      console.log("Referral code captured:", refCode);
    }
  }, []);

  // --- Leaderboard Sync ---
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    // We fetch a larger set and sort client-side to handle legacy users without lifetimePoints
    // This ensures the "Top Earners" list isn't blank for new/legacy mixed environments
    const q = query(collection(db, 'users'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const getSortValue = (u: any) => {
        if (leaderboardCategory === 'earners') {
          if (timeframe === 'daily') return u.dailyPoints || 0;
          if (timeframe === 'weekly') return u.weeklyPoints || 0;
          if (timeframe === 'monthly') return u.monthlyPoints || 0;
          return u.lifetimePoints || u.wallet || 0;
        } else {
          if (timeframe === 'daily') return u.dailyWatchTime || 0;
          if (timeframe === 'weekly') return u.weeklyWatchTime || 0;
          if (timeframe === 'monthly') return u.monthlyWatchTime || 0;
          return u.verifiedWatchTime || 0;
        }
      };

      const sorted = allUsers
        .sort((a, b) => getSortValue(b) - getSortValue(a))
        .slice(0, 10)
        .map((u, index) => ({
          ...u,
          rank: index + 1,
          displayValue: getSortValue(u)
        }));

      setTopUsers(sorted);
    }, (error) => {
      console.error("Leaderboard fetch error:", error);
    });
    return () => unsubscribe();
  }, [leaderboardCategory, timeframe]);

  useEffect(() => {
    if (!currentUser) return;
    
    // For rank, we fetch all users and calculate client-side to ensure accuracy with fallbacks
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const getSortValue = (u: any) => {
        if (leaderboardCategory === 'earners') {
          if (timeframe === 'daily') return u.dailyPoints || 0;
          if (timeframe === 'weekly') return u.weeklyPoints || 0;
          if (timeframe === 'monthly') return u.monthlyPoints || 0;
          return u.lifetimePoints || u.wallet || 0;
        } else {
          if (timeframe === 'daily') return u.dailyWatchTime || 0;
          if (timeframe === 'weekly') return u.weeklyWatchTime || 0;
          if (timeframe === 'monthly') return u.monthlyWatchTime || 0;
          return u.verifiedWatchTime || 0;
        }
      };

      const currentUserValue = getSortValue(user);
      const rank = allUsers.filter(u => getSortValue(u) > currentUserValue).length + 1;
      setUserRank(rank);
    }, (error) => {
      console.error("User rank fetch error:", error);
    });
    return () => unsubscribe();
  }, [currentUser, user, leaderboardCategory, timeframe]);

  // --- Auth & Firestore Sync ---
  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    let historyUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);

      // Clean up previous listeners
      if (userUnsubscribe) userUnsubscribe();
      if (historyUnsubscribe) historyUnsubscribe();

      if (fbUser) {
        console.log("Auth state changed: User logged in", fbUser.uid);
        const userDocRef = doc(db, 'users', fbUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            console.log("User document does not exist, creating new one...");
            // Ensure we have a valid email for the security rules
            const email = fbUser.email || `${fbUser.uid}@viewvibe.internal`;
            const newUserData: UserData = {
              displayName: fbUser.displayName || 'Anonymous',
              email: email,
              wallet: 0,
              earnedFromVideos: 0,
              earnedFromReferrals: 0,
              verifiedWatchTime: 0,
              personalWatchTime: 0,
              networkWatchTime: 0,
              referrals: 0,
              claimedVideos: [],
              lifetimePoints: 0,
              activeMissionId: null,
              extraLives: 0,
              totalCorrect: 0,
              instagram: '',
              facebook: '',
              state: '',
              district: '',
              photoURL: fbUser.photoURL || '',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newUserData);
            console.log("New user document created in Firestore for UID:", fbUser.uid);
          } else {
            console.log("User document already exists for UID:", fbUser.uid);
          }

          // Set up listeners
          userUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUser(docSnap.data() as UserData);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
          });

          const historyQuery = query(
            collection(db, 'transactions'),
            where('userId', '==', fbUser.uid)
          );
          historyUnsubscribe = onSnapshot(historyQuery, (snapshot) => {
            const txs = snapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              } as Transaction))
              .sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA; // desc
              });
            setHistory(txs);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'transactions');
          });

          setIsAuthReady(true);
        } catch (error) {
          console.error("Auth sync error:", error);
          setIsAuthReady(true);
        }
      } else {
        setUser(INITIAL_USER_DATA);
        setHistory(INITIAL_HISTORY); // Show mock history for guests
        setIsAuthReady(true);
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
      if (historyUnsubscribe) historyUnsubscribe();
    };
  }, []);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // --- Actions ---
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const refCode = localStorage.getItem('referralCode');
        const email = fbUser.email || `${fbUser.uid}@viewvibe.internal`;
        
        let initialWallet = 0;
        if (refCode && refCode !== fbUser.uid) {
          initialWallet = 100; // Starting bonus
          
          // Reward the referrer
          try {
            const referrerRef = doc(db, 'users', refCode);
            const referrerDoc = await getDoc(referrerRef);
            if (referrerDoc.exists()) {
              await updateDoc(referrerRef, {
                wallet: increment(500),
                earnedFromReferrals: increment(500),
                referrals: increment(1)
              });
              
              // Add transaction for referrer
              await addDoc(collection(db, 'transactions'), {
                userId: refCode,
                type: 'earn',
                amount: 500,
                note: `Referral Bonus: ${fbUser.displayName || 'New User'}`,
                date: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
              });
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, `users/${refCode}`);
          }
          
          localStorage.removeItem('referralCode');
        }

        const newUserData: UserData = {
          displayName: fbUser.displayName || 'Anonymous',
          email: email,
          wallet: initialWallet,
          earnedFromVideos: 0,
          earnedFromReferrals: initialWallet,
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
          photoURL: fbUser.photoURL || '',
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newUserData);
        
        if (initialWallet > 0) {
          // Add transaction for new user
          await addDoc(collection(db, 'transactions'), {
            userId: fbUser.uid,
            type: 'earn',
            amount: 100,
            note: 'Welcome Bonus (Referral)',
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
          });
        }
        
        console.log("New user document created in Firestore for UID:", fbUser.uid);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      showToast('Login failed. Please try again.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleRewardClaimed = async (videoId: string, points: number, coins: number, watchTime: number) => {
    if (!currentUser || isProcessingRef.current) return;
    
    isProcessingRef.current = true;

    // INFINITE POINTS EXPLOIT FIX: Check if already claimed
    if (user.claimedVideos?.includes(videoId)) {
      showToast('You have already claimed this drop!', 'error');
      isProcessingRef.current = false;
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      const newTotalCorrect = (user.totalCorrect || 0) + 1;
      let extraLifeEarned = false;
      let extraLivesUpdate = user.extraLives || 0;

      if (newTotalCorrect % 5 === 0 && extraLivesUpdate < 5) {
        extraLivesUpdate += 1;
        extraLifeEarned = true;
      }

      const lastTs = user.lastEarnedTimestamp;
      const watchMins = Math.floor(watchTime / 60);
      
      const updatePayload: any = {
        wallet: increment(points),
        lifetimePoints: increment(points),
        coins: increment(coins), // Award Spendable Coins
        earnedFromVideos: increment(points),
        verifiedWatchTime: increment(watchMins), // Tracked in minutes
        personalWatchTime: increment(watchMins), // Tracked in minutes
        claimedVideos: arrayUnion(videoId),
        totalCorrect: newTotalCorrect,
        extraLives: extraLivesUpdate,
        lastEarnedTimestamp: Date.now()
      };

      // Lazy Reset Logic
      if (isNewDay(lastTs)) {
        updatePayload.dailyPoints = points;
        updatePayload.dailyWatchTime = watchMins;
      } else {
        updatePayload.dailyPoints = increment(points);
        updatePayload.dailyWatchTime = increment(watchMins);
      }

      if (isNewWeek(lastTs)) {
        updatePayload.weeklyPoints = points;
        updatePayload.weeklyWatchTime = watchMins;
      } else {
        updatePayload.weeklyPoints = increment(points);
        updatePayload.weeklyWatchTime = increment(watchMins);
      }

      if (isNewMonth(lastTs)) {
        updatePayload.monthlyPoints = points;
        updatePayload.monthlyWatchTime = watchMins;
      } else {
        updatePayload.monthlyPoints = increment(points);
        updatePayload.monthlyWatchTime = increment(watchMins);
      }

      await updateDoc(userDocRef, updatePayload);

      // 2. Add transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'earn',
        amount: points,
        note: `Mission Accomplished: ${videoId}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      
      showToast(`Correct! +${points} Points & +${coins} Coins added! ${extraLifeEarned ? 'You earned an Extra Life! 💖' : ''}`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      showToast('Failed to claim reward.', 'error');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (!currentUser || isProcessingRef.current) return;
    
    const spendableCoins = user.coins || 0;
    if (spendableCoins < reward.cost) {
      showToast("Insufficient Coins. Keep watching drops to earn more!", 'error');
      return;
    }

    isProcessingRef.current = true;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // 1. Create redemption record (Deduction now happens at admin approval)
      await addDoc(collection(db, 'redemptions'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        displayName: user.displayName,
        rewardName: reward.title,
        cost: reward.cost,
        status: 'Pending',
        createdAt: serverTimestamp()
      });

      // 3. Add transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'spend',
        amount: reward.cost,
        note: `Redeemed: ${reward.title}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      showToast("Reward Claimed! The admin has been notified.", 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'redemptions');
      showToast("Failed to redeem reward.", 'error');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const copyReferral = () => {
    if (!currentUser) return;
    // Use the Netlify domain as requested by the user for the working link
    const refLink = `https://viewvibeus.netlify.app/?ref=${currentUser.uid}`;
    navigator.clipboard.writeText(refLink);
    showToast('Referral link copied!', 'success');
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#05050a] flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-5xl font-black tracking-tighter mb-8"
        >
          <span className="text-white">View</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-purple-500">Vibe</span>
        </motion.div>
        <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div 
            animate={{ left: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-orange-500 to-transparent"
          />
        </div>
        <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Syncing with Grid...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500/30">
      {activeTab === ('guest' as any) ? (
        <GuestView showToast={showToast} />
      ) : (
        <OnboardingGate user={currentUser} userData={user}>
          <div className="min-h-screen flex flex-col md:flex-row relative">
          {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' 
                ? 'bg-emerald-500/90 text-white border-emerald-400' 
                : 'bg-rose-500/90 text-white border-rose-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 glass-card rounded-none border-x-0 border-t-0 z-50">
        <div className="text-2xl font-black tracking-tighter">
          <span className="text-white">View</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-purple-500">Vibe</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isMobileMenuOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed md:sticky top-0 left-0 h-screen w-72 glass-card rounded-none border-y-0 border-l-0 flex flex-col z-40 ${isMobileMenuOpen ? 'block' : 'hidden md:flex'}`}
          >
            <div className="p-8 hidden md:block">
              <div className="text-3xl font-black tracking-tighter">
                <span className="text-white">View</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-purple-500">Vibe</span>
              </div>
            </div>

            <nav className="flex-1 mt-4">
              <SidebarLink 
                icon={Play} 
                label="Mission Board" 
                active={activeTab === 'missionBoard'} 
                onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={Trophy} 
                label="Leaderboards" 
                active={activeTab === 'leaderboard'} 
                onClick={() => { navigate('/leaderboards'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={Wallet} 
                label="Wallet" 
                active={activeTab === 'wallet'} 
                onClick={() => { navigate('/wallet'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={Users} 
                label="Referrals" 
                active={activeTab === 'referrals'} 
                onClick={() => { navigate('/referrals'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={History} 
                label="History" 
                active={activeTab === 'history'} 
                onClick={() => { navigate('/history'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={SettingsIcon} 
                label="Settings" 
                active={activeTab === 'settings'} 
                onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={User} 
                label="Profile" 
                active={activeTab === 'profile'} 
                onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }} 
              />
              {currentUser?.email === ADMIN_EMAIL && (
                <SidebarLink 
                  icon={Lock} 
                  label="Admin Panel" 
                  active={activeTab === 'admin'} 
                  onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }} 
                />
              )}
            </nav>

            <div className="p-6">
              {currentUser ? (
                <div className="glass-card p-5 bg-gradient-to-br from-white/10 via-white/5 to-transparent border-white/20 relative overflow-hidden group cursor-default">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-orange-500/30 transition-all duration-700" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl -ml-8 -mb-8 group-hover:bg-purple-500/20 transition-all duration-700" />
                  
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Verified Account</p>
                        {currentUser?.email === ADMIN_EMAIL && (
                          <span className="px-1.5 py-0.5 bg-orange-500 text-[8px] font-black text-white rounded-sm uppercase tracking-tighter">Admin</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white truncate max-w-[140px]">
                        {user.displayName === 'Guest User' ? 'Loading Profile...' : user.displayName}
                      </p>
                    </div>
                    <button 
                      onClick={handleSignOut} 
                      className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                      title="Sign Out"
                    >
                      <LogOut size={14} />
                    </button>
                  </div>

                  <div className="mt-4 relative z-10 space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-white tracking-tighter neon-glow-orange">
                          {user.wallet.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Points</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-white tracking-tighter">
                          {formatWatchTime(user.verifiedWatchTime || 0)}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Watch Time</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span>Daily Goal</span>
                        <span>65%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '65%' }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-purple-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleSignIn}
                  className="w-full glass-card p-4 flex items-center justify-center gap-3 hover:bg-white/10 transition-all duration-300 group border-orange-500/30"
                >
                  <LogIn size={20} className="text-orange-500 group-hover:scale-110 transition-transform" />
                  <span className="font-black uppercase tracking-widest text-xs">Sign In</span>
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 z-10 overflow-y-auto max-h-screen">
        <AnimatePresence mode="wait">
          {activeTab === 'missionBoard' && (
            <motion.div
              key="missionBoard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <MissionBoard 
                user={user} 
                currentUser={currentUser} 
                onRewardClaimed={handleRewardClaimed} 
                recentPayouts={recentPayouts}
                showToast={showToast}
                setActiveTab={setActiveTab}
              />
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black uppercase tracking-tighter">Hall of Fame</h2>
                <p className="text-slate-400 max-w-xl mx-auto">
                  The elite watchers of ViewVibe. Climb the ranks by completing drops and building your empire.
                </p>
              </div>

              {/* Category Toggles */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="flex bg-[#1A1A1D] p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setLeaderboardCategory('earners')}
                      className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                        leaderboardCategory === 'earners' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      Top Earners
                    </button>
                    <button
                      onClick={() => setLeaderboardCategory('watchers')}
                      className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                        leaderboardCategory === 'watchers' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      Top Watchers
                    </button>
                  </div>
                </div>

                {/* Timeframe Tabs */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {['daily', 'weekly', 'monthly', 'overall'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t as any)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                        timeframe === t 
                          ? 'bg-white/10 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                          : 'bg-transparent border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hype Engine - Dynamic Motivation */}
              <div className="glass-card p-8 bg-gradient-to-r from-orange-600/20 to-purple-600/20 border-orange-500/30">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/40">
                      <Trophy className="text-white" size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">Hype Engine</h3>
                      <p className="text-orange-400 font-bold text-sm uppercase tracking-widest">
                        {userRank === 1 ? "🏆 YOU ARE THE CHAMPION!" : 
                         userRank && userRank <= 10 ? "🔥 YOU'RE IN THE ELITE TOP 10!" : 
                         "🚀 CLIMBING THE RANKS"}
                      </p>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status Report</p>
                    <p className="text-lg font-black text-white italic">
                      {userRank === 1 ? "Defend your throne, legend." : 
                       topUsers.length > 0 && userRank ? (
                         userRank <= 10 ? (
                           `Only ${((topUsers[userRank - 2]?.displayValue || 0) - (
                             leaderboardCategory === 'earners' ? (
                               timeframe === 'daily' ? (user.dailyPoints || 0) :
                               timeframe === 'weekly' ? (user.weeklyPoints || 0) :
                               timeframe === 'monthly' ? (user.monthlyPoints || 0) :
                               (user.lifetimePoints || user.wallet || 0)
                             ) : (
                               timeframe === 'daily' ? (user.dailyWatchTime || 0) :
                               timeframe === 'weekly' ? (user.weeklyWatchTime || 0) :
                               timeframe === 'monthly' ? (user.monthlyWatchTime || 0) :
                               (user.verifiedWatchTime || 0)
                             )
                           )).toLocaleString()} ${leaderboardCategory === 'earners' ? 'pts' : 'mins'} to Rank #${userRank - 1}`
                         ) : (
                           `Need ${((topUsers[9]?.displayValue || 0) - (
                             leaderboardCategory === 'earners' ? (
                               timeframe === 'daily' ? (user.dailyPoints || 0) :
                               timeframe === 'weekly' ? (user.weeklyPoints || 0) :
                               timeframe === 'monthly' ? (user.monthlyPoints || 0) :
                               (user.lifetimePoints || user.wallet || 0)
                             ) : (
                               timeframe === 'daily' ? (user.dailyWatchTime || 0) :
                               timeframe === 'weekly' ? (user.weeklyWatchTime || 0) :
                               timeframe === 'monthly' ? (user.monthlyWatchTime || 0) :
                               (user.verifiedWatchTime || 0)
                             )
                           )).toLocaleString()} ${leaderboardCategory === 'earners' ? 'pts' : 'mins'} to enter Top 10`
                         )
                       ) : "Loading your destiny..."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Leaderboard List */}
              <Leaderboards 
                topUsers={topUsers}
                currentUser={currentUser}
                userRank={userRank}
                leaderboardCategory={leaderboardCategory}
                timeframe={timeframe}
                user={user}
              />
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-12"
            >
              {/* Hero Balance */}
              <div className="text-center py-12 relative overflow-hidden glass-card border-none bg-transparent">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] -z-10" 
                />
                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-4">Current Coins Balance</p>
                <h2 className="text-8xl font-black text-white tracking-tighter neon-glow-orange">
                  {(user.coins || 0).toLocaleString()}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-orange-500" />
                  <span className="text-orange-500 font-black tracking-widest uppercase text-sm">Spendable Coins</span>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-orange-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Rewards Rack */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className="text-purple-500" />
                    <h3 className="text-2xl font-black uppercase tracking-tight">Rewards Rack</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {isRewardsLoading ? (
                      <div className="col-span-full py-12 flex justify-center">
                        <RefreshCw className="animate-spin text-purple-500" size={32} />
                      </div>
                    ) : rewards.length === 0 ? (
                      <div className="col-span-full py-12 text-center glass-card">
                        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No rewards available right now</p>
                      </div>
                    ) : (
                      rewards.map((item) => {
                        const canAfford = (user.coins || 0) >= item.cost;
                        return (
                          <div key={item.id} className="glass-card p-6 flex flex-col group hover:border-purple-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 group-hover:scale-110 transition-transform">
                                <Gift size={24} />
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-black">{item.cost.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Coins</p>
                              </div>
                            </div>
                            <h4 className="text-lg font-black mb-2">{item.title}</h4>
                            <p className="text-sm text-slate-400 mb-6 flex-1">Redeem your points for this exclusive reward.</p>
                            <button
                              disabled={!canAfford}
                              onClick={() => handleRedeem(item)}
                              className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 ${
                                canAfford 
                                  ? 'bg-gradient-to-r from-orange-500 to-purple-500 text-white hover:scale-105 shadow-lg shadow-purple-500/20' 
                                  : 'bg-white/5 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              {canAfford ? 'Redeem Now' : 'Insufficient Funds'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black uppercase tracking-tighter">Transaction History</h2>
                <p className="text-slate-400 max-w-xl mx-auto">
                  A complete record of your earnings and redemptions on the platform.
                </p>
              </div>

              <div className="glass-card p-6 space-y-4">
                {history.map((tx) => (
                  <div key={tx.id} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${tx.type === 'earn' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {tx.type === 'earn' ? <Trophy size={24} /> : <ShoppingBag size={24} />}
                      </div>
                      <div>
                        <p className="font-black text-lg uppercase tracking-tight">{tx.note}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${tx.type === 'earn' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.type === 'earn' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Points/Coins</p>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="text-center py-20 text-slate-600">
                    <History size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-sm">No transactions recorded yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black uppercase tracking-tighter">Settings</h2>
                <p className="text-slate-400">
                  Manage your profile and account preferences.
                </p>
              </div>

              <div className="glass-card p-8 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Users className="text-orange-500" size={20} />
                    Profile Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Display Name</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={user.displayName}
                          onChange={async (e) => {
                            if (!currentUser) return;
                            const newName = e.target.value;
                            // Update locally for immediate feedback
                            // In a real app, we'd debounce the Firestore update
                            try {
                              await updateDoc(doc(db, 'users', currentUser.uid), {
                                displayName: newName
                              });
                            } catch (err) {
                              console.error("Failed to update name:", err);
                            }
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all font-bold"
                          placeholder="Your Name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                      <input 
                        type="email" 
                        value={user.email}
                        disabled
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-slate-500 outline-none font-bold cursor-not-allowed"
                      />
                      <p className="mt-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Email cannot be changed</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-rose-500">
                    <AlertTriangle size={20} />
                    Danger Zone
                  </h3>
                  <button 
                    onClick={handleSignOut}
                    className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-black uppercase tracking-widest text-xs rounded-xl border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    Sign Out of Account
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Profile 
                user={user} 
                currentUser={currentUser} 
                showToast={showToast} 
              />
            </motion.div>
          )}

          {activeTab === 'referrals' && (
            <motion.div
              key="referrals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black uppercase tracking-tighter">Build the Community</h2>
                <p className="text-slate-400 max-w-xl mx-auto">
                  Invite your friends to ViewVibe and earn massive point bonuses. 
                  The more they watch, the more you climb the leaderboard.
                </p>
              </div>

              <div className="glass-card p-8 bg-gradient-to-br from-orange-500/5 to-purple-500/5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Your Unique Referral Link</p>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 glass-card bg-black/40 border-white/10 p-4 flex items-center justify-between">
                    <code className="text-orange-400 font-mono truncate mr-4">
                      {currentUser ? `viewvibeus.netlify.app/?ref=${currentUser.uid}` : 'Sign in to get your link'}
                    </code>
                    <button 
                      onClick={copyReferral} 
                      disabled={!currentUser}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white disabled:opacity-50"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={copyReferral}
                    disabled={!currentUser}
                    className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Copy size={18} />
                    Copy Link
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { step: '01', title: 'Share Link', desc: 'Send your referral link to friends or share on socials.' },
                  { step: '02', title: 'They Join', desc: 'Friends sign up and complete their first Daily Drop.' },
                  { step: '03', title: 'Earn Points', desc: 'Instantly receive 500 points per verified referral.' }
                ].map((item) => (
                  <div key={item.step} className="glass-card p-8 relative group overflow-hidden">
                    <div className="absolute -top-4 -right-4 text-6xl font-black text-white/5 group-hover:text-orange-500/10 transition-colors">{item.step}</div>
                    <h4 className="text-xl font-black mb-2 uppercase tracking-tight">{item.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="glass-card p-10 flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-r from-purple-600/20 to-orange-600/20 border-white/20">
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Referral Stats</h3>
                  <p className="text-slate-400 text-sm">You've invited {user.referrals} legends to the platform.</p>
                </div>
                <div className="flex gap-12">
                  <div className="text-center">
                    <p className="text-4xl font-black text-white">{user.referrals}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invites</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-black text-orange-500">{(user.referrals * 500).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Earned</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <AdminDashboard 
              currentUser={currentUser} 
            />
          )}
        </AnimatePresence>
      </main>
        </div>
        </OnboardingGate>
      )}
    </div>
  );
}
