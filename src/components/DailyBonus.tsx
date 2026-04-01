import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Lock, 
  Gift, 
  Coins,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { UserData } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface DailyBonusProps {
  user: UserData;
  currentUser: FirebaseUser | null;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const STREAK_REWARDS = [2, 5, 10, 15, 20, 25, 50]; // Coins per day

const DailyBonus: React.FC<DailyBonusProps> = ({ user, currentUser, showToast }) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [nextStreak, setNextStreak] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Helper functions for date checks
  const getStartOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const isToday = (timestamp: number) => {
    const today = getStartOfDay(new Date());
    const claimDate = getStartOfDay(new Date(timestamp));
    return today === claimDate;
  };

  const isYesterday = (timestamp: number) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = getStartOfDay(yesterday);
    const claimDate = getStartOfDay(new Date(timestamp));
    return yesterdayStart === claimDate;
  };

  useEffect(() => {
    if (!user) return;

    const lastClaimedDate = (user as any).lastClaimedDate || 0;
    const currentStreak = (user as any).currentStreak || 0;

    let claimable = false;
    let streak = 1;

    if (isToday(lastClaimedDate)) {
      claimable = false;
      streak = currentStreak;
    } else if (isYesterday(lastClaimedDate)) {
      claimable = true;
      streak = currentStreak >= 7 ? 1 : currentStreak + 1;
    } else {
      claimable = true;
      streak = 1;
    }

    setCanClaim(claimable);
    setNextStreak(streak);

    // Auto-open if can claim and hasn't auto-opened this session
    if (claimable && !hasAutoOpened) {
      setIsOpen(true);
      setHasAutoOpened(true);
    }
  }, [user, hasAutoOpened]);

  const handleClaim = async () => {
    if (!currentUser || !canClaim || isClaiming) return;

    setIsClaiming(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const reward = STREAK_REWARDS[nextStreak - 1];

      await updateDoc(userRef, {
        coins: increment(reward),
        currentStreak: nextStreak,
        lastClaimedDate: Date.now()
      });

      showToast(`Daily Bonus Claimed! +${reward} Coins (Day ${nextStreak})`, 'success');
      // Keep open for a moment to show success, then maybe close? 
      // User can close it manually.
    } catch (error) {
      console.error("Error claiming daily bonus:", error);
      showToast("Failed to claim bonus. Please try again.", 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  const currentStreak = (user as any).currentStreak || 0;
  const lastClaimedDate = (user as any).lastClaimedDate || 0;
  const claimedToday = isToday(lastClaimedDate);

  return (
    <>
      {/* Floating Icon / FAB */}
      <div className="fixed bottom-24 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className={`
            relative p-4 rounded-full shadow-2xl transition-all duration-300
            ${canClaim 
              ? 'bg-orange-500 text-white shadow-orange-500/40' 
              : 'bg-slate-800 text-slate-400 border border-white/10'
            }
          `}
        >
          <Calendar size={24} />
          {canClaim && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
          )}
          {canClaim && (
            <motion.div 
              className="absolute -top-2 -right-2"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            >
              <Sparkles size={16} className="text-yellow-400" />
            </motion.div>
          )}
        </motion.button>
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-card p-6 md:p-8 space-y-8 overflow-hidden"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-xl text-orange-500">
                      <Calendar size={24} />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white">Daily Rewards</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Claim your bonus every day to maximize your earnings
                  </p>
                </div>

                <button
                  onClick={handleClaim}
                  disabled={!canClaim || isClaiming}
                  className={`
                    relative px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300
                    flex items-center gap-3 shadow-xl
                    ${canClaim 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white hover:scale-105 shadow-orange-500/20' 
                      : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                    }
                  `}
                >
                  {isClaiming ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : claimedToday ? (
                    <>
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      Claimed Today
                    </>
                  ) : (
                    <>
                      <Gift size={18} />
                      Claim Day {nextStreak} Bonus
                    </>
                  )}
                  
                  {canClaim && (
                    <motion.div 
                      className="absolute -top-1 -right-1"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Sparkles size={16} className="text-yellow-400" />
                    </motion.div>
                  )}
                </button>
              </div>

              {/* 7-Day Timeline */}
              <div className="grid grid-cols-4 md:grid-cols-7 gap-3 md:gap-4">
                {STREAK_REWARDS.map((reward, index) => {
                  const day = index + 1;
                  const isPast = day < currentStreak || (day === currentStreak && claimedToday);
                  const isCurrent = day === nextStreak && !claimedToday;
                  const isFuture = day > nextStreak || (day === nextStreak && claimedToday);

                  return (
                    <div 
                      key={day}
                      className={`
                        relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-500
                        ${isCurrent 
                          ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]' 
                          : isPast 
                            ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' 
                            : 'bg-black/40 border-white/5 opacity-40'
                        }
                      `}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Day {day}
                      </span>
                      
                      <div className={`
                        p-3 rounded-xl transition-colors
                        ${isCurrent ? 'bg-orange-500 text-white' : isPast ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-slate-600'}
                      `}>
                        {isPast ? <CheckCircle2 size={20} /> : isFuture ? <Lock size={20} /> : <Gift size={20} />}
                      </div>

                      <div className="flex items-center gap-1">
                        <Coins size={12} className={isCurrent ? 'text-orange-500' : 'text-slate-500'} />
                        <span className={`text-xs font-black ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                          {reward}
                        </span>
                      </div>

                      {isCurrent && (
                        <motion.div 
                          layoutId="active-glow"
                          className="absolute inset-0 rounded-2xl border-2 border-orange-500/50 pointer-events-none"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {claimedToday && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60"
                >
                  Come back tomorrow for your next reward!
                </motion.p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DailyBonus;
