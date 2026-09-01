"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  User,
  Sparkles,
  Ghost,
  Eye,
  LogIn,
  ShieldQuestion,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const getPlayerId = () => {
  const existing = sessionStorage.getItem(
    "imposter_player_id",
  );

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();

  sessionStorage.setItem(
    "imposter_player_id",
    id,
  );

  return id;
};

export default function JoinPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const joinGame = () => {
    if (joining) {
      return;
    }

    const cleanName = name.trim();

    const cleanCode = code
      .trim()
      .toUpperCase();

    if (
      !cleanName ||
      cleanCode.length < 4
    ) {
      return;
    }

    setJoining(true);

    /*
     * Keep the existing per-tab identity.
     */
    const playerId = getPlayerId();

    /*
     * Store identity for THIS tab.
     */
    sessionStorage.setItem(
      "imposter_player_id",
      playerId,
    );

    sessionStorage.setItem(
      "imposter_player_name",
      cleanName,
    );

    /*
     * This player is joining,
     * NOT creating the room.
     */
    sessionStorage.setItem(
      "imposter_room_host",
      "false",
    );

    /*
     * Remove stale localStorage identity values.
     */
    localStorage.removeItem(
      "imposter_player_id",
    );

    localStorage.removeItem(
      "imposter_player_name",
    );

    /*
     * Keep room settings untouched.
     */
    router.push(
      `/room/${encodeURIComponent(cleanCode)}`,
    );
  };

  const canJoin =
    name.trim().length > 0 &&
    code.trim().length >= 4 &&
    !joining;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7fb] text-[#20263d]">
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#28d7ff]/20 blur-3xl"
          animate={{
            x: [0, 70, 20, 0],
            y: [0, 50, 90, 0],
            scale: [1, 1.08, 0.96, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[#ffcf33]/20 blur-3xl"
          animate={{
            x: [0, -60, -20, 0],
            y: [0, -40, -90, 0],
            scale: [1, 0.95, 1.06, 1],
          }}
          transition={{
            duration: 21,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="absolute left-[8%] top-[25%] h-4 w-4 rotate-45 rounded-sm bg-[#7c5cff]" />
        <div className="absolute right-[10%] top-[35%] h-5 w-5 rounded-full bg-[#ff5c7a]" />
        <div className="absolute bottom-[18%] left-[12%] h-3 w-3 rounded-full bg-[#28d7ff]" />
      </div>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/">
          <motion.div
            whileHover={{
              x: -3,
            }}
            whileTap={{
              scale: 0.94,
            }}
            className="flex items-center gap-2 rounded-2xl border-4 border-[#20263d] bg-white px-4 py-2.5 text-sm font-black shadow-[0_4px_0_#20263d]"
          >
            <ArrowLeft className="h-4 w-4 stroke-[3]" />
            BACK
          </motion.div>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border-2 border-[#20263d]/15 bg-white/70 px-4 py-2 text-xs font-black sm:flex">
          <LogIn className="h-4 w-4 text-[#28aee0]" />
          JOIN A ROOM
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-2xl flex-col justify-center px-5 pb-16 pt-6 sm:px-8">
        {/* Heading */}

        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-7"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 rotate-[5deg] items-center justify-center rounded-xl border-4 border-[#20263d] bg-[#28d7ff] shadow-[0_4px_0_#20263d]">
              <Ghost className="h-5 w-5 stroke-[3]" />
            </div>

            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#20263d]/45">
              Your friends are waiting
            </span>
          </div>

          <h1 className="text-5xl font-black tracking-[-0.06em] sm:text-6xl">
            JOIN
            <br />
            <span className="text-[#28aee0]">
              THE CHAOS.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-[#20263d]/50 sm:text-base">
            Enter your name and the secret room code.
            Then prepare to defend yourself.
          </p>
        </motion.div>

        {/* =================================================
            NAME
        ================================================= */}

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
            delay: 0.05,
          }}
          className="overflow-hidden rounded-[28px] border-4 border-[#20263d] bg-white shadow-[0_7px_0_#20263d]"
        >
          <div className="border-b-4 border-[#20263d] bg-[#28d7ff] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border-4 border-[#20263d] bg-white">
                <User className="h-5 w-5 stroke-[3]" />
              </div>

              <div>
                <div className="font-black uppercase">
                  Who are you?
                </div>

                <div className="text-xs font-bold text-[#20263d]/55">
                  Your friends need a name to accuse
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            <input
              value={name}
              onChange={(event) => {
                setName(
                  event.target.value.slice(
                    0,
                    20,
                  ),
                );
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  name.trim() &&
                  code.trim().length >= 4
                ) {
                  joinGame();
                }
              }}
              placeholder="Your suspicious name..."
              maxLength={20}
              autoComplete="nickname"
              disabled={joining}
              className="h-14 w-full rounded-2xl border-4 border-[#20263d]/15 bg-[#f7f7fb] px-4 text-base font-bold outline-none transition-all placeholder:text-[#20263d]/25 focus:border-[#28aee0] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            />

            <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase text-[#20263d]/35">
              <Check className="h-3.5 w-3.5" />
              Maximum 20 characters
            </div>
          </div>
        </motion.div>

        {/* =================================================
            ROOM CODE
        ================================================= */}

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
          }}
          className="mt-4 overflow-hidden rounded-[28px] border-4 border-[#20263d] bg-[#ffcf33] shadow-[0_7px_0_#20263d]"
        >
          <div className="border-b-4 border-[#20263d] bg-white/25 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border-4 border-[#20263d] bg-white">
                <KeyRound className="h-5 w-5 stroke-[3]" />
              </div>

              <div>
                <div className="font-black uppercase">
                  Room code
                </div>

                <div className="text-xs font-bold text-[#20263d]/55">
                  Get the code from your host
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            <input
              value={code}
              onChange={(event) => {
                const nextCode =
                  event.target.value
                    .toUpperCase()
                    .replace(
                      /[^A-Z0-9]/g,
                      "",
                    )
                    .slice(0, 6);

                setCode(nextCode);
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  name.trim() &&
                  code.trim().length >= 4
                ) {
                  joinGame();
                }
              }}
              placeholder="A7K92"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              disabled={joining}
              className="h-20 w-full rounded-2xl border-4 border-[#20263d] bg-white px-4 text-center text-3xl font-black tracking-[0.28em] outline-none transition-all placeholder:text-[#20263d]/15 focus:bg-[#f7f7fb] disabled:cursor-not-allowed disabled:opacity-50"
            />

            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase text-[#20263d]/40">
              <ShieldQuestion className="h-3.5 w-3.5" />
              Ask the host for the code
            </div>
          </div>
        </motion.div>

        {/* =================================================
            JOIN BUTTON
        ================================================= */}

        <motion.button
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
          }}
          whileHover={
            canJoin
              ? {
                  y: -4,
                }
              : undefined
          }
          whileTap={
            canJoin
              ? {
                  y: 2,
                }
              : undefined
          }
          disabled={!canJoin}
          onClick={joinGame}
          className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-[22px] border-4 border-[#20263d] bg-[#7c5cff] px-6 text-lg font-black uppercase text-white shadow-[0_7px_0_#20263d] transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          {joining ? (
            <>
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>

              JOINING...
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5 stroke-[3]" />
              JOIN GAME
              <ArrowRight className="h-5 w-5 stroke-[3]" />
            </>
          )}
        </motion.button>

        {/* Small personality card */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.35,
          }}
          className="mt-5 flex items-center justify-center gap-2 text-center text-xs font-black text-[#20263d]/35"
        >
          <Eye className="h-4 w-4" />
          <span>
            Everyone gets a secret role.
            <span className="text-[#ff5c7a]">
              {" "}
              Maybe yours isn't what it seems.
            </span>
          </span>
        </motion.div>
      </section>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-2 bg-[#20263d]" />
    </main>
  );
}