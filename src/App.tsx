/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect, useMemo } from 'react';
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
  History,
  Gift,
  Menu,
  X,
  LogIn,
  LogOut,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserData, Transaction, ActiveTab, LeaderboardUser, RewardItem, OperationType, FirestoreErrorInfo } from './types';
import { auth, db, googleProvider } from './firebase';
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
  updateDoc, 
  onSnapshot, 
  increment,
  getDocFromServer
} from 'firebase/firestore';

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
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) message = `Database Error: ${parsed.error}`;
      } catch (e) {}
      
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
  verifiedWatchTime: 0,
  referrals: 0,
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

export default function App() {
  return (
    <ErrorBoundary>
      <ViewVibeApp />
    </ErrorBoundary>
  );
}

function ViewVibeApp() {
  const [user, setUser] = useState<UserData>(INITIAL_USER_DATA);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [history, setHistory] = useState<Transaction[]>(INITIAL_HISTORY);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dailyDrop');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'success' | 'fail'>('idle');
  const [leaderboardType, setLeaderboardType] = useState<'watchers' | 'promoters'>('watchers');

  // --- Auth & Firestore Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);
      setIsAuthReady(true);

      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const newUserData: UserData = {
              displayName: fbUser.displayName || 'Anonymous',
              email: fbUser.email || '',
              wallet: 0,
              verifiedWatchTime: 0,
              referrals: 0,
            };
            await setDoc(userDocRef, newUserData);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
        }
      } else {
        setUser(INITIAL_USER_DATA);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser || !isAuthReady) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUser(docSnap.data() as UserData);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    });

    return () => unsubscribe();
  }, [currentUser, isAuthReady]);

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
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleVerify = async (color: string) => {
    if (!currentUser) return;
    if (verificationState !== 'idle') return;

    if (color === 'Neon Green') {
      setVerificationState('success');
      const newAmount = 50;
      const newWatchTime = 12;
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, {
          wallet: increment(newAmount),
          verifiedWatchTime: increment(newWatchTime)
        });

        const newTx: Transaction = {
          id: Date.now().toString(),
          type: 'earn',
          amount: newAmount,
          note: 'Daily Drop Verification',
          date: new Date().toISOString().split('T')[0]
        };
        setHistory(prev => [newTx, ...prev]);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    } else {
      setVerificationState('fail');
    }
  };

  const handleRedeem = (item: RewardItem) => {
    if (user.wallet < item.cost) return;

    setUser(prev => ({
      ...prev,
      wallet: prev.wallet - item.cost
    }));

    const newTx: Transaction = {
      id: Date.now().toString(),
      type: 'spend',
      amount: item.cost,
      note: `Redeemed: ${item.name}`,
      date: new Date().toISOString().split('T')[0]
    };
    setHistory(prev => [newTx, ...prev]);
  };

  const copyReferral = () => {
    navigator.clipboard.writeText('viewvibe.com/join?ref=guest99');
    // In a real app, we'd show a toast here
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
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
                label="Daily Drop" 
                active={activeTab === 'dailyDrop'} 
                onClick={() => { setActiveTab('dailyDrop'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={Trophy} 
                label="Leaderboards" 
                active={activeTab === 'leaderboard'} 
                onClick={() => { setActiveTab('leaderboard'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={Wallet} 
                label="Wallet" 
                active={activeTab === 'wallet'} 
                onClick={() => { setActiveTab('wallet'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarLink 
                icon={Users} 
                label="Referrals" 
                active={activeTab === 'referrals'} 
                onClick={() => { setActiveTab('referrals'); setIsMobileMenuOpen(false); }} 
              />
            </nav>

            <div className="p-6">
              {currentUser ? (
                <div className="glass-card p-4 bg-gradient-to-br from-white/10 to-transparent border-white/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-orange-500/20 transition-all duration-500" />
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Balance</p>
                    <button onClick={handleSignOut} className="text-slate-500 hover:text-white transition-colors">
                      <LogOut size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white neon-glow-orange">{user.wallet.toLocaleString()}</span>
                    <span className="text-xs font-bold text-orange-500">PTS</span>
                  </div>
                  <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '65%' }}
                      className="h-full bg-gradient-to-r from-orange-500 to-purple-500"
                    />
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
          {activeTab === 'dailyDrop' && (
            <motion.div
              key="dailyDrop"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column: Player */}
                <div className="flex-[1.5] space-y-6">
                  <div className="glass-card p-2 aspect-video relative group overflow-hidden">
                    <iframe
                      className="w-full h-full rounded-xl"
                      src="https://www.youtube.com/embed/jNQXAC9IVRw?autoplay=0&controls=1&rel=0"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-orange-500/20 rounded-lg text-orange-500">
                        <Play size={24} />
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-tight">Today's Mission</h2>
                    </div>
                    <p className="text-slate-400 leading-relaxed mb-6">
                      Watch the clip carefully. Find the secret color flashing on the screen to verify your view. 
                      Verification rewards are distributed instantly upon correct selection.
                    </p>
                    
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex gap-4 items-start">
                      <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-1">Anti-Cheat Active</p>
                        <p className="text-xs text-amber-200/70">
                          Fast-forwarding or playing at 2x speed will permanently lock today's reward. 
                          Our system monitors playback velocity in real-time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Verification Game */}
                <div className="flex-1 space-y-6">
                  <div className="glass-card p-8 text-center relative overflow-hidden">
                    {!currentUser && (
                      <div className="absolute inset-0 z-20 bg-[#05050a]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                        <div className="p-4 bg-orange-500/20 rounded-full text-orange-500 mb-4">
                          <Lock size={32} />
                        </div>
                        <h4 className="text-xl font-black uppercase tracking-tight mb-2">Locked</h4>
                        <p className="text-sm text-slate-400 mb-6">Please Sign In to earn points and verify your watch time.</p>
                        <button 
                          onClick={handleSignIn}
                          className="px-8 py-3 bg-orange-500 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform shadow-lg shadow-orange-500/20"
                        >
                          Connect Account
                        </button>
                      </div>
                    )}
                    <h3 className="text-xl font-black uppercase tracking-widest mb-2">Verification</h3>
                    <p className={`text-sm font-bold uppercase tracking-widest mb-8 ${
                      verificationState === 'idle' ? 'text-slate-500' : 
                      verificationState === 'success' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {verificationState === 'idle' && 'Select the Hidden Color'}
                      {verificationState === 'success' && 'Verification Successful!'}
                      {verificationState === 'fail' && 'Incorrect Selection!'}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: 'Red Fire', color: 'bg-rose-500', shadow: 'hover:shadow-rose-500/40 hover:border-rose-500/50' },
                        { name: 'Blue Water', color: 'bg-blue-500', shadow: 'hover:shadow-blue-500/40 hover:border-blue-500/50' },
                        { name: 'Neon Green', color: 'bg-emerald-500', shadow: 'hover:shadow-emerald-500/40 hover:border-emerald-500/50' },
                        { name: 'Yellow Thunder', color: 'bg-yellow-500', shadow: 'hover:shadow-yellow-500/40 hover:border-yellow-500/50' }
                      ].map((btn) => (
                        <motion.button
                          key={btn.name}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={verificationState !== 'idle'}
                          onClick={() => handleVerify(btn.name)}
                          className={`glass-card p-6 flex flex-col items-center gap-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${btn.shadow} ${
                            verificationState === 'success' && btn.name === 'Neon Green' ? 'border-emerald-500 bg-emerald-500/20 animate-pulse' : ''
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full ${btn.color} shadow-lg shadow-black/50`} />
                          <span className="text-xs font-black uppercase tracking-tighter">{btn.name}</span>
                        </motion.button>
                      ))}
                    </div>

                    {verificationState === 'success' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8 p-4 glass-card border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center gap-3"
                      >
                        <CheckCircle2 className="text-emerald-500" />
                        <span className="font-bold text-emerald-400">+50 PTS AWARDED</span>
                      </motion.div>
                    )}

                    {verificationState === 'fail' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8 p-4 glass-card border-rose-500/30 bg-rose-500/10 flex items-center justify-center gap-3"
                      >
                        <XCircle className="text-rose-500" />
                        <span className="font-bold text-rose-400">ACCESS DENIED</span>
                      </motion.div>
                    )}
                  </div>

                  <div className="glass-card p-6 bg-gradient-to-br from-purple-500/10 to-transparent">
                    <h4 className="font-black uppercase text-xs tracking-[0.2em] text-purple-400 mb-4">Stats This Session</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-2xl font-black">{user.verifiedWatchTime}m</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Watch Time</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-black">1/1</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Drops Claimed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex flex-col items-center mb-12">
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-6">Hall of Fame</h2>
                <div className="flex p-1 glass-card rounded-full bg-white/5">
                  <button
                    onClick={() => setLeaderboardType('watchers')}
                    className={`px-8 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                      leaderboardType === 'watchers' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Top Watchers
                  </button>
                  <button
                    onClick={() => setLeaderboardType('promoters')}
                    className={`px-8 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                      leaderboardType === 'promoters' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Top Promoters
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(leaderboardType === 'watchers' ? WATCHERS_LEADERBOARD : PROMOTERS_LEADERBOARD).map((item) => {
                  const isTop3 = item.rank <= 3;
                  const rankColors = [
                    'border-yellow-500/50 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.1)]',
                    'border-slate-300/50 bg-slate-300/5',
                    'border-amber-700/50 bg-amber-700/5'
                  ];

                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: item.rank * 0.1 }}
                      className={`glass-card p-4 flex items-center gap-6 group hover:bg-white/10 transition-all duration-300 ${isTop3 ? rankColors[item.rank - 1] : ''}`}
                    >
                      <div className="w-12 text-center">
                        {item.rank === 1 ? <Crown className="text-yellow-500 mx-auto" /> : 
                         <span className={`text-xl font-black ${isTop3 ? 'text-white' : 'text-slate-600'}`}>#{item.rank}</span>}
                      </div>
                      
                      <div className="relative">
                        <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full border-2 border-white/10" referrerPolicy="no-referrer" />
                        {item.rank === 1 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] font-bold text-black">1</div>}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-black text-lg group-hover:text-orange-400 transition-colors">{item.name}</h4>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Elite Member</p>
                      </div>

                      <div className="text-right">
                        <p className={`text-xl font-black ${item.rank === 1 ? 'text-yellow-500' : 'text-white'}`}>{item.value}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {leaderboardType === 'watchers' ? 'Verified Time' : 'Total Referrals'}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
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
                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-4">Current Points Balance</p>
                <h2 className="text-8xl font-black text-white tracking-tighter neon-glow-orange">
                  {user.wallet.toLocaleString()}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-orange-500" />
                  <span className="text-orange-500 font-black tracking-widest uppercase text-sm">Vibe Points</span>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-orange-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Rewards Rack */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className="text-purple-500" />
                    <h3 className="text-2xl font-black uppercase tracking-tight">Rewards Rack</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {REWARDS.map((item) => {
                      const canAfford = user.wallet >= item.cost;
                      return (
                        <div key={item.id} className="glass-card p-6 flex flex-col group hover:border-purple-500/30 transition-all duration-300">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 group-hover:scale-110 transition-transform">
                              <Gift size={24} />
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black">{item.cost.toLocaleString()}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Points</p>
                            </div>
                          </div>
                          <h4 className="text-lg font-black mb-2">{item.name}</h4>
                          <p className="text-sm text-slate-400 mb-6 flex-1">{item.description}</p>
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
                    })}
                  </div>
                </div>

                {/* Transaction History */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <History className="text-orange-500" />
                    <h3 className="text-2xl font-black uppercase tracking-tight">History</h3>
                  </div>
                  <div className="glass-card p-4 max-h-[500px] overflow-y-auto space-y-3">
                    {history.map((tx) => (
                      <div key={tx.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                        <div>
                          <p className="font-bold text-sm">{tx.note}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{tx.date}</p>
                        </div>
                        <p className={`font-black ${tx.type === 'earn' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                        </p>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <div className="text-center py-12 text-slate-600 font-bold uppercase tracking-widest text-xs">
                        No transactions yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                    <code className="text-orange-400 font-mono">viewvibe.com/join?ref=guest99</code>
                    <button onClick={copyReferral} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                      <Copy size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={copyReferral}
                    className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
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
                  { step: '03', title: 'Earn Points', desc: 'Instantly receive 100 points per verified referral.' }
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
                    <p className="text-4xl font-black text-orange-500">{(user.referrals * 100).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Earned</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
