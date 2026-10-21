"use client";

import { useEffect } from "react";

// On phones the category list is a sideways-scrolling row; bring the current
// board's chip into view so visitors can see where they are.
export default function RevealActiveCategory() {
  useEffect(() => {
    const active = document.querySelector<HTMLElement>('nav[data-category-nav] [aria-current="page"]');
    const row = active?.closest<HTMLElement>("nav[data-category-nav]");
    if (!active || !row || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = active.offsetLeft - row.clientWidth / 2 + active.offsetWidth / 2;
  }, []);
  return null;
}
