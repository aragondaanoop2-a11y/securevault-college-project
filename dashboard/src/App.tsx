import React, { useState, useEffect } from 'react';
import { Sidebar, NavPage } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { OverviewPage } from './components/pages/OverviewPage';
import { AccessLogPage } from './components/pages/AccessLogPage';
import { CardsPage } from './components/pages/CardsPage';
import { AlertsPage } from './components/pages/AlertsPage';
import { DevicePage } from './components/pages/DevicePage';
import { SettingsPage } from './components/pages/SettingsPage';
import { UsersPage } from './components/pages/UsersPage';
import { SimulatorDrawer } from './components/simulator/SimulatorDrawer';
import { OtpEntryOverlay } from './components/auth/OtpEntryOverlay';
import { LoginPage, PasswordChangePage } from './components/auth/LoginPage';
import { useVault } from './context/VaultContext';
import { useAuth } from './context/AuthContext';
import { Cpu } from 'lucide-react';

const SecureVaultDashboard: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => {
  const [currentPage, setCurrentPage] = useState<NavPage>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const { isSimulator } = useVault();
  const { user } = useAuth();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage onOpenEnrollModal={() => setCurrentPage('cards')} />;
      case 'logs':
        return <AccessLogPage />;
      case 'cards':
        return <CardsPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'device':
        return <DevicePage />;
      case 'settings':
        return <SettingsPage />;
      case 'users':
        return user?.role === 'admin' ? <UsersPage /> : <OverviewPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070306] text-white flex flex-col justify-center items-center relative overflow-x-hidden p-0 sm:p-4 lg:p-6">
      {/* Background radial gradient glow matching reference */}
      <div className="fixed top-0 left-0 w-[550px] h-[550px] bg-gradient-to-br from-pink-600/20 via-purple-700/10 to-transparent rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[450px] h-[450px] bg-gradient-to-tl from-orange-600/15 via-rose-700/10 to-transparent rounded-full blur-[140px] pointer-events-none"></div>

      {/* Main Enclosed Rounded Chassis Container (matching the reference screenshot container) */}
      <div className="w-full max-w-[1480px] h-full sm:min-h-[92vh] sm:rounded-[28px] border sm:border-white/[0.08] bg-[#0c070b]/90 backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Left Sidebar (Desktop) + Mobile Bottom Bar */}
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} isAdmin={user?.role === 'admin'} />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Bar */}
          <Navbar 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
            user={user!}
            onSignOut={onSignOut}
          />

          {/* Main Scrollable View */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 safe-area-bottom">
            {renderCurrentPage()}
          </main>
        </div>
      </div>

      {/* Simulator Quick Launcher Floating Button (when closed) */}
      {isSimulator && !isSimulatorOpen && (
        <button
          onClick={() => setIsSimulatorOpen(true)}
          className="fixed bottom-20 md:bottom-8 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white shadow-2xl accent-gradient-btn border border-white/20 hover:scale-105 transition"
        >
          <Cpu className="w-4 h-4" />
          <span>Interactive Simulator</span>
        </button>
      )}

      {/* Simulator Drawer Panel */}
      <SimulatorDrawer 
        isOpen={isSimulatorOpen} 
        onClose={() => setIsSimulatorOpen(false)} 
      />
      <OtpEntryOverlay />
    </div>
  );
};

export const App: React.FC = () => {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading) window.dispatchEvent(new Event('vault-mounted'));
  }, [loading]);

  if (loading) {
    return <div className="sv-auth-scene"><div className="sv-auth-spinner" aria-label="Loading sign-in" /></div>;
  }
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <PasswordChangePage onComplete={() => undefined} />;
  return <SecureVaultDashboard onSignOut={() => void logout()} />;
};

export default App;
