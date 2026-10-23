import HeroSequence from "@/components/HeroSequence";
import MenuPreview from "@/components/MenuPreview";
import VegetarianStory from "@/components/VegetarianStory";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative w-full min-h-screen bg-[#17130F] text-[#F6F0E5] selection:bg-[#FFBA12] selection:text-[#17130F]">
      
      {/* 
        1. Hero Image-Sequence Animation Layer:
        - Stays as background layer (z-0)
        - Scroll container height 400vh
        - Responsive desktop/mobile sequence loading
      */}
      <div className="relative z-0">
        <HeroSequence />
      </div>

      {/* 
        Foreground Brand Experience Content:
        - Stacks cleanly over/after the hero (z-10) with opaque solid backgrounds
        - Cleaned landing page flow:
          1. Hero (Desktop/Mobile Sequence)
          2. Pick Your Craving — Menu Preview
          3. Vegetarian Brand Story (100% Vegetarian. Full-On Flavour.)
          4. Footer
      */}
      <main className="relative z-10 w-full shadow-2xl">
        {/* Pick Your Craving: Food Menu Preview */}
        <MenuPreview />

        {/* Vegetarian Brand Story */}
        <VegetarianStory />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
