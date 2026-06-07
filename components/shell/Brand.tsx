import Image from "next/image";

export function Brand({ subtitle = "Slot recovery OS" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-[72px] w-[72px] rounded-[16px] bg-white/95 flex items-center justify-center overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_4px_14px_rgba(0,0,0,0.18)]">
        <Image
          src="/logo.png"
          alt="OpenSlot AI"
          width={64}
          height={64}
          className="object-contain"
          priority
        />
      </div>
      <div>
        <div className="text-[16px] font-[700] tracking-tight leading-none">OpenSlot AI</div>
        <div className="text-[11px] text-violet-100/70 leading-none mt-1.5">{subtitle}</div>
      </div>
    </div>
  );
}
