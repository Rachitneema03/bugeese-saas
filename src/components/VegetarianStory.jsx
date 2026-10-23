import Image from "next/image";

export default function VegetarianStory() {
  return (
    <section id="vegetarian-story" className="relative z-10 w-full bg-[#17130F] text-[#F6F0E5] px-4 py-24 sm:px-8 sm:py-32 overflow-hidden border-t border-[#FFBA12]/20">
      {/* Background Accent Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#D9251B]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#FFBA12]/15 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Vegetarian Badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className="flex items-center justify-center w-7 h-7 rounded-sm border-2 border-[#10b981] p-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              </span>
              <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-[#FFBA12]">
                100% Pure Vegetarian Franchise
              </span>
            </div>

            <h2 className="font-condensed text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white leading-[0.95] mb-6">
              100% Vegetarian.{" "}
              <span className="text-[#FFBA12] block sm:inline">Full-On Flavour.</span>
            </h2>

            <p className="text-lg sm:text-xl text-[#F6F0E5]/80 font-medium leading-relaxed mb-8 max-w-2xl">
              Big cravings. Bold flavours. A vegetarian experience made for everyone who loves a great bite. 
              Founded by a 5-star hotel trained chef in Jabalpur, Bugeese proves that pure vegetarian fast-casual food can be hearty, unapologetically gourmet, and loaded with character.
            </p>

            {/* Core Brand Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/10">
              <div>
                <span className="font-condensed text-3xl font-black text-[#D9251B] block">01</span>
                <h4 className="text-base font-bold text-white uppercase mt-1">Zero Compromise</h4>
                <p className="text-xs text-[#F6F0E5]/70 mt-1">No meat substitutes needed. Real paneer, fresh potatoes & premium spices.</p>
              </div>
              <div>
                <span className="font-condensed text-3xl font-black text-[#FFBA12] block">02</span>
                <h4 className="text-base font-bold text-white uppercase mt-1">Chef-Crafted</h4>
                <p className="text-xs text-[#F6F0E5]/70 mt-1">Custom house relishes, toasted sesame buns, and artisan toasted paninis.</p>
              </div>
              <div>
                <span className="font-condensed text-3xl font-black text-white block">03</span>
                <h4 className="text-base font-bold text-white uppercase mt-1">Freshly Melted</h4>
                <p className="text-xs text-[#F6F0E5]/70 mt-1">Layered hot per order with molten cheese sauces and crunchy crisps.</p>
              </div>
            </div>
          </div>

          {/* Right Image/Visual Presentation */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none aspect-4/5 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src="/food/story.jpg"
                alt="Bugeese vegetarian burger being assembled with fresh ingredients"
                fill
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 p-6 rounded-2xl bg-[#17130F]/90 backdrop-blur-md border border-white/10">
                <p className="text-xs uppercase tracking-widest text-[#FFBA12] font-black">Crafted with Pride</p>
                <p className="text-base font-bold text-white mt-1">
                  &ldquo;Pure veg isn&apos;t a limitation — it&apos;s our greatest creative inspiration.&rdquo;
                </p>
                <p className="text-xs text-[#F6F0E5]/60 mt-1">Chef-Led Vegetarian Kitchens</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
