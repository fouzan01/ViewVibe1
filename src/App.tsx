/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  useNavigate, 
  useLocation, 
  useSearchParams 
} from 'react-router-dom';
import { 
  Play, 
  Trophy, 
  Wallet, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
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
  Lock,
  RefreshCw,
  ShoppingBag,
  Activity,
  Share2,
  Clock,
  Settings as SettingsIcon,
  Search,
  User,
  Heart,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserData, 
  Transaction, 
  ActiveTab, 
  OperationType, 
  Video, 
  PayoutRequest, 
  Reward, 
  ReferralConfig 
} from './types';
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
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  arrayUnion,
  serverTimestamp,
  getDocFromServer,
  where,
  getDocs
} from 'firebase/firestore';

// Components
import Leaderboards from './components/Leaderboards';
import Profile from './components/Profile';
import DailyBonus from './components/DailyBonus';
import AdminPromoManager from './components/AdminPromoManager';
import ReferralDashboard from './components/ReferralDashboard';
import AdminSettings from './components/AdminSettings';
import OnboardingGate from './components/OnboardingGate';
import AdminDashboard from './components/AdminDashboard';
import MissionBoard from './components/MissionBoard';
import GuestView from './components/GuestView';
import { SidebarLink } from './components/SidebarLink';
import { ErrorBoundary } from './components/ErrorBoundary';
import YouTube from 'react-youtube';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Utils & Constants
import { ADMIN_EMAIL, COLORS, INITIAL_USER_DATA, REWARD_CATALOG, INITIAL_HISTORY } from './constants';
import { handleFirestoreError } from './utils/firestore';
import { isNewDay, isNewWeek, isNewMonth, formatWatchTime } from './utils/date';



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
  const [promoInput, setPromoInput] = useState('');
  const [promoInfo, setPromoInfo] = useState<any>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Check promo code as user types
  useEffect(() => {
    const checkCode = async () => {
      const code = promoInput.trim().toUpperCase();
      if (code.length < 3) {
        setPromoInfo(null);
        return;
      }
      
      try {
        const promoRef = doc(db, 'promoCodes', code);
        const promoSnap = await getDoc(promoRef);
        if (promoSnap.exists()) {
          setPromoInfo(promoSnap.data());
        } else {
          setPromoInfo(null);
        }
      } catch (e) {
        setPromoInfo(null);
      }
    };

    const timeout = setTimeout(checkCode, 500);
    return () => clearTimeout(timeout);
  }, [promoInput]);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('missionBoard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [leaderboardCategory, setLeaderboardCategory] = useState<'earners' | 'watchers'>('earners');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'overall'>('overall');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isRewardsLoading, setIsRewardsLoading] = useState(true);
  const [recentPayouts, setRecentPayouts] = useState<PayoutRequest[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [refConfig, setRefConfig] = useState<ReferralConfig>({
    referrerCoins: 500,
    referrerPoints: 100,
    refereeCoins: 200,
    refereePoints: 50,
    isActive: true
  });
  const isProcessingRef = React.useRef(false);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // --- Referral Config Sync ---
  useEffect(() => {
    const refDoc = doc(db, 'config', 'referral');
    const unsubscribe = onSnapshot(refDoc, (snapshot) => {
      if (snapshot.exists()) {
        setRefConfig(snapshot.data() as ReferralConfig);
      }
    }, (error) => {
      console.error("Referral config fetch error:", error);
    });
    return () => unsubscribe();
  }, []);

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
      collection(db, 'payoutRequests'),
      where('status', '==', 'completed')
    );
    const unsubscribe = onSnapshot(pQuery, (snapshot) => {
      const pList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest))
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

  // --- Pending Payout Lock ---
  useEffect(() => {
    if (!currentUser) {
      setHasPendingRequest(false);
      return;
    }
    const q = query(
      collection(db, 'payoutRequests'),
      where('uid', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasPendingRequest(!snapshot.empty);
    }, (error) => {
      console.error("Pending request check error:", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

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
      })) as UserData[];
      
      setUsers(allUsers);

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
              referredBy: searchParams.get('ref') || null,
              redeemedPromos: [],
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
  const handleRedeemPromo = async () => {
    if (!currentUser || !promoInput.trim()) return;
    
    setIsRedeeming(true);
    const code = promoInput.trim().toUpperCase();
    
    try {
      const promoRef = doc(db, 'promoCodes', code);
      const promoSnap = await getDoc(promoRef);
      
      if (!promoSnap.exists()) {
        showToast("Invalid promo code", "error");
        setIsRedeeming(false);
        return;
      }
      
      const promoData = promoSnap.data();
      
      if (!promoData.isActive) {
        showToast("This promo code is no longer active", "error");
        setIsRedeeming(false);
        return;
      }
      
      if (promoData.currentUses >= promoData.maxUses) {
        showToast("This promo code has reached its maximum uses", "error");
        setIsRedeeming(false);
        return;
      }
      
      if (user.redeemedPromos?.includes(code)) {
        showToast("You have already redeemed this code", "error");
        setIsRedeeming(false);
        return;
      }
      
      // Perform redemption
      const userRef = doc(db, 'users', currentUser.uid);
      
      // Update User
      await updateDoc(userRef, {
        wallet: increment(promoData.reward),
        coins: increment(promoData.reward),
        redeemedPromos: arrayUnion(code)
      });
      
      // Update Promo Code
      await updateDoc(promoRef, {
        currentUses: increment(1)
      });
      
      // Add Transaction
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'earn',
        amount: promoData.reward,
        note: `Promo Code: ${code}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      
      showToast(`Successfully redeemed ${promoData.reward} coins!`, "success");
      setPromoInput('');
    } catch (error) {
      console.error("Redemption error:", error);
      showToast("Failed to redeem code. Please try again.", "error");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSignIn = async () => {
    try {
      // 1. CAPTURE THE URL PARAMETER
      const urlParams = new URLSearchParams(window.location.search);
      const referrerUid = urlParams.get('ref');

      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const email = fbUser.email || `${fbUser.uid}@viewvibe.internal`;
        
        const newUserData: UserData = {
          displayName: fbUser.displayName || 'Anonymous',
          email: email,
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
          photoURL: fbUser.photoURL || '',
          redeemedPromos: [],
          referredBy: referrerUid || null,
          createdAt: serverTimestamp(),
        };
        
        // Initial document set
        await setDoc(userDocRef, newUserData);
        
        // 2. THE REFERRAL TRANSACTION LOGIC (Silent)
        if (referrerUid && referrerUid !== fbUser.uid) {
          try {
            // Fetch the global settings
            const configSnap = await getDoc(doc(db, 'platformSettings', 'global_config'));
            
            // Extract the bonus (Fallback to 50 if config is missing)
            const bonusAmount = configSnap.exists() ? (configSnap.data().referralBonus || 50) : 50;
            
            // Execute an updateDoc on the Referrer's document
            await updateDoc(doc(db, 'users', referrerUid), {
              coins: increment(bonusAmount),
              referrals: increment(1),
              earnedFromReferrals: increment(bonusAmount)
            });
            
            // Execute an updateDoc on the NEW User's document
            await updateDoc(userDocRef, {
              referredBy: referrerUid
            });

            // Add transaction record for referrer
            await addDoc(collection(db, 'transactions'), {
              userId: referrerUid,
              type: 'earn',
              amount: bonusAmount,
              note: `Referral Bonus: ${fbUser.displayName || 'New User'}`,
              date: new Date().toISOString().split('T')[0],
              createdAt: serverTimestamp()
            });

            console.log(`Referral reward of ${bonusAmount} coins granted to ${referrerUid}`);
          } catch (refError) {
            // 3. ERROR HANDLING (Silent)
            console.error("Referral transaction failed (silently caught):", refError);
          }
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

      // 1.5. Referral Reward Logic (First Video Watch)
      if (user.referredBy && (!user.claimedVideos || user.claimedVideos.length === 0) && refConfig.isActive) {
        const referrerRef = doc(db, 'users', user.referredBy);
        const referrerSnap = await getDoc(referrerRef);
        
        if (referrerSnap.exists()) {
          // Reward Referrer
          await updateDoc(referrerRef, {
            wallet: increment(refConfig.referrerPoints),
            lifetimePoints: increment(refConfig.referrerPoints),
            coins: increment(refConfig.referrerCoins),
            earnedFromReferrals: increment(refConfig.referrerPoints)
          });

          // Reward Referee (Current User)
          await updateDoc(userDocRef, {
            wallet: increment(refConfig.refereePoints),
            lifetimePoints: increment(refConfig.refereePoints),
            coins: increment(refConfig.refereeCoins)
          });

          // Add transaction records for both
          await addDoc(collection(db, 'transactions'), {
            userId: user.referredBy,
            type: 'earn',
            amount: refConfig.referrerPoints,
            note: `Referral Reward: ${user.displayName || 'New User'}`,
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
          });

          await addDoc(collection(db, 'transactions'), {
            userId: currentUser.uid,
            type: 'earn',
            amount: refConfig.refereePoints,
            note: `Referral Bonus (Referred by ${referrerSnap.data().displayName || 'Friend'})`,
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
          });

          showToast(`Referral Bonus! You & your friend earned extra rewards!`, 'success');
        }
      }

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

  const handleRedeem = async (reward: any) => {
    if (!currentUser || isSubmitting || hasPendingRequest) return;
    
    const spendableCoins = user.coins || 0;
    if (spendableCoins < reward.cost) {
      showToast("Insufficient Coins. Keep watching drops to earn more!", 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create payout request record
      await addDoc(collection(db, 'payoutRequests'), {
        uid: currentUser.uid,
        userEmail: currentUser.email,
        displayName: user.displayName,
        rewardId: reward.id,
        rewardTitle: reward.title,
        cost: reward.cost,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. Add transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'spend',
        amount: reward.cost,
        note: `Redeemed: ${reward.title}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      showToast("Redemption request submitted! Awaiting approval.", 'success');
      setHasPendingRequest(true);
      setSelectedReward(null);
    } catch (error) {
      console.error("Redemption error:", error);
      showToast("Failed to submit request. Please try again.", 'error');
    } finally {
      setIsSubmitting(false);
    }
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
        {currentUser && (
          <DailyBonus 
            user={user} 
            currentUser={currentUser} 
            showToast={showToast} 
          />
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'missionBoard' && (
            <motion.div
              key="missionBoard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="mt-0">
                <MissionBoard 
                  user={user} 
                  currentUser={currentUser} 
                  onRewardClaimed={handleRewardClaimed} 
                  showToast={showToast}
                />
              </div>
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
                allUsers={users}
                currentUser={currentUser}
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
                {/* Promo Code Redemption */}
                <div className="lg:col-span-3">
                  <div className="glass-card p-8 border-orange-500/20 bg-orange-500/5">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="space-y-2 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                          <Gift className="text-orange-500" />
                          <h3 className="text-2xl font-black uppercase tracking-tight">Redeem Promo Code</h3>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">Have a special code? Enter it below to claim your reward instantly!</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full sm:w-80">
                          <input 
                            type="text"
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                            placeholder="ENTER CODE (E.G. WELCOME50)"
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-6 py-4 text-white font-black tracking-widest outline-none focus:border-orange-500 transition-all placeholder:text-slate-700"
                          />
                          {promoInfo && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute -bottom-6 left-2 flex items-center gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                {promoInfo.maxUses - promoInfo.currentUses} Uses Left • Reward: {promoInfo.reward} Coins
                              </span>
                            </motion.div>
                          )}
                        </div>
                        <button
                          onClick={handleRedeemPromo}
                          disabled={isRedeeming || !promoInput.trim()}
                          className="w-full sm:w-auto px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                        >
                          {isRedeeming ? <RefreshCw className="animate-spin" size={18} /> : 'Redeem'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rewards Rack */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className="text-purple-500" />
                    <h3 className="text-2xl font-black uppercase tracking-tight">Rewards Rack</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {REWARD_CATALOG.map((item) => {
                      const canAfford = (user.coins || 0) >= item.cost;
                      const isDisabled = !canAfford || hasPendingRequest || isSubmitting;
                      
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
                          <p className="text-sm text-slate-400 mb-6 flex-1">{item.description}</p>
                          <button
                            disabled={isDisabled}
                            onClick={() => setSelectedReward(item)}
                            className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 ${
                              !isDisabled 
                                ? 'bg-gradient-to-r from-orange-500 to-purple-500 text-white hover:scale-105 shadow-lg shadow-purple-500/20' 
                                : 'bg-white/5 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            {hasPendingRequest ? 'Pending Approval' : canAfford ? 'Redeem Now' : 'Insufficient Funds'}
                          </button>
                        </div>
                      );
                    })}
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
              className="w-full"
            >
              <ReferralDashboard currentUser={currentUser} />
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <AdminDashboard 
              currentUser={currentUser} 
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        {/* Redemption Confirmation Modal */}
        <AnimatePresence>
          {selectedReward && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card p-8 max-w-md w-full space-y-6"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Confirm Redemption</h3>
                  <p className="text-slate-400">Are you sure you want to redeem your coins for this reward?</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Reward</p>
                  <p className="text-lg font-black text-white">{selectedReward.title}</p>
                  <p className="text-orange-500 font-black">{selectedReward.cost.toLocaleString()} Coins</p>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedReward(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleRedeem(selectedReward)}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-gradient-to-r from-orange-500 to-purple-500 text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : 'Confirm'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
        </div>
        </OnboardingGate>
      )}
    </div>
  );
}
