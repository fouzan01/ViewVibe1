import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Minus,
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Save,
  Activity,
  Users,
  Gift,
  Coins,
  Trophy,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  increment, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  deleteDoc, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase';
import { 
  Video, 
  PayoutRequest, 
  Reward, 
  UserData, 
  ReferralConfig, 
  OperationType 
} from '../types';
import { ADMIN_EMAIL, COLORS } from '../constants';
import { handleFirestoreError } from '../utils/firestore';
import AdminPromoManager from './AdminPromoManager';
import AdminSettings from './AdminSettings';

interface AdminDashboardProps {
  currentUser: FirebaseUser | null;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const AdminDashboard = ({ 
  currentUser,
  showToast,
}: AdminDashboardProps) => {
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
  const [redemptions, setRedemptions] = useState<PayoutRequest[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedemptionsLoading, setIsRedemptionsLoading] = useState(true);
  const [isRewardsLoading, setIsRewardsLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userAdjustments, setUserAdjustments] = useState<Record<string, string>>({});
  const [adminTab, setAdminTab] = useState<'missions' | 'store' | 'users' | 'settings'>('missions');
  const usersPerPage = 10;

  // Referral Config State
  const [refConfig, setRefConfig] = useState<ReferralConfig>({
    referrerCoins: 500,
    referrerPoints: 100,
    refereeCoins: 250,
    refereePoints: 50,
    isActive: true
  });
  const [isSavingRef, setIsSavingRef] = useState(false);

  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    const configRef = doc(db, 'config', 'referral');
    const unsub = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setRefConfig(docSnap.data() as ReferralConfig);
      }
    });
    return () => unsub();
  }, [isAdmin]);

  const handleUpdateReferralConfig = async () => {
    if (!isAdmin || isSavingRef) return;
    setIsSavingRef(true);
    try {
      await setDoc(doc(db, 'config', 'referral'), {
        ...refConfig,
        updatedAt: serverTimestamp()
      });
      showToast("Referral configuration updated!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/referral');
      showToast("Failed to update referral config", "error");
    } finally {
      setIsSavingRef(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    // Listen to videos
    const vQuery = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubVideos = onSnapshot(vQuery, (snap) => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Video)));
      setIsLoading(false);
    });

    // Listen to redemptions
    const rQuery = query(collection(db, 'payoutRequests'));
    const unsubRedemptions = onSnapshot(rQuery, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PayoutRequest))
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime() || 0;
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime() || 0;
          return timeB - timeA;
        });
      setRedemptions(list);
      setIsRedemptionsLoading(false);
    });

    // Listen to rewards
    const rwQuery = query(collection(db, 'rewards'), orderBy('createdAt', 'desc'));
    const unsubRewards = onSnapshot(rwQuery, (snap) => {
      setRewards(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reward)));
      setIsRewardsLoading(false);
    });

    // Listen to users
    const uQuery = query(collection(db, 'users'), orderBy('wallet', 'desc'));
    const unsubUsers = onSnapshot(uQuery, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData)));
      setIsUsersLoading(false);
    });

    return () => {
      unsubVideos();
      unsubRedemptions();
      unsubRewards();
      unsubUsers();
    };
  }, [isAdmin]);

  const handlePublish = async () => {
    if (!videoId || !isAdmin) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'videos'), {
        youtubeVideoId: videoId,
        correctColor: color,
        userPoints: parseInt(userPoints),
        userCoins: parseInt(userCoins),
        guestPoints: parseInt(guestPoints),
        guestCoins: parseInt(guestCoins),
        isActive: true,
        createdAt: serverTimestamp()
      });
      setVideoId('');
      setStatus('success');
      showToast('Mission published successfully!', 'success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'videos');
      setStatus('error');
      showToast('Failed to publish mission.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddReward = async () => {
    if (!rewardTitle || !rewardCost || !isAdmin) return;
    try {
      await addDoc(collection(db, 'rewards'), {
        title: rewardTitle,
        cost: parseInt(rewardCost),
        isActive: true,
        createdAt: serverTimestamp()
      });
      setRewardTitle('');
      setRewardCost('');
      showToast('Reward added to store!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rewards');
      showToast('Failed to add reward.', 'error');
    }
  };

  const toggleVideoStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'videos', id), { isActive: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `videos/${id}`);
    }
  };

  const deleteVideo = async (id: string) => {
    if (!window.confirm('Delete this mission?')) return;
    try {
      await deleteDoc(doc(db, 'videos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${id}`);
    }
  };

  const toggleRewardStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'rewards', id), { isActive: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rewards/${id}`);
    }
  };

  const deleteReward = async (id: string) => {
    if (!window.confirm('Delete this reward?')) return;
    try {
      await deleteDoc(doc(db, 'rewards', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rewards/${id}`);
    }
  };

  const completePayout = async (payout: PayoutRequest) => {
    try {
      // 1. Update the request status
      await updateDoc(doc(db, 'payoutRequests', payout.id!), {
        status: 'completed',
        completedAt: serverTimestamp()
      });

      // 2. Deduct coins from user (if not already deducted at request time)
      // Note: In a production app, coins should be deducted when the request is MADE
      // and held in escrow. For this refactor, we assume they are deducted now.
      await updateDoc(doc(db, 'users', payout.uid), {
        coins: increment(-payout.cost)
      });

      // 3. Add transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: payout.uid,
        type: 'spend',
        amount: payout.cost,
        note: `Redeemed: ${payout.rewardTitle}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      showToast('Payout marked as completed!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payoutRequests/${payout.id}`);
      showToast('Failed to complete payout.', 'error');
    }
  };

  const seedSampleData = async () => {
    if (!isAdmin) return;
    const samples = [
      { youtubeVideoId: 'dQw4w9WgXcQ', correctColor: 'Neon Green', userPoints: 50, userCoins: 10, guestPoints: 10, guestCoins: 2 },
      { youtubeVideoId: '9bZkp7q19f0', correctColor: 'Blue Water', userPoints: 75, userCoins: 15, guestPoints: 15, guestCoins: 3 },
      { youtubeVideoId: 'jNQXAC9IVRw', correctColor: 'Red Fire', userPoints: 100, userCoins: 20, guestPoints: 20, guestCoins: 4 },
    ];

    for (const s of samples) {
      await addDoc(collection(db, 'videos'), { ...s, isActive: true, createdAt: serverTimestamp() });
    }
    showToast('Sample missions seeded!', 'success');
  };

  const seedSamplePayouts = async () => {
    if (!isAdmin) return;
    const samples = [
      { uid: 'sample1', userEmail: 'user1@example.com', displayName: 'John Doe', rewardId: 'upi50', rewardTitle: '₹50 UPI Cash', cost: 5000, status: 'pending' },
      { uid: 'sample2', userEmail: 'user2@example.com', displayName: 'Jane Smith', rewardId: 'upi100', rewardTitle: '₹100 UPI Cash', cost: 10000, status: 'pending' },
    ];

    for (const s of samples) {
      await addDoc(collection(db, 'payoutRequests'), { ...s, createdAt: serverTimestamp() });
    }
    showToast('Sample payouts seeded!', 'success');
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-12 text-center space-y-6 border-rose-500/30">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="text-rose-500" size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Access Denied</h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              This area is restricted to system administrators only.
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-orange-500 hover:text-white transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-20"
    >
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 glass-card p-8 border-orange-500/20">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/40">
            <Activity className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Command Center</h2>
            <p className="text-orange-500 font-bold text-xs uppercase tracking-[0.2em]">System Administrator</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: 'missions', label: 'Missions', icon: Activity },
            { id: 'store', label: 'Store', icon: Gift },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'settings', label: 'Settings', icon: Save }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                adminTab === tab.id 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                  : 'glass-card hover:bg-white/10 text-slate-400'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {adminTab === 'missions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Publish Mission */}
          <div className="glass-card p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Plus className="text-orange-500" />
                Publish Mission
              </h3>
              <button 
                onClick={seedSampleData}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-500 transition-colors"
              >
                Seed Samples
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">YouTube Video ID</label>
                  <input 
                    type="text" 
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all font-bold"
                    placeholder="e.g. dQw4w9WgXcQ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">User Reward (Pts/Coins)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={userPoints}
                        onChange={(e) => setUserPoints(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all font-bold"
                        placeholder="Pts"
                      />
                      <input 
                        type="number" 
                        value={userCoins}
                        onChange={(e) => setUserCoins(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all font-bold"
                        placeholder="Coins"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Guest Reward (Pts/Coins)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={guestPoints}
                        onChange={(e) => setGuestPoints(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all font-bold"
                        placeholder="Pts"
                      />
                      <input 
                        type="number" 
                        value={guestCoins}
                        onChange={(e) => setGuestCoins(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all font-bold"
                        placeholder="Coins"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Verification Color</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setColor(c.name)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          color === c.name 
                            ? 'bg-white/10 border-orange-500' 
                            : 'bg-transparent border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${c.color}`} />
                        <span className="text-xs font-bold">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handlePublish}
                disabled={isSaving || !videoId}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                Publish Mission Drop
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
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={16} className="text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate uppercase tracking-tight">ID: {v.youtubeVideoId}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${COLORS.find(c => c.name === v.correctColor)?.color || 'bg-slate-500'}`} />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{v.correctColor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleVideoStatus(v.id!, v.isActive)}
                        className={`p-2 rounded-lg transition-colors ${v.isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/10'}`}
                      >
                        {v.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button 
                        onClick={() => deleteVideo(v.id!)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
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
      )}

      {adminTab === 'store' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Reward */}
          <div className="glass-card p-8 space-y-8">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Plus className="text-purple-500" />
              Add Store Reward
            </h3>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Reward Title</label>
                  <input 
                    type="text" 
                    value={rewardTitle}
                    onChange={(e) => setRewardTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all font-bold"
                    placeholder="e.g. ₹50 UPI Cash"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cost (Coins)</label>
                  <input 
                    type="number" 
                    value={rewardCost}
                    onChange={(e) => setRewardCost(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all font-bold"
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>

              <button 
                onClick={handleAddReward}
                disabled={!rewardTitle || !rewardCost}
                className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus size={18} />
                Add to Store
              </button>
            </div>
          </div>

          {/* Store Inventory */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 px-2">Store Inventory</h3>
            <div className="space-y-4">
              {isRewardsLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="animate-spin text-purple-500" size={32} />
                </div>
              ) : rewards.length === 0 ? (
                <div className="glass-card p-12 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                  Store is empty
                </div>
              ) : (
                rewards.map((r) => (
                  <div key={r.id} className={`glass-card p-4 flex items-center gap-4 border-l-4 ${r.isActive ? 'border-purple-500' : 'border-slate-700 opacity-60'}`}>
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                      <Gift size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate uppercase tracking-tight">{r.title}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{r.cost.toLocaleString()} Coins</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleRewardStatus(r.id!, r.isActive)}
                        className={`p-2 rounded-lg transition-colors ${r.isActive ? 'text-purple-500 hover:bg-purple-500/10' : 'text-slate-500 hover:bg-white/10'}`}
                      >
                        {r.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button 
                        onClick={() => deleteReward(r.id!)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payout Requests */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Pending Payout Requests</h3>
              <button 
                onClick={seedSamplePayouts}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-500 transition-colors"
              >
                Seed Samples
              </button>
            </div>
            
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reward</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cost</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isRedemptionsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <RefreshCw className="animate-spin text-orange-500 mx-auto" size={24} />
                        </td>
                      </tr>
                    ) : redemptions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                          No payout requests found
                        </td>
                      </tr>
                    ) : (
                      redemptions.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-black text-xs uppercase">{p.displayName}</p>
                            <p className="text-[10px] text-slate-500">{p.userEmail}</p>
                          </td>
                          <td className="px-6 py-4 font-bold text-xs uppercase">{p.rewardTitle}</td>
                          <td className="px-6 py-4 font-black text-xs text-orange-500">{p.cost.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              p.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : 
                              p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 
                              'bg-rose-500/20 text-rose-500'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {p.status === 'pending' && (
                              <button 
                                onClick={() => completePayout(p)}
                                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Mark as Completed"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {adminTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">User Management ({users.length})</h3>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="SEARCH USERS..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[10px] text-white focus:border-orange-500 outline-none transition-all font-black"
              />
            </div>
          </div>

          {isUsersLoading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="animate-spin text-orange-500" size={40} />
            </div>
          ) : (
            <>
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Wallet (Pts)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Coins</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Watch Time</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-black text-[10px]">
                                {u.displayName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-xs uppercase">{u.displayName}</p>
                                <p className="text-[10px] text-slate-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-black text-xs">{u.wallet.toLocaleString()}</td>
                          <td className="px-6 py-4 font-black text-xs text-orange-500">{u.coins?.toLocaleString() || 0}</td>
                          <td className="px-6 py-4 font-bold text-xs">{u.verifiedWatchTime}m</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={userAdjustments[u.id!] || ''}
                                onChange={(e) => setUserAdjustments(prev => ({...prev, [u.id!]: e.target.value}))}
                                placeholder="0"
                                className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-orange-500 outline-none transition-all font-black"
                              />
                              <button 
                                onClick={async () => {
                                  const amount = parseInt(userAdjustments[u.id!] || '0');
                                  if (amount > 0) {
                                    try {
                                      await updateDoc(doc(db, 'users', u.id!), {
                                        coins: increment(amount)
                                      });
                                      showToast(`Added ${amount} coins to ${u.displayName}`, 'success');
                                      setUserAdjustments(prev => ({...prev, [u.id!]: ''}));
                                    } catch (err) {
                                      showToast('Failed to update coins', 'error');
                                    }
                                  }
                                }}
                                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Add Coins"
                              >
                                <Plus size={14} />
                              </button>
                              <button 
                                onClick={async () => {
                                  const amount = parseInt(userAdjustments[u.id!] || '0');
                                  if (amount > 0) {
                                    try {
                                      await updateDoc(doc(db, 'users', u.id!), {
                                        coins: increment(-amount)
                                      });
                                      showToast(`Deducted ${amount} coins from ${u.displayName}`, 'success');
                                      setUserAdjustments(prev => ({...prev, [u.id!]: ''}));
                                    } catch (err) {
                                      showToast('Failed to update coins', 'error');
                                    }
                                  }
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Deduct Coins"
                              >
                                <Minus size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Showing {(userPage - 1) * usersPerPage + 1} - {Math.min(userPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} Users
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
                      {[...Array(Math.min(5, totalPages))].map((_, i) => (
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
      )}

      {adminTab === 'settings' && (
        <div className="space-y-8">
          {/* Referral Configuration */}
          <div className="glass-card p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Users className="text-orange-500" />
                Referral Program Configuration
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRefConfig({...refConfig, isActive: !refConfig.isActive})}
                  className={`w-12 h-6 rounded-full transition-all relative ${refConfig.isActive ? 'bg-orange-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${refConfig.isActive ? 'left-7' : 'left-1'}`} />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {refConfig.isActive ? 'Program Active' : 'Program Paused'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-orange-500">Referrer Rewards</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Coins per Referral</label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        type="number" 
                        value={refConfig.referrerCoins}
                        onChange={(e) => setRefConfig({...refConfig, referrerCoins: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-orange-500 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Points per Referral</label>
                    <div className="relative">
                      <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        type="number" 
                        value={refConfig.referrerPoints}
                        onChange={(e) => setRefConfig({...refConfig, referrerPoints: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-orange-500 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-purple-500">Referee Rewards</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Welcome Coins</label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        type="number" 
                        value={refConfig.refereeCoins}
                        onChange={(e) => setRefConfig({...refConfig, refereeCoins: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-purple-500 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Welcome Points</label>
                    <div className="relative">
                      <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        type="number" 
                        value={refConfig.refereePoints}
                        onChange={(e) => setRefConfig({...refConfig, refereePoints: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-purple-500 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleUpdateReferralConfig}
              disabled={isSavingRef}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingRef ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              Save Configuration
            </button>
          </div>

          {/* Promo Code Management */}
          <AdminPromoManager showToast={showToast} />

          {/* Global Settings */}
          <AdminSettings />
        </div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;
