import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ·→$-";

function SplitFlapChar({ targetChar, size = "large" }: { targetChar: string; size?: "large" | "small" }) {
  const [currentChar, setCurrentChar] = useState(" ");
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (currentChar === targetChar) return;

    setIsFlipping(true);
    let iterations = 0;
    const maxIterations = 10 + Math.floor(Math.random() * 5); // 10-15 random flips
    let interval: NodeJS.Timeout;

    const tick = () => {
      iterations++;
      if (iterations >= maxIterations) {
        setCurrentChar(targetChar);
        setIsFlipping(false);
        clearInterval(interval);
      } else {
        const randomChar = CHARS[Math.floor(Math.random() * CHARS.length)];
        setCurrentChar(randomChar);
      }
    };

    interval = setInterval(tick, 50);

    return () => clearInterval(interval);
  }, [targetChar]); // Only run when targetChar changes

  // If it's a space and not flipping, we can just show an empty spacer to keep it clean, but for solari boards spaces often have the tile anyway.
  const isSpace = targetChar === " " && !isFlipping;

  const w = size === "large" ? "w-8" : "w-5 sm:w-6";
  const h = size === "large" ? "h-11" : "h-7 sm:h-8";
  const text = size === "large" ? "text-xl" : "text-xs sm:text-sm";

  return (
    <div
      className={`relative flex items-center justify-center ${w} ${h} rounded-[2px] overflow-hidden ${
        isSpace ? "bg-transparent" : "bg-[#1A1200] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
      }`}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: "#D4A855",
        boxShadow: isSpace ? "none" : "inset 0 1px 2px rgba(255,255,255,0.05), inset 0 -1px 2px rgba(0,0,0,0.5)"
      }}
    >
      {!isSpace && (
        <>
          {/* Scanline overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{ backgroundImage: "linear-gradient(rgba(212, 168, 85, 0.1) 1px, transparent 1px)", backgroundSize: "100% 2px" }}
          />
          {/* Fold line */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#D4A855] opacity-20 -translate-y-1/2 z-10" />
          
          <span className={`relative z-0 leading-none ${text} ${isFlipping ? 'blur-[0.5px]' : ''}`}>
            {currentChar}
          </span>
        </>
      )}
    </div>
  );
}

function SplitFlapWord({ text, size = "large" }: { text: string; size?: "large" | "small" }) {
  return (
    <div className="flex gap-[2px]">
      {text.split("").map((char, i) => (
        <SplitFlapChar key={i} targetChar={char.toUpperCase()} size={size} />
      ))}
    </div>
  );
}

