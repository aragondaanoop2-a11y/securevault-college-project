import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, ShieldCheck, Key, Radio } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { TEAM_NAME } from '../../config/brand';

export const CardsPage: React.FC = () => {
  const { cards, deleteCard, enrollCard } = useVault();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    await enrollCard();
    setTimeout(() => setIsEnrolling(false), 5000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Registered RFID Credentials
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            NVS-Persisted Whitelist for 13.56 MHz MIFARE Cards ({TEAM_NAME})
          </p>
        </div>

        <button
          onClick={handleEnroll}
          disabled={isEnrolling}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold accent-gradient-btn shadow-lg shadow-pink-500/20 self-start sm:self-auto min-h-[44px]"
        >
          {isEnrolling ? <Radio className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
          <span>{isEnrolling ? 'Scanning for Card...' : 'Enroll New Card'}</span>
        </button>
      </div>

      {/* Live enrollment alert banner if active */}
      {isEnrolling && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-500/20 border border-orange-500/40 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-orange-400 animate-spin" />
            <div>
              <p className="text-xs font-bold text-white">Enrollment Mode Active on ESP32</p>
              <p className="text-[11px] text-orange-200">Hold your physical RFID tag / keyfob against the RC522 reader now.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-orange-300">Timeout: 10s</span>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card, idx) => {
          const gradients = [
            'from-[#24131b] via-[#1a0e14] to-[#12070e] border-pink-500/30',
            'from-[#1e1326] via-[#140b1b] to-[#0d0714] border-purple-500/30',
            'from-[#29170e] via-[#1b0f09] to-[#12070a] border-orange-500/30',
          ];
          const grad = gradients[idx % gradients.length];

          return (
            <div 
              key={card.uid}
              className={`p-5 rounded-2xl bg-gradient-to-br ${grad} border shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] transition`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center text-white">
                    <CreditCard className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{card.name}</h3>
                    <p className="text-[10px] text-neutral-400">MIFARE Classic 1K / S50</p>
                  </div>
                </div>

                <button
                  onClick={() => deleteCard(card.uid)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Revoke Access"
                  aria-label={`Revoke Card ${card.uid}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* UID Display */}
              <div className="my-6">
                <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Unique Identifier (UID)</span>
                <div className="text-lg font-mono font-extrabold text-white tracking-widest mt-0.5">
                  {card.uid}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-300 font-medium">Authorized</span>
                </div>
                <span>
                  {card.lastAccess ? `Used ${new Date(card.lastAccess).toLocaleDateString()}` : 'Never scanned'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
