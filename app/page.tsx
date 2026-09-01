"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Crown,
  Eye,
  Ghost,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7fb] text-[#20263d]">
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#7c5cff]/20 blur-3xl"
          animate={{
            x: [0, 50, 10, 0],
            y: [0, 35, 70, 0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-[#28d7ff]/20 blur-3xl"
          animate={{
            x: [0, -35, -10, 0],
            y: [0, 45, 80, 0],
            scale: [1, 0.94, 1.08, 1],
          }}
          transition={{
            duration: 19,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#ffcf33]/20 blur-3xl"
          animate={{
            x: [0, 50, -20, 0],
            y: [0, -30, -70, 0],
            scale: [1, 1.05, 0.96, 1],
          }}
          transition={{
            duration: 21,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* playful dots */}
        <div className="absolute left-[8%] top-[25%] h-3 w-3 rotate-12 rounded-sm bg-[#ff5c7a]" />
        <div className="absolute right-[12%] top-[38%] h-4 w-4 rounded-full bg-[#28d7ff]" />
        <div className="absolute bottom-[25%] left-[12%] h-4 w-4 rotate-45 rounded-sm bg-[#7c5cff]" />
        <div className="absolute bottom-[18%] right-[15%] h-3 w-3 rounded-full bg-[#ffcf33]" />
      </div>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <motion.div
          initial={{
            opacity: 0,
            x: -15,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 rotate-[-5deg] items-center justify-center rounded-2xl border-4 border-[#20263d] bg-[#ffcf33] shadow-[0_5px_0_#20263d]">
            <Eye className="h-5 w-5 stroke-[3]" />
          </div>

          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em]">
              Imposter
            </div>

            <div className="text-[10px] font-bold text-[#20263d]/45">
              Trust nobody.
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            x: 15,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          className="hidden items-center gap-2 rounded-full border-2 border-[#20263d]/15 bg-white/70 px-4 py-2 text-xs font-bold sm:flex"
        >
          <Users className="h-4 w-4" />
          4–10 PLAYERS
        </motion.div>
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl flex-col items-center justify-center px-5 pb-12 pt-4 text-center sm:px-8">
        {/* Floating imposter badge */}

        <motion.div
          initial={{
            opacity: 0,
            y: -20,
            rotate: -5,
          }}
          animate={{
            opacity: 1,
            y: 0,
            rotate: -3,
          }}
          transition={{
            duration: 0.6,
          }}
          className="mb-5 flex items-center gap-2 rounded-full border-4 border-[#20263d] bg-[#ff5c7a] px-4 py-2 font-black uppercase tracking-wider text-white shadow-[0_5px_0_#20263d]"
        >
          <Sparkles className="h-4 w-4" />
          A social deduction game
        </motion.div>

        {/* Title */}

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.85,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.7,
            type: "spring",
            stiffness: 140,
          }}
        >
          <h1 className="select-none text-[4.5rem] font-black leading-[0.8] tracking-[-0.075em] sm:text-[7rem] md:text-[9rem]">
            <span className="relative inline-block">
              IMPOSTER

              <motion.span
                animate={{
                  rotate: [-4, 5, -4],
                  y: [0, -4, 0],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -right-3 -top-7 text-3xl sm:-right-6 sm:-top-10 sm:text-5xl"
              >
                👀
              </motion.span>
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.25,
            duration: 0.5,
          }}
          className="mt-7 max-w-xl text-lg font-bold leading-7 text-[#20263d]/55 sm:text-xl"
        >
          One word.
          <span className="mx-2 text-[#ff5c7a]">
            One imposter.
          </span>
          <br />
          Lie your way to victory.
        </motion.p>

        {/* =================================================
            ACTION CARDS
        ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.35,
            duration: 0.6,
          }}
          className="mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-2"
        >
          {/* CREATE */}

          <Link href="/create" className="group">
            <motion.div
              whileHover={{
                y: -6,
              }}
              whileTap={{
                y: 2,
              }}
              className="relative overflow-hidden rounded-[28px] border-4 border-[#20263d] bg-[#28d7ff] p-6 text-left shadow-[0_8px_0_#20263d] transition-shadow group-hover:shadow-[0_12px_0_#20263d]"
            >
              <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/20" />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#20263d] bg-white shadow-[0_4px_0_#20263d]">
                    <Crown className="h-6 w-6 stroke-[3]" />
                  </div>

                  <ArrowRight className="h-7 w-7 stroke-[3]" />
                </div>

                <div className="mt-7">
                  <div className="text-2xl font-black uppercase tracking-tight">
                    Create Game
                  </div>

                  <p className="mt-1 text-sm font-bold text-[#20263d]/60">
                    Become the host. Start the chaos.
                  </p>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* JOIN */}

          <Link href="/join" className="group">
            <motion.div
              whileHover={{
                y: -6,
              }}
              whileTap={{
                y: 2,
              }}
              className="relative overflow-hidden rounded-[28px] border-4 border-[#20263d] bg-[#ffcf33] p-6 text-left shadow-[0_8px_0_#20263d] transition-shadow group-hover:shadow-[0_12px_0_#20263d]"
            >
              <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/20" />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#20263d] bg-white shadow-[0_4px_0_#20263d]">
                    <Ghost className="h-6 w-6 stroke-[3]" />
                  </div>

                  <ArrowRight className="h-7 w-7 stroke-[3]" />
                </div>

                <div className="mt-7">
                  <div className="text-2xl font-black uppercase tracking-tight">
                    Join Game
                  </div>

                  <p className="mt-1 text-sm font-bold text-[#20263d]/60">
                    Got a code? Sneak right in.
                  </p>
                </div>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* HOW TO PLAY */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.7,
          }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 rounded-full border-2 border-[#20263d]/15 bg-white/75 px-4 py-2 text-xs font-black">
            <Zap className="h-4 w-4 text-[#ff5c7a]" />
            QUICK TO LEARN
          </div>

          <div className="flex items-center gap-2 rounded-full border-2 border-[#20263d]/15 bg-white/75 px-4 py-2 text-xs font-black">
            <Users className="h-4 w-4 text-[#28aee0]" />
            PLAY WITH FRIENDS
          </div>

          <div className="flex items-center gap-2 rounded-full border-2 border-[#20263d]/15 bg-white/75 px-4 py-2 text-xs font-black">
            😈
            <span>TRUST NOBODY</span>
          </div>
        </motion.div>
      </section>

      {/* Bottom decoration */}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2 bg-[#20263d]" />
    </main>
  );
}