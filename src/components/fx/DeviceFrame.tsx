/**
 * CSS-only device bezels. The screen slot is positioned, so a `fill` Image drops straight in.
 * Proportions are eyeballed from a Galaxy S, an iPad Pro and a MacBook Air, not measured.
 */
export default function DeviceFrame({
  kind,
  children,
}: {
  kind: "phone" | "tablet" | "laptop";
  children: React.ReactNode;
}) {
  if (kind === "phone") {
    return (
      <div className="relative rounded-[2.2rem] border border-white/15 bg-[#050608] p-[5px]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.9rem] bg-bg-elevated">
          {children}
        </div>
        {/* volume rocker on the left, power key on the right */}
        <span aria-hidden className="absolute -left-[3px] top-[17%] h-[7%] w-[3px] rounded-l-sm bg-[#3a3d46]" />
        <span aria-hidden className="absolute -left-[3px] top-[26%] h-[7%] w-[3px] rounded-l-sm bg-[#3a3d46]" />
        <span aria-hidden className="absolute -right-[3px] top-[22%] h-[10%] w-[3px] rounded-r-sm bg-[#3a3d46]" />
      </div>
    );
  }

  if (kind === "tablet") {
    return (
      <div className="relative rounded-[1.6rem] border border-white/15 bg-[#050608] p-[3%]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-bg-elevated">
          {children}
        </div>
        {/* front camera sits on the long edge, iPad Pro style */}
        <span aria-hidden className="absolute left-1/2 top-[1.2%] size-[5px] -translate-x-1/2 rounded-full bg-[#1f2128] ring-1 ring-white/10" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative mx-[5%] rounded-t-[0.9rem] border border-b-0 border-white/15 bg-[#050608] px-[1.6%] pt-[1.6%] pb-[2%]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] bg-bg-elevated">
          {children}
        </div>
        {/* the notch; painted after the screen so it sits on top */}
        <span aria-hidden className="absolute left-1/2 top-0 h-[7px] w-[9%] -translate-x-1/2 rounded-b-md bg-[#050608]" />
      </div>
      <div aria-hidden className="h-[9px] rounded-b-[0.6rem] border border-white/15 bg-gradient-to-b from-[#3a3d46] to-[#1c1e25]">
        <span className="mx-auto block h-[3px] w-[14%] rounded-b-md bg-black/50" />
      </div>
    </div>
  );
}
