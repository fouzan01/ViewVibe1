import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Shield, ChevronRight, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserData, OperationType } from '../types';
import { indiaData } from '../constants/regions';

interface OnboardingGateProps {
  user: any;
  userData: UserData | null;
  children: React.ReactNode;
}

const OnboardingGate: React.FC<OnboardingGateProps> = ({ user, userData, children }) => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is not logged in, or already has state/district, just show children
  const needsOnboarding = user && (!userData?.state || !userData?.district);

  const handleLockIn = async () => {
    if (!selectedState || !selectedDistrict || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        state: selectedState,
        district: selectedDistrict,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error locking in region:', err);
      setError('Failed to claim territory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!needsOnboarding) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05050a] flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="glass-card p-8 border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.15)]">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
              <Shield className="text-orange-500 w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
              Claim Your Territory
            </h1>
            <p className="text-slate-400 font-medium text-sm">
              Every legend starts somewhere. Where will you defend your glory?
            </p>
          </div>

          <div className="space-y-6">
            {/* State Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">
                Select State
              </label>
              <div className="relative">
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedDistrict('');
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold appearance-none focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                >
                  <option value="" disabled className="bg-[#0a0a15]">Choose your state</option>
                  {Object.keys(indiaData).sort().map(state => (
                    <option key={state} value={state} className="bg-[#0a0a15]">{state}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronRight className="text-slate-500 rotate-90" size={18} />
                </div>
              </div>
            </div>

            {/* District Selection */}
            <AnimatePresence mode="wait">
              {selectedState && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">
                    Select District
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold appearance-none focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#0a0a15]">Choose your district</option>
                      {indiaData[selectedState].sort().map(district => (
                        <option key={district} value={district} className="bg-[#0a0a15]">{district}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronRight className="text-slate-500 rotate-90" size={18} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p className="text-red-500 text-xs font-bold text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                {error}
              </p>
            )}

            <button
              onClick={handleLockIn}
              disabled={!selectedState || !selectedDistrict || isSubmitting}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 ${
                !selectedState || !selectedDistrict || isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-orange-500 text-white shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <MapPin size={20} />
                  Lock In Region
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              Regional Glory System Active
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingGate;
