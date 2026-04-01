import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import { 
  Play, 
  Trophy, 
  Activity, 
  Clock, 
  Share2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Heart,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, 
  getDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit,
  where
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase';
import { Video, UserData, PayoutRequest } from '../types';
import { COLORS } from '../constants';

interface MissionBoardProps {
  user: UserData;
  currentUser: FirebaseUser | null;
  onRewardClaimed: (videoId: string, points: number, coins: number, watchTime: number) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const MissionBoard = ({ 
  user, 
  currentUser, 
  onRewardClaimed,
  showToast 
}: MissionBoardProps) => {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [watchTime, setWatchTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationColor, setVerificationColor] = useState<string | null>(null);
  const [recentPayouts, setRecentPayouts] = useState<PayoutRequest[]>([]);
  const [isTabActive, setIsTabActive] = useState(true);
  const playerRef = useRef<any>(null);
  const watchTimerRef = useRef<any>(null);

  useEffect(() => {
    // Listen to active videos
    const vQuery = query(collection(db, 'videos'), where('isActive', '==', true));
    const unsubVideos = onSnapshot(vQuery, (snap) => {
      const videoList = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Video))
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime() || 0;
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime() || 0;
          return timeB - timeA;
        });
      setVideos(videoList);
      setIsLoading(false);
      
      // Auto-select first video if none selected
      if (videoList.length > 0 && !activeVideo) {
        setActiveVideo(videoList[0]);
      }
    });

    // Listen to recent payouts for hype
    const pQuery = query(collection(db, 'payoutRequests'), where('status', '==', 'completed'), limit(5));
    const unsubPayouts = onSnapshot(pQuery, (snap) => {
      const payouts = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PayoutRequest))
        .sort((a, b) => {
          const timeA = a.completedAt?.seconds ? a.completedAt.seconds * 1000 : new Date(a.completedAt).getTime() || 0;
          const timeB = b.completedAt?.seconds ? b.completedAt.seconds * 1000 : new Date(b.completedAt).getTime() || 0;
          return timeB - timeA;
        });
      setRecentPayouts(payouts);
    });

    // Anti-cheat: Tab visibility
    const handleVisibilityChange = () => {
      const active = !document.hidden;
      setIsTabActive(active);
      if (!active && isPlaying) {
        playerRef.current?.pauseVideo();
        showToast("Video paused! Stay on the tab to earn rewards.", "error");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubVideos();
      unsubPayouts();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    };
  }, [activeVideo, isPlaying, showToast]);

  useEffect(() => {
    if (isPlaying && isTabActive) {
      watchTimerRef.current = setInterval(() => {
        setWatchTime(prev => prev + 1);
      }, 1000);
    } else {
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    }
    return () => {
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    };
  }, [isPlaying, isTabActive]);

  const handleVideoStateChange = (event: any) => {
    const state = event.data;
    if (state === 1) setIsPlaying(true); // Playing
    else setIsPlaying(false); // Paused/Ended/etc
  };

  const handleVerify = (colorName: string) => {
    if (!activeVideo) return;
    
    if (colorName === activeVideo.correctColor) {
      onRewardClaimed(
        activeVideo.id!, 
        activeVideo.userPoints || 50, 
        activeVideo.userCoins || 10,
        watchTime
      );
      setVerificationColor(null);
      setIsVerifying(false);
      setWatchTime(0);
    } else {
      if (user.extraLives && user.extraLives > 0) {
        showToast("Incorrect color! Used 1 extra life.", "error");
        // Logic to deduct life would go here or in parent
      } else {
        showToast("Incorrect color! Verification failed.", "error");
        setIsVerifying(false);
      }
    }
  };

  const progress = Math.min(100, (watchTime / 60) * 100); // Assume 1 min watch requirement for now or 80% of video
  const canVerify = progress >= 80;

  return (
    <div className="space-y-8">
      {/* Active Mission Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card overflow-hidden border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.1)]">
            {activeVideo ? (
              <div className="aspect-video bg-black relative group">
                <YouTube 
                  videoId={activeVideo.youtubeVideoId}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 0,
                      modestbranding: 1,
                      rel: 0,
                      controls: 1,
                    },
                  }}
                  onStateChange={handleVideoStateChange}
                  onReady={(e) => playerRef.current = e.target}
                  className="w-full h-full"
                />
                
                {!isTabActive && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-10">
                    <AlertTriangle className="text-orange-500 mb-4" size={48} />
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Anti-Cheat Active</h3>
                    <p className="text-slate-400 text-sm mt-2">Please keep this tab active to continue earning rewards.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-black/40 flex items-center justify-center">
                <RefreshCw className="animate-spin text-orange-500" size={48} />
              </div>
            )}

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                    <Activity className="text-orange-500" />
                    Current Mission Drop
                  </h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Watch & Verify to claim rewards</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                    <Trophy className="text-emerald-500" size={16} />
                    <span className="text-emerald-500 font-black text-sm">+{activeVideo?.userPoints || 50} Pts</span>
                  </div>
                  <div className="px-4 py-2 bg-orange-500/10 rounded-xl border border-orange-500/20 flex items-center gap-2">
                    <Coins className="text-orange-500" size={16} />
                    <span className="text-orange-500 font-black text-sm">+{activeVideo?.userCoins || 10} Coins</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Watch Progress</p>
                  <p className="text-xs font-black text-white">{Math.round(progress)}%</p>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${progress >= 80 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-orange-500'}`}
                  />
                </div>
                <p className="text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest">
                  {progress < 80 ? `Watch ${80 - Math.round(progress)}% more to unlock verification` : 'Verification Unlocked!'}
                </p>
              </div>

              {/* Verification Section */}
              <AnimatePresence>
                {canVerify && !isVerifying && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setIsVerifying(true)}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} />
                    Start Verification
                  </motion.button>
                )}

                {isVerifying && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-black uppercase tracking-tight">Security Check</h3>
                      <p className="text-xs text-slate-400 font-medium">Select the correct color shown in the video to claim your reward.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {COLORS.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => handleVerify(c.name)}
                          className={`group relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${c.shadow} bg-black/40 border-white/5`}
                        >
                          <div className={`w-12 h-12 rounded-full ${c.color} shadow-lg transition-transform group-hover:scale-110`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">{c.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-rose-500">
                        <Heart size={16} fill="currentColor" />
                        <span className="text-xs font-black uppercase tracking-widest">{user.extraLives || 0} Extra Lives</span>
                      </div>
                      <button 
                        onClick={() => setIsVerifying(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sidebar: Live Feed & Stats */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" />
              Live Payout Feed
            </h3>
            <div className="space-y-4">
              {recentPayouts.map((p, i) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-black text-[10px]">
                    {p.displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black truncate uppercase tracking-tight">{p.displayName}</p>
                    <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Redeemed {p.rewardTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white">{p.cost.toLocaleString()}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Coins</p>
                  </div>
                </motion.div>
              ))}
              {recentPayouts.length === 0 && (
                <p className="text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest py-4">Waiting for next payout...</p>
              )}
            </div>
          </div>

          <div className="glass-card p-6 bg-gradient-to-br from-orange-600/20 to-purple-600/20 border-orange-500/30">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-4">Your Daily Streak</h3>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {[...Array(7)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-6 h-8 rounded-md flex items-center justify-center border ${
                      i < (user.totalCorrect % 7) 
                        ? 'bg-orange-500 border-orange-400 text-white' 
                        : 'bg-black/40 border-white/10 text-slate-600'
                    }`}
                  >
                    <span className="text-[10px] font-black">{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white italic">{user.totalCorrect % 7}/7</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Days Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
            <Play className="text-orange-500" />
            Available Mission Drops
          </h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{videos.length} Active Drops</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="glass-card aspect-video animate-pulse bg-white/5" />
            ))
          ) : (
            videos.map((v) => {
              const isClaimed = user.claimedVideos?.includes(v.id!);
              const isActive = activeVideo?.id === v.id;

              return (
                <motion.div
                  key={v.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => !isClaimed && setActiveVideo(v)}
                  className={`group glass-card overflow-hidden cursor-pointer transition-all duration-300 ${
                    isActive ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 
                    isClaimed ? 'opacity-50 grayscale border-emerald-500/30' : 'hover:border-white/30'
                  }`}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={`https://img.youtube.com/vi/${v.youtubeVideoId}/mqdefault.jpg`} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {isClaimed && (
                      <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-emerald-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <CheckCircle2 size={12} />
                          Claimed
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                          <Play size={12} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Mission Drop</span>
                      </div>
                      <div className="px-2 py-1 bg-orange-500 rounded-md text-[8px] font-black text-white uppercase tracking-widest">
                        {v.userPoints} Pts
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionBoard;
