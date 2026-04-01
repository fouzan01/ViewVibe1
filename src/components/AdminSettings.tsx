import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Settings, DollarSign, Users, LogIn } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PlatformSettings } from '../types';
import toast from 'react-hot-toast';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>({
    referralBonus: 50,
    dailyLoginBaseReward: 10,
    minimumWithdrawal: 1000
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'platformSettings', 'global_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as PlatformSettings);
        }
      } catch (error) {
        console.error("Error fetching platform settings:", error);
        toast.error("Failed to load platform settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const docRef = doc(db, 'platformSettings', 'global_config');
      await setDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success("Global economy settings updated successfully!");
    } catch (error) {
      console.error("Error updating platform settings:", error);
      toast.error("Failed to update platform settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="animate-spin text-orange-500 mb-4" size={48} />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Loading Settings...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-500">
          <Settings size={32} />
        </div>
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Economy Control</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Master Platform Configuration</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="glass-card p-8 space-y-8">
        <div className="space-y-6">
          {/* Referral Bonus */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500">
              <Users size={18} />
              <label className="text-xs font-black uppercase tracking-widest">Referral Bonus (XP)</label>
            </div>
            <input
              type="number"
              value={settings.referralBonus}
              onChange={(e) => setSettings({ ...settings, referralBonus: Number(e.target.value) })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:border-orange-500 outline-none transition-colors"
              placeholder="e.g. 50"
              required
            />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Points awarded to both referrer and referee upon successful verification.</p>
          </div>

          {/* Daily Login Reward */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500">
              <LogIn size={18} />
              <label className="text-xs font-black uppercase tracking-widest">Daily Login Base Reward</label>
            </div>
            <input
              type="number"
              value={settings.dailyLoginBaseReward}
              onChange={(e) => setSettings({ ...settings, dailyLoginBaseReward: Number(e.target.value) })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:border-orange-500 outline-none transition-colors"
              placeholder="e.g. 10"
              required
            />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Base points awarded for the first login of the day.</p>
          </div>

          {/* Minimum Withdrawal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500">
              <DollarSign size={18} />
              <label className="text-xs font-black uppercase tracking-widest">Minimum Withdrawal (Coins)</label>
            </div>
            <input
              type="number"
              value={settings.minimumWithdrawal}
              onChange={(e) => setSettings({ ...settings, minimumWithdrawal: Number(e.target.value) })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:border-orange-500 outline-none transition-colors"
              placeholder="e.g. 1000"
              required
            />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Minimum coin balance required to request a payout.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSaving ? (
            <RefreshCw size={20} className="animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {isSaving ? 'Updating...' : 'Save Global Settings'}
        </button>
      </form>
    </motion.div>
  );
};

export default AdminSettings;
