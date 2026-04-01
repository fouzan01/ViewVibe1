import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Power, 
  PowerOff, 
  Users, 
  Coins,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

interface PromoCode {
  code: string;
  reward: number;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdAt: number;
}

interface AdminPromoManagerProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const AdminPromoManager: React.FC<AdminPromoManagerProps> = ({ showToast }) => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [codeName, setCodeName] = useState('');
  const [rewardAmount, setRewardAmount] = useState<number>(50);
  const [maxUses, setMaxUses] = useState<number>(100);

  useEffect(() => {
    const q = query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const codes = snapshot.docs.map(doc => doc.data() as PromoCode);
      setPromoCodes(codes);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching promo codes:", error);
      showToast("Failed to load promo codes", "error");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCode = codeName.trim().toUpperCase();
    if (!cleanCode) {
      showToast("Please enter a code name", "error");
      return;
    }

    if (rewardAmount <= 0 || maxUses <= 0) {
      showToast("Amount and uses must be greater than 0", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const promoRef = doc(db, 'promoCodes', cleanCode);
      
      const newPromo: PromoCode = {
        code: cleanCode,
        reward: rewardAmount,
        maxUses: maxUses,
        currentUses: 0,
        isActive: true,
        createdAt: Date.now()
      };

      await setDoc(promoRef, newPromo);
      
      showToast(`Promo code ${cleanCode} generated successfully!`, "success");
      setCodeName('');
      setRewardAmount(50);
      setMaxUses(100);
    } catch (error) {
      console.error("Error generating promo code:", error);
      showToast("Failed to generate promo code", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (code: string, currentStatus: boolean) => {
    try {
      const promoRef = doc(db, 'promoCodes', code);
      await updateDoc(promoRef, { isActive: !currentStatus });
      showToast(`Code ${code} ${!currentStatus ? 'activated' : 'deactivated'}`, "success");
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  };

  const deleteCode = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete ${code}?`)) return;
    
    try {
      const promoRef = doc(db, 'promoCodes', code);
      await deleteDoc(promoRef);
      showToast(`Code ${code} deleted`, "success");
    } catch (error) {
      showToast("Failed to delete code", "error");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-500">
          <Ticket size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white">Promo Manager</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Generate and track limited-use rewards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 space-y-6 sticky top-8">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus size={20} className="text-purple-500" />
              New Promo Code
            </h3>

            <form onSubmit={handleGenerateCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Code Name</label>
                <input 
                  type="text"
                  value={codeName}
                  onChange={(e) => setCodeName(e.target.value.toUpperCase())}
                  placeholder="E.G. WELCOME100"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50 transition-colors uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Reward (Coins)</label>
                  <div className="relative">
                    <Coins size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="number"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Max Uses</label>
                  <div className="relative">
                    <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Ticket size={18} />}
                Generate Code
              </button>
            </form>
          </div>
        </div>

        {/* Live Tracker */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase tracking-tight text-white">Active Codes</h3>
            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {promoCodes.length} Total
            </span>
          </div>

          {isLoading ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center gap-4 text-slate-500">
              <Loader2 className="animate-spin" size={32} />
              <span className="text-xs font-bold uppercase tracking-widest">Syncing with database...</span>
            </div>
          ) : promoCodes.length === 0 ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center gap-4 text-slate-500 border-dashed">
              <AlertCircle size={32} />
              <span className="text-xs font-bold uppercase tracking-widest">No promo codes found</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {promoCodes.map((promo) => (
                  <motion.div
                    key={promo.code}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 ${promo.isActive ? 'border-l-purple-500' : 'border-l-slate-700 opacity-60'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${promo.isActive ? 'bg-purple-500/20 text-purple-500' : 'bg-slate-800 text-slate-500'}`}>
                        <Ticket size={20} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black tracking-tighter text-white">{promo.code}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-orange-500 text-[10px] font-black uppercase">
                            <Coins size={10} />
                            {promo.reward} Coins
                          </div>
                          <div className="w-1 h-1 bg-slate-700 rounded-full" />
                          <div className="text-slate-500 text-[10px] font-black uppercase">
                            Created {new Date(promo.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Usage Progress</div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(promo.currentUses / promo.maxUses) * 100}%` }}
                                className={`h-full ${promo.currentUses >= promo.maxUses ? 'bg-red-500' : 'bg-purple-500'}`}
                              />
                            </div>
                            <span className="text-xs font-black text-white">{promo.currentUses} / {promo.maxUses}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleStatus(promo.code, promo.isActive)}
                            className={`p-2 rounded-lg transition-colors ${promo.isActive ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                            title={promo.isActive ? "Deactivate" : "Activate"}
                          >
                            {promo.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                          </button>
                          <button
                            onClick={() => deleteCode(promo.code)}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPromoManager;
