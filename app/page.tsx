"use client";

import { motion } from "motion/react";
import { Settings, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b12] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"
          animate={{
            x: [0, 80, 20, 0],
            y: [0, 50, 100, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"
          animate={{
            x: [0, -60, -20, 0],
            y: [0, -50, -100, 0],
            scale: [1, 0.95, 1.08, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0b0b12_75%)]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 text-sm font-medium text-white/60"
        >
          <Sparkles className="h-4 w-4 text-violet-300" />
          A social deduction game
        </motion.div>

        <motion.button
          whileHover={{ rotate: 25, scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.2 }}
          className="rounded-full border border-white/10 bg-white/5 p-3 text-white/60 backdrop-blur-xl transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </motion.button>
      </header>

      {/* Main content */}
      <section className="relative z-10 flex min-h-[calc(100vh-100px)] flex-col items-center justify-center px-6 pb-16 text-center">
        {/* Logo / Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
          className="mb-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15,
              duration: 0.6,
            }}
            className="mb-5 text-sm font-medium uppercase tracking-[0.35em] text-violet-300/70"
          >
            Welcome to
          </motion.div>

          <h1 className="text-6xl font-semibold tracking-[-0.06em] sm:text-7xl md:text-8xl">
            Imposter
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-white/45 sm:text-lg">
            One word. One imposter.
            <br />
            <span className="text-white/70">Trust nobody.</span>
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.25,
            duration: 0.6,
            ease: "easeOut",
          }}
          className="flex w-full max-w-sm flex-col gap-3"
        >
          {/* Create Game */}
          <Link href="/create" className="w-full">
            <motion.button
              whileHover={{
                y: -2,
                scale: 1.01,
              }}
              whileTap={{
                scale: 0.98,
              }}
              transition={{
                duration: 0.2,
              }}
              className="h-14 w-full rounded-2xl bg-white px-6 text-base font-semibold text-[#0b0b12] shadow-2xl shadow-white/5 transition-shadow hover:shadow-white/10"
            >
              Create Game
            </motion.button>
          </Link>

          {/* Join Game */}
          <Link href="/join" className="w-full">
            <motion.button
              whileHover={{
                y: -2,
                scale: 1.01,
              }}
              whileTap={{
                scale: 0.98,
              }}
              transition={{
                duration: 0.2,
              }}
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-6 text-base font-semibold text-white backdrop-blur-xl transition-colors hover:bg-white/10"
            >
              Join Game
            </motion.button>
          </Link>
        </motion.div>

        {/* How to play */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: 0.55,
            duration: 0.5,
          }}
          whileHover={{
            y: -1,
          }}
          className="mt-7 text-sm text-white/35 transition-colors hover:text-white/70"
        >
          How to play
        </motion.button>
      </section>

      {/* Bottom detail */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: 0.8,
          duration: 0.5,
        }}
        className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/20"
      >
        4–10 players · Play anywhere
      </motion.div>
    </main>
  );
}