'use client';

import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Mark component as loaded after mount
    setIsLoaded(true);

    // Hide splash screen after delay
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000); // Show for 3 seconds total

    return () => clearTimeout(timer);
  }, []);

  // Don't render on server
  if (!isLoaded) return null;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950"
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{
                scale: 1.5,
                opacity: 0,
                rotate: 15,
                y: -50,
                transition: {
                  duration: 0.5,
                  ease: [0.6, 0.01, 0.05, 0.95]
                }
              }}
              transition={{
                duration: 0.6,
                ease: 'easeOut'
              }}
              className="relative"
            >
              {/* DotLottie Animation */}
              <div className="h-64 w-64">
                <DotLottieReact
                  src="/animations/rooster.lottie"
                  loop
                  autoplay
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{
                y: -20,
                opacity: 0,
                scale: 0.8,
                transition: {
                  duration: 0.3,
                  delay: 0
                }
              }}
              transition={{
                delay: 0.3,
                duration: 0.5
              }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-orange-600 dark:text-orange-400">Cocorico</h1>
              <p className="mt-2 text-sm text-orange-600/70 dark:text-orange-400/70">
                Restaurant Inventory Management
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
