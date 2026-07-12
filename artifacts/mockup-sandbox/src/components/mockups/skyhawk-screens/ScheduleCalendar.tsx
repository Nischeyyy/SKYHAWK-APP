import React from 'react';
import { ChevronLeft, ChevronRight, Home, Calendar as CalendarIcon, Clock, MessageSquare, User } from 'lucide-react';

export function ScheduleCalendar() {
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Generating July 2026 calendar days
  // July 1, 2026 is a Wednesday
  const blankDays = 3;
  const daysInMonth = 31;
  const today = 12;
  const shiftDays = [8, 15, 19, 22, 26];
  const selectedDay = 15;

  const calendarDays = [];
  for (let i = 0; i < blankDays; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div 
      className="relative mx-auto overflow-hidden text-white"
      style={{
        width: 390,
        height: 844,
        backgroundColor: '#08101D',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Status Bar Mock */}
      <div className="flex justify-between items-center px-6 pt-4 pb-2 text-[15px] font-semibold">
        <div>9:41</div>
        <div className="flex gap-2 items-center">
          <div className="w-4 h-4 rounded-full border border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="w-4 h-4 rounded-full border border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="w-6 h-3 rounded-sm border border-white flex items-center p-[1px]">
            <div className="bg-white h-full w-[80%] rounded-sm"></div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <h1 className="text-[32px] font-bold leading-none tracking-tight">Schedule</h1>
          <div className="flex p-1 rounded-xl bg-[#0E1830] border border-white/10 text-[13px] font-medium">
            <button className="px-4 py-1.5 rounded-lg text-white/55">List</button>
            <button className="px-4 py-1.5 rounded-lg bg-[#142242] text-white shadow-sm">Cal</button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6 px-2">
          <button className="text-white/55 hover:text-white p-2">
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="text-[17px] font-semibold">July 2026</div>
          <button className="text-white/55 hover:text-white p-2">
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="mb-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-3 text-center">
            {daysOfWeek.map((day, idx) => (
              <div key={idx} className="text-[13px] font-medium text-white/55">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-2">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`blank-${idx}`} className="h-[52px]"></div>;
              }

              const isToday = day === today;
              const isSelected = day === selectedDay;
              const hasShift = shiftDays.includes(day);

              let buttonClasses = "relative w-10 h-10 mx-auto flex items-center justify-center rounded-full text-[17px] font-medium transition-colors";
              
              if (isSelected) {
                buttonClasses += " bg-white text-[#08101D]";
              } else if (isToday) {
                buttonClasses += " bg-[#2F6BFF] text-white";
              } else {
                buttonClasses += " text-white hover:bg-white/10";
              }

              return (
                <div key={day} className="h-[52px] flex flex-col items-center justify-start">
                  <button className={buttonClasses}>
                    {day}
                  </button>
                  {/* Shift Dot */}
                  <div className="h-2 flex items-center mt-1">
                    {hasShift && !isSelected && !isToday && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]"></div>
                    )}
                    {hasShift && isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#08101D] opacity-30 mt-[-18px] absolute"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Panel */}
        <div 
          className="rounded-[20px] p-5"
          style={{ backgroundColor: '#0E1830', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-[12px] font-bold text-[#2F6BFF] tracking-wider mb-4">
            SATURDAY, JULY 15
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[16px] font-semibold text-white mb-1">
                6:00 PM – 2:00 AM
              </div>
              <div className="text-[14px] text-white/80 font-medium mb-1">
                Scotiabank Arena
              </div>
              <div className="text-[14px] text-white/55">
                Event Security
              </div>
            </div>
            <div className="px-3 py-1 rounded-full text-[12px] font-bold text-white bg-[#30D158]/20 border border-[#30D158]/30 text-[#30D158]">
              Ready
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[342px]">
        <div className="backdrop-blur-xl bg-[#142242]/80 border border-white/10 rounded-[28px] p-2 flex justify-between items-center shadow-2xl">
          <NavIcon icon={<Home size={22} />} label="Home" />
          <NavIcon icon={<CalendarIcon size={22} />} label="Schedule" isActive />
          <NavIcon icon={<Clock size={22} />} label="Time" />
          <NavIcon icon={<MessageSquare size={22} />} label="Messages" />
          <NavIcon icon={<User size={22} />} label="Profile" />
        </div>
      </div>
    </div>
  );
}

function NavIcon({ icon, label, isActive = false }) {
  return (
    <button className={`w-[60px] h-[52px] flex flex-col items-center justify-center gap-1 rounded-3xl relative transition-all ${isActive ? 'text-white' : 'text-white/55 hover:text-white/80'}`}>
      {icon}
      {isActive && (
        <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#2F6BFF]"></div>
      )}
    </button>
  );
}
