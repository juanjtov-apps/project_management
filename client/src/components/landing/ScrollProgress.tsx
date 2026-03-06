import { useState, useEffect } from "react";

export function ScrollProgress() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handler = () => {
      const scrollH = document.body.scrollHeight - window.innerHeight;
      if (scrollH > 0) {
        setWidth((window.scrollY / scrollH) * 100);
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return <div className="landing-progress-bar" style={{ width: `${width}%` }} />;
}
