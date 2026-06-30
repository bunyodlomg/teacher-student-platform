"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * GSAP-powered scroll reveal. Children marked with `data-reveal` fade and
 * rise into view, staggered, as the container scrolls into the viewport.
 * Falls back gracefully when reduced-motion is requested.
 */
export function GsapReveal({
  children,
  className,
  y = 26,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  stagger?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (gsap.matchMedia) {
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
          if (!targets.length) return;
          gsap.from(targets, {
            opacity: 0,
            y,
            duration: 0.8,
            ease: "power3.out",
            stagger,
            scrollTrigger: {
              trigger: scope.current,
              start: "top 82%",
              once: true,
            },
          });
        });
        return () => mm.revert();
      }
    },
    { scope }
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
