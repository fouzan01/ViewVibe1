import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
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
  Coins,
  Gift
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  addDoc, 
  collection, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Video, UserData, ReferralConfig } from '../types';
import { COLORS } from '../constants';
import { handleFirestoreError } from '../utils/firestore';
import { isNewDay, isNewWeek, isNewMonth } from '../utils/date';

interface GuestViewProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const GuestView = ({ showToast }: GuestViewProps) => {
  const [player, setPlayer] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [isClaimed, setIsClaimed] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  
  const timerRef = useRef<any>(null);
  
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
      const isHidden = document.hidden;
      setIsTabActive(!isHidden);
      
      if (isHidden && player && isPlaying) {
        player.pauseVideo();
      } else if (!isHidden && isPlaying) {
        showToast("Timer paused! You must keep the video on your screen to earn coins.", "error");
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [player, isPlaying, showToast]);

  useEffect(() => {
    if (isPlaying && player && videoId && visitorId && !isProcessed && isTabActive) {
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
        if (newMaxTime >= duration * 0.8 && duration > 0 && !isProcessed && !isVerifying && !isClaimed) {
          setIsVerifying(true);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, player, duration, videoId, visitorId, isProcessed, maxWatchedTime, isTabActive, isVerifying, isClaimed, showToast]);

  const handleVerify = async (colorName: string) => {
    if (!videoId || !visitorId || !referrerUid) return;

    try {
      // Fetch video data to check correct color and rewards
      const vQuery = query(collection(db, "videos"), where("youtubeVideoId", "==", videoId));
      const vSnapshot = await getDocs(vQuery);
      
      if (vSnapshot.empty) {
        showToast("Video mission not found.", "error");
        return;
      }

      const videoDoc = vSnapshot.docs[0];
      const videoData = videoDoc.data() as Video;

      if (colorName !== videoData.correctColor) {
        showToast("Incorrect color! Verification failed.", "error");
        setIsVerifying(false);
        return;
      }

      const guestViewId = `${visitorId}_${videoId}`;
      const guestViewRef = doc(db, 'guest_views', guestViewId);
      const guestViewDoc = await getDoc(guestViewRef);
      
      if (guestViewDoc.exists()) {
        showToast("Thanks for watching! Create an account to start earning your own points.", "success");
        setIsClaimed(true);
        setIsVerifying(false);
        setIsProcessed(true);
        return;
      }

      // Lock this device for this video
      await setDoc(guestViewRef, {
        visitorId,
        videoId,
        createdAt: serverTimestamp()
      });

      const referralPoints = videoData.guestPoints || 10;
      const referralCoins = videoData.guestCoins || 2;

      // THE FIRESTORE PAYLOAD (Syncing the Network Buckets)
      const referrerRef = doc(db, "users", referrerUid);
      const referrerDoc = await getDoc(referrerRef);
      
      if (!referrerDoc.exists()) {
        showToast("Referrer not found.", "error");
        return;
      }

      const referrerData = referrerDoc.data() as UserData;
      const lastTs = referrerData.lastEarnedTimestamp;
      const watchMins = Math.floor(maxWatchedTime / 60);

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

      // Add transaction for referrer
      await addDoc(collection(db, 'transactions'), {
        userId: referrerUid,
        type: 'earn',
        amount: referralPoints,
        note: `Guest Referral Reward`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      setIsClaimed(true);
      setIsVerifying(false);
      setIsProcessed(true);
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

  const progress = duration > 0 ? Math.min(100, Math.floor((maxWatchedTime / (duration * 0.8)) * 100)) : 0;

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
          
          {!isTabActive && isPlaying && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-10">
              <AlertTriangle className="text-orange-500 mb-4" size={48} />
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Anti-Cheat Active</h3>
              <p className="text-slate-400 text-sm mt-2">Please keep this tab active to continue earning rewards.</p>
            </div>
          )}

          {isClaimed && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-20">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                <CheckCircle2 className="text-emerald-500" size={40} />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-white">Mission Complete!</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">
                You've successfully verified this drop. The rewards have been processed for your referrer.
              </p>
              <button 
                onClick={() => window.location.href = '/'}
                className="mt-8 px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-orange-500/30"
              >
                Create Your Own Account
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black uppercase tracking-tight">Support Progress</h3>
                {!isTabActive && isPlaying && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 text-rose-500 text-[10px] font-black uppercase tracking-widest"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>Paused - Tab Inactive</span>
                  </motion.div>
                )}
              </div>
              <span className="text-orange-500 font-mono text-xs">
                {progress}%
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
              />
            </div>
            
            <AnimatePresence>
              {isVerifying && !isClaimed && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6 mt-4"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-black uppercase tracking-tight">Security Check</h3>
                    <p className="text-xs text-slate-400 font-medium">Select the correct color shown in the video.</p>
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

                  <button 
                    onClick={() => setIsVerifying(false)}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
              {isProcessed ? "Support Completed! 🎉" : progress >= 100 ? "Verification Required" : "Keep watching to support your friend"}
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

export default GuestView;
