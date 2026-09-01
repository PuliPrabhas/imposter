"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Minus,
  Plus,
  Sparkles,
  Timer,
  MessageCircle,
  User,
  Users,
  Play,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const roundOptions = [3, 5, 7, 10];
const clueOptions = [15, 30, 45];
const discussionOptions = [30, 60, 90];

const generateRoomCode = () => {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 5; i++) {
    code +=
      characters[
        Math.floor(
          Math.random() * characters.length,
        )
      ];
  }

  return code;
};

const getPlayerId = () => {
  const existing =
    localStorage.getItem(
      "imposter_player_id",
    );

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();

  localStorage.setItem(
    "imposter_player_id",
    id,
  );

  return id;
};

export default function CreateGame() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [players, setPlayers] =
    useState(5);

  const [rounds, setRounds] =
    useState(5);

  const [clueTime, setClueTime] =
    useState(30);

  const [
    discussionTime,
    setDiscussionTime,
  ] = useState(60);

  const [creating, setCreating] =
    useState(false);

  const decreasePlayers = () => {
    setPlayers((current) =>
      Math.max(4, current - 1),
    );
  };

  const increasePlayers = () => {
    setPlayers((current) =>
      Math.min(10, current + 1),
    );
  };

  const createRoom = () => {
    const cleanName =
      name.trim();

    if (!cleanName) {
      return;
    }

    setCreating(true);

    /*
     * ======================================================
     * PLAYER IDENTITY
     * ======================================================
     *
     * Keep the existing working identity behaviour.
     */

    const playerId =
      getPlayerId();

    sessionStorage.setItem(
      "imposter_player_id",
      playerId,
    );

    sessionStorage.setItem(
      "imposter_player_name",
      cleanName,
    );

    localStorage.setItem(
      "imposter_player_name",
      cleanName,
    );

    /*
     * ======================================================
     * ROOM SETTINGS
     * ======================================================
     *
     * IMPORTANT:
     * Store the ACTUAL currently selected values.
     */

    localStorage.setItem(
      "imposter_room_settings",
      JSON.stringify({
        players,
        rounds,
        clueTime,
        discussionTime,
      }),
    );

    /*
     * ======================================================
     * HOST FLAG
     * ======================================================
     */

    sessionStorage.setItem(
      "imposter_room_host",
      "true",
    );

    localStorage.setItem(
      "imposter_room_host",
      "true",
    );

    /*
     * ======================================================
     * CREATE ROOM
     * ======================================================
     */

    const roomCode =
      generateRoomCode();

    router.push(
      `/room/${roomCode}`,
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7fb] text-[#20263d]">
      {/* ====================================================
          BACKGROUND
      ==================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#7c5cff]/20 blur-3xl"
          animate={{
            x: [0, 70, 20, 0],
            y: [0, 50, 90, 0],
            scale: [
              1,
              1.08,
              0.96,
              1,
            ],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-[#28d7ff]/20 blur-3xl"
          animate={{
            x: [0, -60, -20, 0],
            y: [0, 40, 90, 0],
            scale: [
              1,
              0.95,
              1.06,
              1,
            ],
          }}
          transition={{
            duration: 21,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#ffcf33]/20 blur-3xl"
          animate={{
            x: [0, 50, -20, 0],
            y: [0, -30, -70, 0],
            scale: [
              1,
              1.05,
              0.96,
              1,
            ],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="absolute left-[7%] top-[28%] h-4 w-4 rotate-12 rounded-sm bg-[#ff5c7a]" />

        <div className="absolute right-[10%] top-[48%] h-5 w-5 rounded-full bg-[#28d7ff]" />

        <div className="absolute bottom-[18%] left-[12%] h-4 w-4 rotate-45 rounded-sm bg-[#7c5cff]" />

        <div className="absolute bottom-[25%] right-[15%] h-3 w-3 rounded-full bg-[#ffcf33]" />
      </div>

      {/* ====================================================
          HEADER
      ==================================================== */}

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

        <div className="hidden items-center gap-2 rounded-full border-2 border-[#20263d]/15 bg-white/75 px-4 py-2 text-xs font-black sm:flex">
          <Eye className="h-4 w-4 text-[#ff5c7a]" />

          GAME SETUP
        </div>
      </header>

      {/* ====================================================
          MAIN
      ==================================================== */}

      <section className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
        {/* ==================================================
            TITLE
        ================================================== */}

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
            duration: 0.6,
          }}
          className="mb-8"
        >
          <div className="mb-4 flex items-center gap-3">
            <motion.div
              animate={{
                rotate: [-4, 4, -4],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#20263d] bg-[#ffcf33] shadow-[0_5px_0_#20263d]"
            >
              <Crown className="h-6 w-6 stroke-[3]" />
            </motion.div>

            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#20263d]/40">
                You are the host
              </div>

              <div className="text-sm font-black">
                Your game. Your rules.
              </div>
            </div>
          </div>

          <h1 className="text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl">
            CREATE
            <br />
            <span className="text-[#7c5cff]">
              THE CHAOS.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-sm font-bold leading-6 text-[#20263d]/50 sm:text-base">
            Set the rules, invite your friends,
            and prepare to accuse everyone.
          </p>
        </motion.div>

        {/* ==================================================
            PLAYER NAME
        ================================================== */}

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
            duration: 0.5,
          }}
          className="overflow-hidden rounded-[28px] border-4 border-[#20263d] bg-white shadow-[0_7px_0_#20263d]"
        >
          <div className="border-b-4 border-[#20263d] bg-[#7c5cff] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border-4 border-[#20263d] bg-white text-[#20263d]">
                <User className="h-5 w-5 stroke-[3]" />
              </div>

              <div>
                <div className="font-black uppercase">
                  Who are you?
                </div>

                <div className="text-xs font-bold text-white/70">
                  This is the name everyone sees
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value.slice(
                    0,
                    20,
                  ),
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                    "Enter" &&
                  name.trim()
                ) {
                  createRoom();
                }
              }}
              placeholder="Enter your suspicious name..."
              maxLength={20}
              autoComplete="nickname"
              className="h-14 w-full rounded-2xl border-4 border-[#20263d]/15 bg-[#f7f7fb] px-4 text-sm font-bold outline-none transition-all placeholder:text-[#20263d]/25 focus:border-[#7c5cff] focus:bg-white sm:text-base"
            />
          </div>
        </motion.div>

        {/* ==================================================
            PLAYER COUNT
        ================================================== */}

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
            duration: 0.5,
          }}
          className="mt-4 overflow-hidden rounded-[28px] border-4 border-[#20263d] bg-[#28d7ff] shadow-[0_7px_0_#20263d]"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#20263d] bg-white shadow-[0_4px_0_#20263d]">
                  <Users className="h-6 w-6 stroke-[3]" />
                </div>

                <div>
                  <div className="text-xl font-black uppercase">
                    Players
                  </div>

                  <div className="text-xs font-bold text-[#20263d]/55">
                    Choose your lobby size
                  </div>
                </div>
              </div>

              <div className="rounded-full border-2 border-[#20263d] bg-white px-3 py-1 text-[10px] font-black">
                4–10
              </div>
            </div>

            <div className="mt-7 flex items-center justify-center gap-7">
              <motion.button
                whileTap={{
                  scale: 0.88,
                  y: 2,
                }}
                onClick={
                  decreasePlayers
                }
                disabled={
                  players === 4
                }
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#20263d] bg-white shadow-[0_5px_0_#20263d] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus className="h-6 w-6 stroke-[3]" />
              </motion.button>

              <motion.div
                key={players}
                initial={{
                  scale: 0.65,
                  rotate: -6,
                }}
                animate={{
                  scale: 1,
                  rotate: 0,
                }}
                className="min-w-24 text-center"
              >
                <div className="text-6xl font-black leading-none">
                  {players}
                </div>

                <div className="mt-1 text-xs font-black uppercase">
                  players
                </div>
              </motion.div>

              <motion.button
                whileTap={{
                  scale: 0.88,
                  y: 2,
                }}
                onClick={
                  increasePlayers
                }
                disabled={
                  players === 10
                }
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#20263d] bg-white shadow-[0_5px_0_#20263d] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-6 w-6 stroke-[3]" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ==================================================
            SETTINGS
        ================================================== */}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <SettingCard
            icon={
              <Sparkles className="h-5 w-5 stroke-[3]" />
            }
            title="Rounds"
            subtitle="How long the game lasts"
            color="purple"
          >
            <OptionGroup
              options={roundOptions}
              selected={rounds}
              onChange={setRounds}
              suffix=""
            />
          </SettingCard>

          <SettingCard
            icon={
              <Timer className="h-5 w-5 stroke-[3]" />
            }
            title="Clue"
            subtitle="Time for each clue"
            color="yellow"
          >
            <OptionGroup
              options={clueOptions}
              selected={clueTime}
              onChange={setClueTime}
              suffix="s"
            />
          </SettingCard>

          <SettingCard
            icon={
              <MessageCircle className="h-5 w-5 stroke-[3]" />
            }
            title="Discussion"
            subtitle="Time to argue"
            color="green"
          >
            <OptionGroup
              options={
                discussionOptions
              }
              selected={
                discussionTime
              }
              onChange={
                setDiscussionTime
              }
              suffix="s"
            />
          </SettingCard>
        </div>

        {/* ==================================================
            CURRENT SETTINGS
        ================================================== */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.25,
          }}
          className="mt-5 flex flex-wrap justify-center gap-2"
        >
          <SummaryPill>
            👥 {players} PLAYERS
          </SummaryPill>

          <SummaryPill>
            🔥 {rounds} ROUNDS
          </SummaryPill>

          <SummaryPill>
            💡 {clueTime}s CLUES
          </SummaryPill>

          <SummaryPill>
            💬 {discussionTime}s DISCUSSION
          </SummaryPill>
        </motion.div>

        {/* ==================================================
            CREATE BUTTON
        ================================================== */}

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
            delay: 0.3,
            duration: 0.5,
          }}
          whileHover={
            name.trim()
              ? {
                  y: -4,
                }
              : undefined
          }
          whileTap={
            name.trim()
              ? {
                  y: 2,
                }
              : undefined
          }
          disabled={
            !name.trim() ||
            creating
          }
          onClick={createRoom}
          className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-[22px] border-4 border-[#20263d] bg-[#ff5c7a] px-6 text-lg font-black uppercase text-white shadow-[0_7px_0_#20263d] transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? (
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

              CREATING ROOM...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 fill-current stroke-[3]" />

              CREATE ROOM

              <ArrowRight className="h-5 w-5 stroke-[3]" />
            </>
          )}
        </motion.button>

        <p className="mt-4 text-center text-xs font-bold text-[#20263d]/35">
          Share the room code with your friends
          once you're inside.
        </p>
      </section>

      {/* Bottom border */}

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-2 bg-[#20263d]" />
    </main>
  );
}

