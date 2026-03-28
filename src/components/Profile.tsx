import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Trophy, 
  MapPin, 
  Instagram, 
  Facebook, 
  RefreshCw, 
  Save,
  ChevronDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserData } from '../types';
import { indiaData } from '../constants/regions';

interface ProfileProps {
  user: UserData;
  currentUser: FirebaseUser | null;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const Profile = ({ user, currentUser, showToast }: ProfileProps) => {
  const [formData, setFormData] = useState({
    instagram: user.instagram || '',
    facebook: user.facebook || '',
    state: user.state || '',
    district: user.district || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic Level Calculation
  const userLevel = Math.floor(Math.sqrt((user.wallet || 0) / 100)) + 1;

  useEffect(() => {
    setFormData({
      instagram: user.instagram || '',
      facebook: user.facebook || '',
      state: user.state || '',
      district: user.district || ''
    });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...formData,
        photoURL: currentUser.photoURL || ''
      });
      showToast("Profile updated! Your region is locked in.", "success");
    } catch (error) {
      console.error("Profile update error:", error);
      showToast("Failed to update profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setFormData({
      ...formData,
      state: newState,
      district: '' // Reset district when state changes
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black uppercase tracking-tighter">Your Profile</h2>
        <p className="text-slate-400">Manage your social presence and regional glory.</p>
      </div>

      {/* ID Card (Read-only) */}
      <div className="glass-card p-8 bg-gradient-to-br from-orange-500/10 via-purple-500/5 to-transparent border-orange-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
              <img 
                src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-orange-500 p-2 rounded-lg shadow-lg">
              <UserCheck size={16} className="text-white" />
            </div>
          </div>
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h3 className="text-3xl font-black uppercase tracking-tighter">{user.displayName}</h3>
              <span className="px-2 py-0.5 bg-orange-500 text-[10px] font-black text-white rounded-sm uppercase tracking-widest">Verified</span>
            </div>
            <p className="text-slate-400 font-mono text-sm">{user.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <Trophy size={12} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Level {userLevel}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <MapPin size={12} className="text-purple-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{user.state || 'Region Unset'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Form */}
      <form onSubmit={handleSave} className="glass-card p-8 space-y-8 border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Socials */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">Social Presence</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Instagram Handle</label>
                <div className="relative group">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="@username"
                    value={formData.instagram}
                    onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                    className="w-full bg-[#0A0A0F] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Facebook Profile</label>
                <div className="relative group">
                  <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="facebook.com/username"
                    value={formData.facebook}
                    onChange={(e) => setFormData({...formData, facebook: e.target.value})}
                    className="w-full bg-[#0A0A0F] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Region */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-purple-500">Regional Glory</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Select State</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-500 transition-colors" size={18} />
                  <select 
                    value={formData.state}
                    onChange={handleStateChange}
                    className="w-full bg-[#0A0A0F] border border-white/5 rounded-xl py-4 pl-12 pr-10 text-sm font-bold focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select State</option>
                    {Object.keys(indiaData).sort().map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Select District</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-500 transition-colors" size={18} />
                  <select 
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    disabled={!formData.state}
                    className="w-full bg-[#0A0A0F] border border-white/5 rounded-xl py-4 pl-12 pr-10 text-sm font-bold focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select District</option>
                    {formData.state && (indiaData as any)[formData.state].sort().map((district: string) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
};

export default Profile;
