import { useState, useEffect } from 'react';

const ScrollToTopFAB = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 300);
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-8 right-8 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all z-50 focus:outline-none hover:scale-105 active:scale-95"
      title="上に戻る"
    >
      <span className="material-icons">arrow_upward</span>
    </button>
  );
};

export default ScrollToTopFAB;
