"use client";

import { NavList } from "./NavLinks";

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 h-[100dvh] sticky top-0 bg-violet text-white">
      <div className="pt-6">
        <NavList />
      </div>

      <div className="px-4 pb-4 pt-3 border-t border-white/10">
        <div className="rounded-card bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-peacock to-vert text-white flex items-center justify-center font-[700] text-[12px]">
              CO
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-[600] truncate">Çağan Oflazoğlu</div>
              <div className="text-[11px] text-violet-100/60 truncate">Operations · Owner</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
