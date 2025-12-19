import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import LogoBanner from "@/components/home/LogoBanner";
import ToolPreviews from "@/components/home/ToolPreviews";
import Testimonials from "@/components/home/Testimonials";
import FeaturesSection from "@/components/home/FeaturesSection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <LogoBanner />
        <ToolPreviews />
        <Testimonials />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;