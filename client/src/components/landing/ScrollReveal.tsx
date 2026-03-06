import { useEffect, useRef, ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
}

export function useScrollReveal() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.07, rootMargin: "0px 0px -24px 0px" }
    );

    document.querySelectorAll(".rv").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
