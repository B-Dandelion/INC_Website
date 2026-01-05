import Hero from "@/components/home/Hero";
import QuickLinks from "@/components/home/QuickLinks";
import LatestSection from "@/components/home/LatestSection";
import { quickLinks, latestNotices, latestResources, latestEvent } from "@/lib/homeData";

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickLinks items={quickLinks} />
      <LatestSection notices={latestNotices} resources={latestResources} event={latestEvent} />
    </>
  );
}