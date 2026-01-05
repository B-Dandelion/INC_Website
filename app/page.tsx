import Hero from "@/components/home/Hero";
import QuickLinks from "@/components/home/QuickLinks";
import LatestSection from "@/components/home/LatestSection";
import Highlights from "@/components/home/Highlights";
import Partners from "@/components/home/Partners";
import ContactSection from "@/components/home/ContactSection";
import { contactInfo } from "@/lib/homeData";

import {
  quickLinks,
  latestNotices,
  latestResources,
  latestEvent,
  highlights,
  partners,
} from "@/lib/homeData";

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickLinks items={quickLinks} />
      <LatestSection notices={latestNotices} resources={latestResources} event={latestEvent} />
      <Highlights items={highlights} />
      <Partners items={partners} />
      <ContactSection info={contactInfo} />
    </>
  );
}