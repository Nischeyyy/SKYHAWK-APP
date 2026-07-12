import React from 'react';
import { Shield, Heart, Leaf, Wine, User, CreditCard, Home, Calendar, Wallet, Menu, QrCode } from 'lucide-react';

export function WalletCredentials() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-black/80 p-4 font-sans">
      <div 
        className="relative w-[390px] h-[844px] overflow-hidden rounded-[40px] shadow-2xl ring-1 ring-white/10"
        style={{ backgroundColor: '#08101D', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        {/* Status Bar Space */}
        <div className="h-12 w-full flex justify-between items-center px-6 pt-2 z-50">
          <span className="text-white font-medium text-[15px]">9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-[18px] h-3 border border-white rounded-[3px] p-[1px] relative">
              <div className="bg-white h-full w-[80%] rounded-[1.5px]"></div>
              <div className="absolute right-[-3px] top-[3px] w-[2px] h-[4px] bg-white rounded-r-[1px]"></div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pb-32 px-5 scrollbar-hide">
          {/* Header */}
          <div className="mt-4 mb-6">
            <h1 className="text-white text-[32px] font-bold tracking-tight">Wallet</h1>
          </div>

          {/* Identity Card */}
          <div 
            className="rounded-[24px] p-5 mb-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0E1830 0%, #142242 50%, #1a2d5a 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}
          >
            {/* Top Row */}
            <div className="flex justify-between items-center mb-5">
              <span className="text-white text-[10px] font-bold tracking-widest opacity-80 uppercase">Skyhawk Security</span>
              <Shield className="w-4 h-4 text-white opacity-80" />
            </div>

            {/* Profile Section */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-[52px] h-[52px] rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
                <User className="w-6 h-6 text-white/50" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-white text-[22px] font-bold leading-tight mb-0.5">Marcus Vance</h2>
                    <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Security Guard</p>
                    <p className="text-[12px] mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.55)' }}>SH-2041</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#30D158]/10 border border-[#30D158]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#30D158]"></div>
                    <span className="text-[#30D158] text-[11px] font-medium uppercase tracking-wider">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] w-full bg-white/10 mb-4"></div>

            {/* Bottom Row */}
            <div className="flex justify-between items-end">
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Licence</p>
                  <p className="text-white font-mono text-[14px]">SG-ON-89442</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Expires</p>
                  <p className="text-white text-[14px]">Aug 22, 2026</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
                <QrCode className="w-full h-full text-[#08101D]" />
              </div>
            </div>
          </div>

          {/* Credentials Section */}
          <div className="flex items-center gap-2 mb-4 px-1">
            <h3 className="text-white text-[17px] font-semibold">Credentials</h3>
            <span className="bg-white/10 text-white/70 text-[11px] font-bold px-2 py-0.5 rounded-full">4</span>
          </div>

          {/* Credential Cards */}
          <div className="flex flex-col gap-3">
            {/* Ontario Security Licence */}
            <div className="bg-[#0E1830] rounded-[16px] p-4 flex items-center gap-4 border border-white/[0.06]">
              <div className="w-10 h-10 rounded-full bg-[#2F6BFF]/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-[#2F6BFF]" />
              </div>
              <div className="flex-1">
                <h4 className="text-white text-[15px] font-medium mb-0.5">Ontario Security Licence</h4>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Mandatory</p>
              </div>
              <div className="text-right">
                <span className="text-[#FF9F0A] text-[12px] font-medium block mb-0.5">Expires soon</span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Aug 22, 2026</span>
              </div>
            </div>

            {/* First Aid Certificate */}
            <div className="bg-[#0E1830] rounded-[16px] p-4 flex items-center gap-4 border border-white/[0.06]">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <h4 className="text-white text-[15px] font-medium mb-0.5">First Aid Certificate</h4>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Level C + CPR</p>
              </div>
              <div className="text-right">
                <span className="text-[#30D158] text-[12px] font-medium block mb-0.5">Valid</span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Jan 15, 2027</span>
              </div>
            </div>

            {/* WHMIS 2018 */}
            <div className="bg-[#0E1830] rounded-[16px] p-4 flex items-center gap-4 border border-white/[0.06]">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <Leaf className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <h4 className="text-white text-[15px] font-medium mb-0.5">WHMIS 2018</h4>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Online Training</p>
              </div>
              <div className="text-right">
                <span className="text-[#30D158] text-[12px] font-medium block mb-0.5">Valid</span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>No expiry</span>
              </div>
            </div>

            {/* Smart Serve */}
            <div className="bg-[#0E1830] rounded-[16px] p-4 flex items-center gap-4 border border-white/[0.06]">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <Wine className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <h4 className="text-white text-[15px] font-medium mb-0.5">Smart Serve</h4>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>AGCO Certified</p>
              </div>
              <div className="text-right">
                <span className="text-[#30D158] text-[12px] font-medium block mb-0.5">Valid</span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Oct 04, 2028</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-8 left-0 right-0 px-6 z-10 flex justify-center">
          <div 
            className="flex items-center justify-between px-6 py-4 rounded-full w-full max-w-[320px] backdrop-blur-xl"
            style={{ 
              backgroundColor: 'rgba(14, 24, 48, 0.7)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div className="flex flex-col items-center gap-1 opacity-50">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col items-center gap-1 relative">
              <Wallet className="w-6 h-6 text-[#2F6BFF]" />
              <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-[#2F6BFF]"></div>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <Menu className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        {/* Safe Area Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#08101D] to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
