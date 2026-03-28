import React from 'react';
import { motion } from 'motion/react';
import { Crown, Trophy } from 'lucide-react';
import { UserData } from '../types';

interface LeaderboardItem extends UserData {
  rank: number;
  displayValue: number;
}

interface LeaderboardsProps {
  topUsers: LeaderboardItem[];
  currentUser: any;
  userRank: number | null;
  leaderboardCategory: 'earners' | 'watchers';
  timeframe: string;
  user: UserData;
}

const Leaderboards: React.FC<LeaderboardsProps> = ({
  topUsers,
  currentUser,
  userRank,
  leaderboardCategory,
  timeframe,
  user
}) => {
  const compactFormatter = new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 });

  return (
    <div className="space-y-4">
      {topUsers.map((item) => {
        const isTop3 = item.rank <= 3;
        const isCurrentUser = currentUser?.uid === item.id;
        const rankColors = [
          'border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_30px_rgba(234,179,8,0.15)]',
          'border-slate-300/50 bg-slate-300/10 shadow-[0_0_30px_rgba(203,213,225,0.1)]',
          'border-amber-700/50 bg-amber-700/10 shadow-[0_0_30px_rgba(180,83,9,0.1)]'
        ];

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: item.rank * 0.05 }}
            className={`glass-card p-4 sm:p-5 flex items-center gap-3 sm:gap-6 group hover:bg-white/10 transition-all duration-300 ${isTop3 ? rankColors[item.rank - 1] : ''} ${isCurrentUser ? 'border-orange-500/50 ring-1 ring-orange-500/20' : ''}`}
          >
            <div className="w-8 sm:w-12 text-center flex-shrink-0">
              {item.rank === 1 ? <Crown className="text-yellow-500 mx-auto" size={28} /> : 
               item.rank === 2 ? <Trophy className="text-slate-300 mx-auto" size={24} /> :
               item.rank === 3 ? <Trophy className="text-amber-700 mx-auto" size={24} /> :
               <span className={`text-lg sm:text-xl font-black ${isTop3 ? 'text-white' : 'text-slate-600'}`}>#{item.rank}</span>}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4">
                {/* AVATAR INTEGRATION */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 overflow-hidden bg-white/5 shadow-[0_0_15px_rgba(249,115,22,0.1)] group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300">
                    <img 
                      src={item.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id || item.displayName}`} 
                      alt={item.displayName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id || item.displayName}`;
                      }}
                    />
                  </div>
                  {item.rank === 1 && <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-black text-black border-2 border-[#05050a]">1</div>}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm sm:text-lg group-hover:text-orange-400 transition-colors truncate">{item.displayName}</h4>
                    {isCurrentUser && <span className="px-2 py-0.5 bg-orange-500 text-[8px] font-black text-white rounded-full uppercase tracking-tighter flex-shrink-0">You</span>}
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest truncate">
                    {item.rank === 1 ? 'Undisputed Champion' : item.rank <= 3 ? 'Elite Legend' : 'Rising Star'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className={`text-lg sm:text-2xl font-black leading-none ${item.rank === 1 ? 'text-yellow-500' : 'text-white'}`}>
                {compactFormatter.format(item.displayValue)} {leaderboardCategory === 'earners' ? 'XP' : 'MINS'}
              </p>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                {compactFormatter.format(item.coins || 0)} Coins
              </p>
            </div>
          </motion.div>
        );
      })}

      {/* Current User Pinned Rank (if not in top 10) */}
      {currentUser && userRank && userRank > 10 && (
        <>
          <div className="py-4 flex items-center justify-center">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <div className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Your Position</div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 sm:p-5 flex items-center gap-3 sm:gap-6 border-orange-500/30 bg-orange-500/5 ring-1 ring-orange-500/10"
          >
            <div className="w-8 sm:w-12 text-center flex-shrink-0">
              <span className="text-lg sm:text-xl font-black text-orange-500">#{userRank}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-orange-500/30 overflow-hidden bg-white/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                    <img 
                      src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid || user.displayName}`} 
                      alt={user.displayName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid || user.displayName}`;
                      }}
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm sm:text-lg text-white truncate">{user.displayName}</h4>
                    <span className="px-2 py-0.5 bg-orange-500 text-[8px] font-black text-white rounded-full uppercase tracking-tighter flex-shrink-0">You</span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-orange-500/70 uppercase tracking-widest truncate">
                    Keep climbing to reach the elite!
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-lg sm:text-2xl font-black text-white leading-none">
                {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(
                  leaderboardCategory === 'earners' ? (user.lifetimePoints || user.wallet || 0) : user.verifiedWatchTime
                )} {leaderboardCategory === 'earners' ? 'XP' : 'MINS'}
              </p>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                {leaderboardCategory === 'earners' ? `Wallet: ${new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(user.wallet || 0)}` : 'Watch Time'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Leaderboards;