function Magnetic({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouse = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.2);
    y.set(middleY * 0.2);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const PHRASES = ["ANYTHING.  ", "EVERYTHING.", "YOUR WORLD."];

const ROUTES = [
  { id: 1, route: "BAKU → ISTANBUL", date: "JUL 15", carrier: "@TRAVELLER_K", status: "BOARDING" },
  { id: 2, route: "LONDON → PARIS ", date: "JUL 18", carrier: "@PIERRE_F   ", status: "ON TIME " },
  { id: 3, route: "DUBAI → TBILISI", date: "AUG 01", carrier: "@NOMAD_SARA ", status: "OPEN    " },
  { id: 4, route: "TORONTO → LAGOS", date: "AUG 05", carrier: "@MAK_TRAVELS", status: "OPEN    " },
  { id: 5, route: "AMSTERDAM → BCN", date: "AUG 12", carrier: "@JAN_WANDERS", status: "OPEN    " },
  { id: 6, route: "SINGAPORE → SYD", date: "AUG 20", carrier: "@ASH_FLIES  ", status: "OPEN    " },
];

const STATUSES = ["ON TIME ", "BOARDING", "DELAYED ", "OPEN    ", "CLOSED  ", "DEPARTED"];

export function Landing() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [routes, setRoutes] = useState(ROUTES);

  // Phrase cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    }, 4000); // slightly longer to allow flip to finish
    return () => clearInterval(interval);
  }, []);

  // Board random updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRoutes(current => {
        const next = [...current];
        const randomRow = Math.floor(Math.random() * next.length);
        const randomStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
        next[randomRow] = { ...next[randomRow], status: randomStatus };
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Aurora cursor
  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      if (!cursorRef.current) return;
      // Use requestAnimationFrame for smooth performance
      requestAnimationFrame(() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
        }
      });
    };
    window.addEventListener("mousemove", updateCursor);
    return () => window.removeEventListener("mousemove", updateCursor);
  }, []);

  return (
    <div className="min-h-screen bg-[#0E0B08] text-[#F4EDE4] font-['DM_Sans',sans-serif] overflow-x-hidden selection:bg-[#C8956A] selection:text-[#0E0B08]">
      
      {/* Aurora Cursor */}
      <div 
        ref={cursorRef}
        className="fixed top-0 left-0 w-[600px] h-[600px] pointer-events-none z-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(200, 149, 106, 0.08) 0%, transparent 60%)",
          willChange: "transform"
        }}
      />

      <div className="relative z-10">
        {/* Navigation / Header */}
        <header className="absolute top-0 w-full p-6 md:p-12 flex justify-between items-center z-50">
          <div className="flex items-center gap-3 text-[#C8956A] font-['JetBrains_Mono'] tracking-wider text-sm">
            <div className="w-2 h-2 rounded-full bg-[#C8956A] animate-pulse" />
            TRAVEL COURIERS
          </div>
          <div className="flex items-center gap-6 font-['JetBrains_Mono'] text-xs text-[#8C7B68]">
            <a href="#how" className="hover:text-[#D4A855] transition-colors">HOW IT WORKS</a>
            <a href="#routes" className="hover:text-[#D4A855] transition-colors">LIVE ROUTES</a>
            <button className="px-4 py-2 border border-[#8C7B68]/30 hover:border-[#D4A855] hover:text-[#D4A855] rounded-sm transition-all text-[#F4EDE4]">
              LOGIN
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col xl:flex-row items-center pt-32 pb-20 px-6 md:px-12 xl:px-20 gap-16 xl:gap-8 max-w-[1800px] mx-auto">
          
          {/* Left Column - Copy */}
          <div className="w-full xl:w-[55%] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
              <p className="font-['JetBrains_Mono'] text-[11px] tracking-[0.2em] text-[#8C7B68]">PEER-TO-PEER COURIER NETWORK</p>
            </div>
            
            <h1 className="font-['DM_Serif_Display'] leading-[0.9] tracking-tight mb-8">
              <Magnetic>
                <div className="text-[clamp(4rem,8vw,10rem)] text-[#F4EDE4]">
                  YOUR NEXT TRIP
                </div>
              </Magnetic>
              <Magnetic>
                <div 
                  className="text-[clamp(4rem,8vw,10rem)]"
                  style={{ WebkitTextStroke: "1px #C8956A", color: "transparent" }}
                >
                  CARRIES
                </div>
              </Magnetic>
              <Magnetic>
                <div className="text-[clamp(4rem,8vw,10rem)] text-[#C8956A]">
                  MORE.
                </div>
              </Magnetic>
            </h1>

            <div className="h-16 mb-12 flex items-center">
              <SplitFlapWord text={PHRASES[phraseIndex]} size="large" />
            </div>

            <div className="flex flex-wrap items-center gap-6 mb-16">
              <Magnetic>
                <button className="px-8 py-4 bg-[#C8956A] text-[#0E0B08] font-['JetBrains_Mono'] font-bold tracking-widest text-sm hover:bg-[#D4A855] transition-colors rounded-sm shadow-[0_0_20px_rgba(200,149,106,0.2)] hover:shadow-[0_0_30px_rgba(200,149,106,0.4)]">
                  EXPLORE ROUTES
                </button>
              </Magnetic>
              <Magnetic>
                <button className="px-8 py-4 bg-transparent border border-[#C8956A]/50 text-[#C8956A] font-['JetBrains_Mono'] font-bold tracking-widest text-sm hover:bg-[#C8956A]/10 transition-colors rounded-sm">
                  POST A TRIP
                </button>
              </Magnetic>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-['JetBrains_Mono'] text-xs text-[#8C7B68] tracking-wider">
              <span>1,240 ACTIVE COURIERS</span>
              <span className="text-[#C8956A]">·</span>
              <span>86 COUNTRIES</span>
              <span className="text-[#C8956A]">·</span>
              <span>$2.4M DELIVERED</span>
            </div>
          </div>

          {/* Right Column - Board */}
          <div className="w-full xl:w-[45%] flex justify-center xl:justify-end perspective-1000">
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="w-full max-w-[700px] bg-[#111008] border border-[#D4A855]/20 p-6 md:p-8 rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_3px_rgba(255,255,255,0.05)] relative overflow-hidden"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)"
              }}
            >
              {/* Board Glass Reflection */}
              <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-t-md transform -skew-y-2 origin-top-left" />

              <div className="flex justify-between items-end border-b border-[#D4A855]/20 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                  <h2 className="font-['JetBrains_Mono'] text-lg text-[#F4EDE4] tracking-widest">DEPARTURES</h2>
                </div>
                <div className="font-['JetBrains_Mono'] text-xs text-[#8C7B68] tracking-widest hidden sm:block">
                  LIVE STATUS
                </div>
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-2 mb-2 px-2 font-['JetBrains_Mono'] text-[10px] text-[#8C7B68] tracking-widest">
                <div className="col-span-4">ROUTE</div>
                <div className="col-span-2">DATE</div>
                <div className="col-span-3">CARRIER</div>
                <div className="col-span-3">STATUS</div>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {routes.map((route, idx) => (
                  <div key={route.id} className="grid grid-cols-12 gap-2 bg-black/20 p-2 rounded-sm border border-white/5">
                    <div className="col-span-12 sm:col-span-4 overflow-hidden">
                      <SplitFlapWord text={route.route} size="small" />
                    </div>
                    <div className="col-span-4 sm:col-span-2 hidden sm:block">
                      <SplitFlapWord text={route.date} size="small" />
                    </div>
                    <div className="col-span-4 sm:col-span-3 hidden sm:block">
                      <SplitFlapWord text={route.carrier} size="small" />
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <SplitFlapWord text={route.status} size="small" />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-between items-center text-[10px] font-['JetBrains_Mono'] text-[#8C7B68]">
                <span>SOLARI-TRX SYS. V2.4</span>
                <span>SYNC: OK</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Marquee Strip */}
        <div className="w-full bg-[#111008] border-y border-[#D4A855]/20 py-4 relative overflow-hidden flex items-center">
          {/* Scanline over marquee */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10 z-10"
            style={{ backgroundImage: "linear-gradient(rgba(212, 168, 85, 1) 1px, transparent 1px)", backgroundSize: "100% 3px" }}
          />
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
            className="flex whitespace-nowrap font-['JetBrains_Mono'] text-[#C8956A] text-lg tracking-[0.2em]"
          >
            <span className="pr-8">BAKU → ISTANBUL · LONDON → PARIS · DUBAI → TBILISI · AMSTERDAM → BARCELONA · TORONTO → LAGOS · SINGAPORE → SYDNEY · NAIROBI → CAIRO · TOKYO → SEOUL ·</span>
            <span className="pr-8">BAKU → ISTANBUL · LONDON → PARIS · DUBAI → TBILISI · AMSTERDAM → BARCELONA · TORONTO → LAGOS · SINGAPORE → SYDNEY · NAIROBI → CAIRO · TOKYO → SEOUL ·</span>
          </motion.div>
        </div>

        {/* How It Works Section */}
        <section id="how" className="py-32 px-6 md:px-12 xl:px-20 max-w-[1800px] mx-auto">
          <div className="text-center mb-24">
            <h2 className="font-['DM_Serif_Display'] text-5xl md:text-6xl text-[#F4EDE4] mb-6">How It Works</h2>
            <p className="font-['DM_Sans'] text-[#8C7B68] max-w-2xl mx-auto text-lg">A trusted network of travelers turning empty luggage space into a global logistics solution.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 xl:gap-16">
            {/* Step 1 */}
            <div className="flex flex-col relative group">
              <div className="font-['DM_Serif_Display'] text-[120px] leading-none mb-6 transition-all duration-500 group-hover:-translate-y-4" style={{ WebkitTextStroke: "1px rgba(200, 149, 106, 0.4)", color: "transparent" }}>
                01
              </div>
              <h3 className="font-['DM_Sans'] font-bold text-2xl text-[#F4EDE4] mb-4">Post a Route</h3>
              <p className="text-[#8C7B68] leading-relaxed">
                Traveling soon? List your flight details, available space, and your fee. Or request an item you need brought to you.
              </p>
              <div className="absolute top-16 left-1/2 w-full h-[1px] bg-gradient-to-r from-[#C8956A]/20 to-transparent hidden md:block" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col relative group">
              <div className="font-['DM_Serif_Display'] text-[120px] leading-none mb-6 transition-all duration-500 group-hover:-translate-y-4" style={{ WebkitTextStroke: "1px rgba(200, 149, 106, 0.4)", color: "transparent" }}>
                02
              </div>
              <h3 className="font-['DM_Sans'] font-bold text-2xl text-[#F4EDE4] mb-4">Match & Meet</h3>
              <p className="text-[#8C7B68] leading-relaxed">
                Connect safely. Agree on terms, verify identities through our platform, and hand off the item before departure.
              </p>
              <div className="absolute top-16 left-1/2 w-full h-[1px] bg-gradient-to-r from-[#C8956A]/20 to-transparent hidden md:block" />
            </div>

            {/* Step 3 */}
            <div className="flex flex-col relative group">
              <div className="font-['DM_Serif_Display'] text-[120px] leading-none mb-6 transition-all duration-500 group-hover:-translate-y-4" style={{ WebkitTextStroke: "1px rgba(200, 149, 106, 1)", color: "transparent" }}>
                03
              </div>
              <h3 className="font-['DM_Sans'] font-bold text-2xl text-[#C8956A] mb-4">Deliver & Earn</h3>
              <p className="text-[#8C7B68] leading-relaxed">
                Hand over the package at the destination. Payment is released from escrow automatically upon successful delivery.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-[#111008] text-center">
          <p className="font-['JetBrains_Mono'] text-xs text-[#8C7B68] tracking-widest">
            TRAVEL COURIERS © 2026 · ALL SYSTEMS NOMINAL
          </p>
        </footer>
      </div>
    </div>
  );
}
