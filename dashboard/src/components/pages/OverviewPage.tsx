import React from 'react';
import { StatCards } from '../overview/StatCards';
import { ActivityChart } from '../overview/ActivityChart';
import { VerificationFlowCard } from '../overview/VerificationFlowCard';
import { TamperCard } from '../overview/TamperCard';
import { AccessTable } from '../overview/AccessTable';
import { TEAM_NAME } from '../../config/brand';

interface OverviewPageProps {
  onOpenEnrollModal?: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onOpenEnrollModal }) => {
  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-7xl mx-auto pb-10">
      {/* Header with Title and Team Subtitle */}
      <div className="flex flex-col">
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Overview
        </h1>
        <p className="text-xs sm:text-sm font-medium text-neutral-400 mt-0.5">
          SecureVault by <span className="font-bold accent-text-gradient uppercase tracking-wider">{TEAM_NAME}</span>
        </p>
      </div>

      {/* Row 1: Four Stat Cards */}
      <StatCards />

      {/* Row 2: Activity Chart (Left ~2/3) + Two Stacked Cards (Right ~1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 w-full items-start">
        {/* Activity Chart */}
        <div className="lg:col-span-2 w-full">
          <ActivityChart />
        </div>

        {/* Verification Flow & Tamper Cards Stacked */}
        <div className="flex flex-col gap-5 sm:gap-6 w-full">
          <VerificationFlowCard />
          <TamperCard />
        </div>
      </div>

      {/* Row 3: Bottom Table (Access Log | Cards) */}
      <div className="w-full">
        <AccessTable onOpenEnrollModal={onOpenEnrollModal} />
      </div>
    </div>
  );
};
