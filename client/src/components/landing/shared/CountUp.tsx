import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { usePrefersReducedMotion } from '@/hooks/useGSAP';

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CountUp({
  end,
  duration = 2,
  prefix = '',
  suffix = '',
  className = '',
  style
}: CountUpProps) {
  const countRef = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = countRef.current;
    if (!element || hasAnimated) return;

    // If user prefers reduced motion, show final value immediately
    if (prefersReducedMotion) {
      element.textContent = `${prefix}${end}${suffix}`;
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);

            // Animate the counter
            const counter = { value: 0 };
            gsap.to(counter, {
              value: end,
              duration,
              ease: 'power2.out',
              onUpdate: () => {
                if (countRef.current) {
                  countRef.current.textContent = `${prefix}${Math.round(counter.value)}${suffix}`;
                }
              }
            });

            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [end, duration, prefix, suffix, hasAnimated, prefersReducedMotion]);

  return (
    <span
      ref={countRef}
      className={className}
      style={style}
    >
      {prefix}0{suffix}
    </span>
  );
}
