import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Users, Gift, Share2, CheckCircle2, History, Coins, Trophy } from 'lucide-react';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { UserData, ReferralConfig } from '../types';
import toast from 'react-hot-toast';

interface ReferralDashboardProps {
  currentUser: FirebaseUser | null;
}

const ReferralDashboard: React.FC<ReferralDashboardProps> = ({ currentUser }) => {
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [referredUsers, setReferredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<ReferralConfig | null>(null);

  const referralLink = currentUser 
    ? `${window.location.origin}/?ref=${currentUser.uid}`
    : 'Sign in to generate your link';

  useEffect(() => {
    // Fetch Referral Config
    const configRef = doc(db, 'config', 'referral');
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as ReferralConfig);
      } else {
        // Default values if not set
        setConfig({
          referrerCoins: 500,
          referrerPoints: 100,
          refereeCoins: 250,
          refereePoints: 50,
          isActive: true
        });
      }
    });

    const fetchReferralStats = async () => {
      if (!currentUser) return;
      
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referredBy', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        setTotalReferrals(querySnapshot.size);
        
        const usersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as UserData));
        setReferredUsers(usersList);
      } catch (error) {
        console.error("Error fetching referral stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferralStats();
    return () => unsubConfig();
  }, [currentUser]);

  const copyToClipboard = async () => {
    if (!currentUser) {
      toast.error("Please sign in to copy your referral link");
      return;
    }
    
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full border border-orange-500/20 mb-2"
        >
          <Gift className="text-orange-500" size={16} />
          <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Viral Growth Engine</span>
        </motion.div>
        <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">
          Invite Friends, <br />
          <span className="text-orange-500">Earn Massive Rewards!</span>
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto font-medium">
          Share the ViewVibe experience. When your friends join and start watching, 
          both of you unlock premium bonuses and climb the global leaderboards.
        </p>
        {!config?.isActive && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 max-w-xl mx-auto">
            <p className="text-red-500 text-xs font-black uppercase tracking-widest">
              The referral program is currently paused. You can still share your link, but rewards are temporarily disabled.
            </p>
          </div>
        )}
      </div>

      {/* Stats & Link Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral Link Card */}
        <div className="lg:col-span-2 glass-card p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Share2 size={120} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-1">Your Unique Invite Link</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Share this link to track your referrals</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm text-orange-400 focus:outline-none focus:border-orange-500/50 transition-colors pr-12"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                  <Copy size={16} />
                </div>
              </div>
              <button
                onClick={copyToClipboard}
                disabled={!currentUser}
                className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Copy size={18} />
                Copy Link
              </button>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Instant Tracking</span>
              </div>
              <div className="flex items-center gap-2 text-blue-500">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Verified Payouts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center border-orange-500/20 bg-orange-500/5 relative overflow-hidden group">
          <div className="absolute -bottom-4 -right-4 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Users size={100} className="text-orange-500" />
          </div>
          
          <div className="relative z-10 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Successful Invites</p>
            <div className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              {isLoading ? '...' : totalReferrals}
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30">
              <Users size={12} className="text-orange-500" />
              <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Active Crew</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Details */}
      <div className="glass-card p-8 bg-gradient-to-r from-orange-500/10 to-purple-500/10 border-white/10 text-center">
        <h3 className="text-xl font-black uppercase tracking-tight mb-2">The Referral Bonus</h3>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mb-6">
          For every friend who joins using your link and watches their first video, you'll receive <span className="text-white font-bold">{config?.referrerCoins || 500} Coins</span>, <span className="text-white font-bold">{config?.referrerPoints || 100} Points</span> and <span className="text-white font-bold">1 Extra Life</span>. There's no limit to how many friends you can invite!
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="px-6 py-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-500">
              <Coins size={20} />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">You Get</p>
              <p className="text-sm font-black text-white">{config?.referrerCoins || 500} Coins + {config?.referrerPoints || 100} Pts</p>
            </div>
          </div>
          <div className="px-6 py-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-500">
              <Trophy size={20} />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">They Get</p>
              <p className="text-sm font-black text-white">{config?.refereeCoins || 250} Coins + {config?.refereePoints || 50} Pts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="glass-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <History className="text-orange-500" />
          <h3 className="text-2xl font-black uppercase tracking-tight">Referral History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Joined Date</th>
                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Reward</th>
              </tr>
            </thead>
            <tbody>
              {referredUsers.map((u, i) => (
                <tr key={i} className="border-b border-white/5 group hover:bg-white/5 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-black text-xs">
                        {u.displayName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{u.displayName}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{u.email.split('@')[0]}***</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-xs font-bold text-slate-400">
                    {u.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                  </td>
                  <td className="py-4">
                    {(!u.claimedVideos || u.claimedVideos.length === 0) ? (
                      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-yellow-500/20">
                        Pending
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-emerald-500/20">
                        Successful
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {(!u.claimedVideos || u.claimedVideos.length === 0) ? (
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Awaiting Watch...</p>
                    ) : (
                      <>
                        <p className="text-sm font-black text-emerald-500">+{config?.referrerCoins || 500} Coins</p>
                        <p className="text-[10px] font-bold text-emerald-500/70">+{config?.referrerPoints || 100} Pts</p>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {referredUsers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-600">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase tracking-widest text-xs">No referrals yet. Start sharing!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
