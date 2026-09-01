"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  Minus,
  Plus,
  Users,
  Timer,
  MessageCircle,
  User,
  Sparkles,
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
        Math.floor(Math.random() * characters.length)
      ];
  }

  return code;
};

const getPlayerId = () => {
  const existing = localStorage.getItem(
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

  const [name, setName] = useState("");

  const [players, setPlayers] = useState(5);
  const [rounds, setRounds] = useState(5);
  const [clueTime, setClueTime] = useState(30);
  const [discussionTime, setDiscussionTime] =
    useState(60);

  const [creating, setCreating] = useState(false);

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
    const cleanName = name.trim();

    if (!cleanName) {
      return;
    }

    setCreating(true);

    /*
     * ------------------------------------------------
     * PLAYER IDENTITY
     * ------------------------------------------------
     *
     * Keep the existing player ID behaviour.
     */
    const playerId = getPlayerId();

    /*
     * Save the name in BOTH storages.
     *
     * sessionStorage:
     * - survives navigation in this tab
     * - prevents another tab/session from accidentally
     *   replacing the current room identity
     *
     * localStorage:
     * - survives refreshes
     * - keeps compatibility with the existing RoomPage
     */
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
     * ------------------------------------------------
     * ROOM SETTINGS
     * ------------------------------------------------
     *
     * DO NOT change these values or defaults.
     * The existing working selector values are preserved.
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
     * ------------------------------------------------
     * HOST FLAG
     * ------------------------------------------------
     *
     * Store in both places for compatibility with
     * different RoomPage versions.
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
     * ------------------------------------------------
     * CREATE ROOM
     * ------------------------------------------------
     */
    const roomCode = generateRoomCode();

    router.push(`/room/${roomCode}`);
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

      {/* Header */}
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

      {/* Content */}
      <section className="relative z-10 mx-auto flex w-full max-w-xl flex-col px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
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
          transition={{
            duration: 0.6,
          }}
          className="mb-8"
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.25em] text-violet-300/60">
            <Sparkles className="h-4 w-4" />
            Game setup
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Create Game
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/40 sm:text-base">
            Configure the game before inviting your
            friends.
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
                setName(
                  event.target.value.slice(0, 20),
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  name.trim()
                ) {
                  createRoom();
                }
              }}
              placeholder="Enter your name"
              maxLength={20}
              autoComplete="nickname"
              className="mt-5 h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-violet-300/30 focus:bg-white/[0.06]"
            />
          </div>

          {/* Players */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-400/10 p-2.5">
                <Users className="h-5 w-5 text-violet-300" />
              </div>

              <div>
                <h2 className="font-medium">
                  Players
                </h2>

                <p className="text-xs text-white/35">
                  4–10 players
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-7">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={decreasePlayers}
                disabled={players === 4}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus className="h-5 w-5" />
              </motion.button>

              <motion.div
                key={players}
                initial={{
                  opacity: 0,
                  scale: 0.8,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                className="w-16 text-center"
              >
                <span className="text-4xl font-semibold">
                  {players}
                </span>
              </motion.div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={increasePlayers}
                disabled={players === 10}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-5 w-5" />
              </motion.button>
            </div>
          </div>

          {/* Rounds */}
          <SettingCard
            icon={
              <Timer className="h-5 w-5 text-violet-300" />
            }
            title="Rounds"
            subtitle="How long the game lasts"
          >
            <OptionGroup
              options={roundOptions}
              selected={rounds}
              onChange={setRounds}
              suffix=""
            />
          </SettingCard>

          {/* Clue time */}
          <SettingCard
            icon={
              <Timer className="h-5 w-5 text-violet-300" />
            }
            title="Clue time"
            subtitle="Time each player gets"
          >
            <OptionGroup
              options={clueOptions}
              selected={clueTime}
              onChange={setClueTime}
              suffix="s"
            />
          </SettingCard>

          {/* Discussion */}
          <SettingCard
            icon={
              <MessageCircle className="h-5 w-5 text-violet-300" />
            }
            title="Discussion"
            subtitle="Time to argue and accuse"
          >
            <OptionGroup
              options={discussionOptions}
              selected={discussionTime}
              onChange={setDiscussionTime}
              suffix="s"
            />
          </SettingCard>
        </motion.div>

        {/* Create */}
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
            delay: 0.35,
            duration: 0.6,
          }}
          whileHover={{
            y: -2,
            scale: 1.01,
          }}
          whileTap={{
            scale: 0.98,
          }}
          disabled={!name.trim() || creating}
          onClick={createRoom}
          className="mt-7 h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#0b0b12] shadow-2xl shadow-white/5 transition-all hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating
            ? "Creating room..."
            : "Create Room"}
        </motion.button>
      </section>
    </main>
  );
}

function SettingCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-400/10 p-2.5">
          {icon}
        </div>

        <div>
          <h2 className="font-medium">{title}</h2>

          <p className="text-xs text-white/35">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function OptionGroup({
  options,
  selected,
  onChange,
  suffix,
}: {
  options: number[];
  selected: number;
  onChange: (value: number) => void;
  suffix: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {options.map((option) => {
        const isSelected = option === selected;

        return (
          <motion.button
            key={option}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(option)}
            className={`relative h-12 rounded-xl border text-sm font-medium transition-all ${
              isSelected
                ? "border-violet-300/30 bg-violet-400/15 text-white"
                : "border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId={`selected-${suffix}-${option}`}
                className="absolute inset-0 rounded-xl bg-violet-400/5"
              />
            )}

            <span className="relative">
              {option}
              {suffix}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}