/* ==========================================================
   SETTING CARD
========================================================== */

function SettingCard({
  icon,
  title,
  subtitle,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color:
    | "purple"
    | "yellow"
    | "green";
  children: React.ReactNode;
}) {
  const colors = {
    purple: "bg-[#c7b8ff]",
    yellow: "bg-[#ffcf33]",
    green: "bg-[#7ee8b1]",
  };

  return (
    <div
      className={`overflow-hidden rounded-[26px] border-4 border-[#20263d] ${colors[color]} shadow-[0_6px_0_#20263d]`}
    >
      <div className="flex items-center gap-3 border-b-4 border-[#20263d] bg-white/25 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-3 border-[#20263d] bg-white">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="font-black uppercase">
            {title}
          </div>

          <div className="truncate text-[10px] font-bold text-[#20263d]/50">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

/* ==========================================================
   OPTION GROUP
========================================================== */

function OptionGroup({
  options,
  selected,
  onChange,
  suffix,
}: {
  options: number[];
  selected: number;
  onChange: (
    value: number,
  ) => void;
  suffix: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(
        (option) => {
          const isSelected =
            option === selected;

          return (
            <motion.button
              key={option}
              type="button"
              whileTap={{
                scale: 0.9,
                y: 1,
              }}
              onClick={() =>
                onChange(option)
              }
              className={`relative h-11 rounded-xl border-3 border-[#20263d] text-sm font-black transition-all ${
                isSelected
                  ? "bg-[#20263d] text-white shadow-[0_3px_0_rgba(32,38,61,0.35)]"
                  : "bg-white/75 text-[#20263d]/55 hover:bg-white hover:text-[#20263d]"
              }`}
            >
              {isSelected && (
                <motion.div
                  initial={{
                    scale: 0.5,
                    opacity: 0,
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  className="absolute right-1.5 top-1.5"
                >
                  <Check className="h-3 w-3 stroke-[4]" />
                </motion.div>
              )}

              <span className="relative">
                {option}
                {suffix}
              </span>
            </motion.button>
          );
        },
      )}
    </div>
  );
}

/* ==========================================================
   SUMMARY PILL
========================================================== */

function SummaryPill({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-full border-2 border-[#20263d]/15 bg-white px-3 py-1.5 text-[10px] font-black shadow-sm">
      {children}
    </div>
  );
}