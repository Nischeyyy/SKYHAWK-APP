import React from 'react';
import { Bell, Siren, Phone, FileText, Megaphone, Home, Calendar, LayoutGrid, Wallet, User } from 'lucide-react';

export function HomeToday() {
  return (
    <div
      className="relative w-[390px] h-[844px] overflow-hidden rounded-[40px] border-[8px] border-[#0E1830] shadow-2xl"
      style={{ backgroundColor: '#08101D', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Scrollable Content */}
      <div className="h-full overflow-y-auto pb-[100px] scrollbar-hide">
        {/* Header */}
        <div className="px-6 pt-16 pb-6 flex justify-between items-end">
          <div>
            <p className="text-[rgba(255,255,255,0.55)] text-[15px] font-medium tracking-wide">Good morning</p>
            <h1 className="text-[#FFFFFF] text-[36px] font-bold leading-tight mt-1">Marcus</h1>
          </div>
          <button className="w-12 h-12 rounded-full bg-[#0E1830] flex items-center justify-center border border-[rgba(255,255,255,0.08)] relative">
            <Bell size={24} color="#FFFFFF" strokeWidth={1.5} />
            <div className="absolute top-[12px] right-[14px] w-[8px] h-[8px] bg-[#2F6BFF] rounded-full border-2 border-[#0E1830]"></div>
          </button>
        </div>

        {/* Hero Shift Card */}
        <div className="px-6 mb-6">
          <div className="rounded-[24px] bg-gradient-to-br from-[#0E1830] to-[#142242] border border-[rgba(255,255,255,0.08)] p-6 shadow-lg relative overflow-hidden">
            {/* Background blur decorative element */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#2F6BFF] rounded-full opacity-10 blur-3xl pointer-events-none"></div>
            
            <p className="text-[#2F6BFF] text-[11px] font-bold uppercase tracking-[0.1em] mb-4">
              Today's Assignment
            </p>
            
            <div className="mb-8">
              <h2 className="text-[#FFFFFF] text-[22px] font-semibold mb-1">Toronto Financial Tower</h2>
              <p className="text-[rgba(255,255,255,0.55)] text-[15px]">Concierge Security</p>
            </div>
            
            <div className="mb-8">
              <p className="text-[#FFFFFF] text-[28px] font-medium tracking-tight">2:00 PM <span className="text-[rgba(255,255,255,0.3)] mx-1">–</span> 10:00 PM</p>
            </div>
            
            <button className="w-full h-[56px] rounded-[16px] bg-[#2F6BFF] text-[#FFFFFF] text-[17px] font-semibold flex items-center justify-center hover:bg-blue-600 active:scale-[0.98] transition-all">
              Clock In
            </button>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="px-6 mb-8 flex gap-3">
          <button className="flex-1 bg-[#142242] border border-[rgba(255,255,255,0.08)] rounded-[20px] py-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden active:scale-[0.96] transition-transform">
            <div className="absolute inset-0 bg-[#FF9F0A] opacity-5 mix-blend-screen pointer-events-none"></div>
            <Siren size={24} color="#FF9F0A" strokeWidth={1.5} />
            <span className="text-[#FFFFFF] text-[13px] font-medium">SOS</span>
          </button>
          
          <button className="flex-1 bg-[#142242] border border-[rgba(255,255,255,0.08)] rounded-[20px] py-4 flex flex-col items-center justify-center gap-2 active:scale-[0.96] transition-transform">
            <Phone size={24} color="#FFFFFF" strokeWidth={1.5} className="opacity-80" />
            <span className="text-[#FFFFFF] text-[13px] font-medium">Dispatch</span>
          </button>
          
          <button className="flex-1 bg-[#142242] border border-[rgba(255,255,255,0.08)] rounded-[20px] py-4 flex flex-col items-center justify-center gap-2 active:scale-[0.96] transition-transform">
            <FileText size={24} color="#FFFFFF" strokeWidth={1.5} className="opacity-80" />
            <span className="text-[#FFFFFF] text-[13px] font-medium">Report</span>
          </button>
        </div>

        {/* Status Card */}
        <div className="px-6 mb-8">
          <div className="bg-[#0E1830] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[#FFFFFF] text-[15px] font-medium">Shift starts in 1h 45m</span>
              <span className="text-[rgba(255,255,255,0.55)] text-[13px]">12:15 PM</span>
            </div>
            <div className="h-[6px] w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
              <div className="h-full bg-[#2F6BFF] rounded-full w-[35%]"></div>
            </div>
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="px-6 mb-8">
          <h3 className="text-[#FFFFFF] text-[18px] font-semibold mb-4">Announcements</h3>
          <div className="bg-[#0E1830] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-5 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(47,107,255,0.15)] flex items-center justify-center shrink-0">
              <Megaphone size={20} color="#2F6BFF" />
            </div>
            <div>
              <p className="text-[#FFFFFF] text-[15px] font-medium mb-1">New guest check-in protocol</p>
              <p className="text-[rgba(255,255,255,0.55)] text-[13px] leading-relaxed line-clamp-2">
                Starting today, all visitors must register their vehicles at the lobby desk before proceeding.
              </p>
              <p className="text-[rgba(255,255,255,0.4)] text-[11px] mt-2 font-medium uppercase tracking-wider">2 hrs ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Navigation Bar */}
      <div className="absolute bottom-8 left-0 right-0 px-6 pointer-events-none">
        <div 
          className="bg-[rgba(14,24,48,0.85)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-full h-[68px] flex items-center justify-between px-6 pointer-events-auto shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
        >
          {/* Home - Active */}
          <button className="flex flex-col items-center justify-center gap-1 w-12 relative h-full">
            <Home size={24} color="#2F6BFF" strokeWidth={2} />
            <div className="w-[4px] h-[4px] rounded-full bg-[#2F6BFF] absolute bottom-2"></div>
          </button>
          
          <button className="flex flex-col items-center justify-center gap-1 w-12 h-full">
            <Calendar size={24} color="#FFFFFF" strokeWidth={1.5} className="opacity-50" />
          </button>
          
          <button className="flex flex-col items-center justify-center gap-1 w-12 h-full">
            <LayoutGrid size={24} color="#FFFFFF" strokeWidth={1.5} className="opacity-50" />
          </button>
          
          <button className="flex flex-col items-center justify-center gap-1 w-12 h-full">
            <Wallet size={24} color="#FFFFFF" strokeWidth={1.5} className="opacity-50" />
          </button>
          
          <button className="flex flex-col items-center justify-center gap-1 w-12 h-full">
            <User size={24} color="#FFFFFF" strokeWidth={1.5} className="opacity-50" />
          </button>
        </div>
      </div>
    </div>
  );
}
