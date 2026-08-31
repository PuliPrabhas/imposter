"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  User,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const getPlayerId = () => {
  const existing = localStorage.getItem(
    "imposter_player_id",
  );

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();

  localStorage.setItem("imposter_player_id", id);

  return id;
};

export default function JoinPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const joinGame = () => {
    const cleanName = name.trim();
    const cleanCode = code
      .trim()
      .toUpperCase();

    if (!cleanName || cleanCode.length < 4) {
      return;
    }

    setJoining(true);

    getPlayerId();

    localStorage.setItem(
      "imposter_player_name",
      cleanName,
    );

    localStorage.setItem(
      "imposter_room_host",
      "false",
    );

    router.push(`/room/${cleanCode}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b12] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-3xl"
          animate={{
            x: [0, 70, 20, 0],
            y: [0, 50, 90, 0],
            scale: [1, 1.08, 0.96, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-indigo-500/10 blur-3xl"
          animate={{
            x: [0, -60, -20, 0],
            y: [0, -40, -90, 0],
            scale: [1, 0.95, 1.06, 1],
          }}
          transition={{
            duration: 23,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0b0b12_78%)]" />
      </div>

      <header className="relative z-10 flex items-center px-5 py-5 sm:px-8">
        <Link href="/">
          <motion.div
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 backdrop-blur-xl transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </motion.div>
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-xl flex-col justify-center px-5 pb-16 sm:px-8">
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="mb-8"
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.25em] text-violet-300/60">
            <Sparkles className="h-4 w-4" />
            Join your friends
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Join Game
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/40 sm:text-base">
            Enter the room code and choose your
            player name.
          </p>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
            duration: 0.6,
          }}
          className="space-y-4"
        >
          {/* Name */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-400/10 p-2.5">
                <User className="h-5 w-5 text-violet-300" />
              </div>

              <div>
                <h2 className="font-medium">
                  Your name
                </h2>

                <p className="text-xs text-white/35">
                  What should your friends call you?
                </p>
              </div>
            </div>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value.slice(0, 20))
              }
              placeholder="Enter your name"
              maxLength={20}
              autoComplete="nickname"
              className="mt-5 h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-violet-300/30 focus:bg-white/[0.06]"
            />
          </div>

          {/* Room code */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-400/10 p-2.5">
                <KeyRound className="h-5 w-5 text-violet-300" />
              </div>

              <div>
                <h2 className="font-medium">
                  Room code
                </h2>

                <p className="text-xs text-white/35">
                  Ask the host for the code.
                </p>
              </div>
            </div>

            <input
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6),
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  name.trim() &&
                  code.trim()
                ) {
                  joinGame();
                }
              }}
              placeholder="A7K92"
              maxLength={6}
              autoCapitalize="characters"
              className="mt-5 h-16 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-center text-2xl font-semibold tracking-[0.3em] text-white outline-none placeholder:text-white/15 transition-all focus:border-violet-300/30 focus:bg-white/[0.06]"
            />
          </div>
        </motion.div>

        <motion.button
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.3,
            duration: 0.6,
          }}
          whileHover={{
            y: -2,
            scale: 1.01,
          }}
          whileTap={{
            scale: 0.98,
          }}
          disabled={
            !name.trim() ||
            code.trim().length < 4 ||
            joining
          }
          onClick={joinGame}
          className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-semibold text-[#0b0b12] shadow-2xl shadow-white/5 transition-all hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {joining ? "Joining..." : "Join Game"}
          {!joining && (
            <ArrowRight className="h-4 w-4" />
          )}
        </motion.button>
      </section>
    </main>
  );
}