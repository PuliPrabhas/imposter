"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Check,
  Circle,
  Copy,
  Crown,
  MessageCircle,
  Send,
  Wifi,
  WifiOff,
  Users,
  Play,
  Eye,
  EyeOff,
  Clock,
  Vote,
  Lightbulb,
  Trophy,
  Skull,
  SlidersHorizontal,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Player = {
  id: string;
  name: string;
  joinedAt: number;
};

type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
};

type Role =
  | "civilian"
  | "imposter";

type GamePhase =
  | "clue"
  | "discussion"
  | "voting"
  | "results";

type Clue = {
  playerId: string;
  playerName: string;
  clue: string;
};

type RoomSettings = {
  players: number;
  rounds: number;
  clueTime: number;
  discussionTime: number;
};

const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  players: 5,
  rounds: 5,
  clueTime: 30,
  discussionTime: 60,
};

type PublicGameState = {
  status:
    | "playing"
    | "finished";
  round: number;
  totalRounds: number;
  phase: GamePhase;
  phaseEndsAt: number;
  clues: Clue[];
  currentCluePlayerId?: string;
};

type ServerMessage =
  | {
      type: "connected";
      playerId: string;
      players: Player[];
      hostPlayerId: string;
      game?: PublicGameState;
      roomSettings?: RoomSettings;
    }
  | {
      type: "player_joined";
      player: Player;
      players: Player[];
      hostPlayerId: string;
    }
  | {
      type: "player_left";
      playerId: string;
      playerName: string;
      players: Player[];
      hostPlayerId: string;
    }
  | {
      type: "chat";
      playerId: string;
      playerName: string;
      message: string;
      timestamp: number;
    }
  | {
      type: "settings_updated";
      roomSettings: RoomSettings;
    }
  | {
      type: "game_started";
      game: PublicGameState;
      roomSettings?: RoomSettings;
    }
  | {
      type: "private_role";
      round: number;
      role: Role;
      word: string | null;
    }
  | {
      type: "game_phase";
      round: number;
      phase: GamePhase;
      phaseEndsAt: number;
      currentCluePlayerId?: string;
    }
  | {
      type: "clue_submitted";
      playerId: string;
      playerName: string;
      clue: string;
      nextPlayerId?: string;
    }
  | {
      type: "vote_update";
      votesSubmitted: number;
      totalPlayers: number;
    }
  | {
      type: "round_results";
      round: number;
      imposterId: string;
      imposterName: string;
      word: string;
      voteCounts: Record<
        string,
        number
      >;
      eliminatedId: string | null;
      eliminatedName:
        | string
        | null;
      civiliansWon: boolean;
      nextRound: boolean;
    }
  | {
      type: "game_finished";
      winner:
        | "civilians"
        | "imposter";
      rounds: number;
    }
  | {
      type: "pong";
    }
  | {
      type: "error";
      message: string;
    };

type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

function getPlayerId() {
  const storageKey =
    "imposter_player_id";

  const existing =
    sessionStorage.getItem(
      storageKey,
    );

  if (existing) {
    return existing;
  }

  const id =
    crypto.randomUUID();

  sessionStorage.setItem(
    storageKey,
    id,
  );

  return id;
}

function uniquePlayers(
  players: Player[],
): Player[] {
  return Array.from(
    new Map(
      players.map(
        (player) => [
          player.id,
          player,
        ],
      ),
    ).values(),
  ).sort(
    (a, b) =>
      a.joinedAt -
      b.joinedAt,
  );
}

function getAvatarStyle(
  name: string,
) {
  const styles = [
    "from-violet-400/30 to-indigo-400/10 text-violet-200",
    "from-fuchsia-400/30 to-violet-400/10 text-fuchsia-200",
    "from-cyan-400/30 to-blue-400/10 text-cyan-200",
    "from-emerald-400/30 to-teal-400/10 text-emerald-200",
    "from-amber-400/30 to-orange-400/10 text-amber-200",
    "from-rose-400/30 to-pink-400/10 text-rose-200",
  ];

  let hash = 0;

  for (
    let i = 0;
    i < name.length;
    i++
  ) {
    hash =
      name.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  return styles[
    Math.abs(hash) %
      styles.length
  ];
}

function formatTime(
  timestamp: number,
) {
  return new Date(
    timestamp,
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function phaseLabel(
  phase: GamePhase,
) {
  switch (phase) {
    case "clue":
      return "Give your clue";

    case "discussion":
      return "Discuss";

    case "voting":
      return "Vote";

    case "results":
      return "Round Results";
  }
}

function phaseDescription(
  phase: GamePhase,
) {
  switch (phase) {
    case "clue":
      return "Give a clue that relates to the secret word without making it too obvious.";

    case "discussion":
      return "Talk with everyone and figure out who doesn't know the word.";

    case "voting":
      return "Choose the player you think is the imposter.";

    case "results":
      return "Let's see who was the imposter.";
  }
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();

  const code = String(
    params.code || "",
  ).toUpperCase();

  const socketRef =
    useRef<WebSocket | null>(
      null,
    );

  const chatScrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const chatNearBottomRef =
    useRef(true);

  const chatAutoScrollFrameRef =
    useRef<number | null>(null);

  const [unreadChatCount, setUnreadChatCount] =
    useState(0);

  const [playerId, setPlayerId] =
    useState("");

  const [playerName, setPlayerName] =
    useState("");

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const messageInputRef =
    useRef<HTMLInputElement | null>(null);

  const [connection, setConnection] =
    useState<ConnectionState>(
      "connecting",
    );

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [hostPlayerId, setHostPlayerId] =
    useState("");

  const [roomSettings, setRoomSettings] =
    useState<RoomSettings>(DEFAULT_ROOM_SETTINGS);

  const [startingGame, setStartingGame] =
    useState(false);

  const [game, setGame] =
    useState<
      PublicGameState | null
    >(null);

  const [role, setRole] =
    useState<Role | null>(
      null,
    );

  const [word, setWord] =
    useState<string | null>(
      null,
    );

  const [clue, setClue] =
    useState("");

  const [hasSubmittedClue, setHasSubmittedClue] =
    useState(false);

  const [selectedVote, setSelectedVote] =
    useState("");

  const [votesSubmitted, setVotesSubmitted] =
    useState(0);

  const [hasSubmittedVote, setHasSubmittedVote] =
    useState(false);

  const [timeLeft, setTimeLeft] =
    useState(0);

  const [roundResult, setRoundResult] =
    useState<
      ServerMessage & {
        type: "round_results";
      } | null
    >(null);

  const [finalWinner, setFinalWinner] =
    useState<
      "civilians" | "imposter" | null
    >(null);

  const isHost =
    hostPlayerId ===
      playerId &&
    playerId !== "";

  // =====================================================
  // CHAT SOUND
  // =====================================================

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const playChatSound =
    useCallback(() => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextClass) return;

        let audioContext = audioContextRef.current;

        if (!audioContext) {
          audioContext = new AudioContextClass();
          audioContextRef.current = audioContext;
        }

        if (audioContext.state === "suspended") {
          void audioContext.resume();
        }

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(520, now);
        oscillator.frequency.exponentialRampToValueAtTime(680, now + 0.07);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.11);
      } catch {
        // Sound is optional and must never affect gameplay.
      }
    }, []);

  // =====================================================
  // CONNECT
  // =====================================================

  const connect = useCallback(
    (
      id: string,
      name: string,
    ) => {
      const baseUrl =
        process.env
          .NEXT_PUBLIC_WS_URL;

      if (!baseUrl) {
        setConnection(
          "error",
        );

        setError(
          "WebSocket server URL is not configured.",
        );

        return;
      }

      if (
        socketRef.current &&
        socketRef.current.readyState !==
          WebSocket.CLOSED
      ) {
        socketRef.current.close();
      }

      const normalizedBase =
        baseUrl.replace(
          /\/$/,
          "",
        );

      const socket =
        new WebSocket(
          `${normalizedBase}/room/${encodeURIComponent(
            code,
          )}`,
        );

      socketRef.current =
        socket;

      socket.onopen = () => {
        if (
          socketRef.current !==
          socket
        ) {
          return;
        }

        setConnection(
          "connected",
        );

        setError("");

        socket.send(
          JSON.stringify({
            type: "join",
            playerId: id,
            playerName:
              name,
          }),
        );
      };

      socket.onmessage = (
        event,
      ) => {
        if (
          socketRef.current !==
          socket
        ) {
          return;
        }

        try {
          const data =
            JSON.parse(
              event.data,
            ) as ServerMessage;

          // ------------------------------------------------
          // CONNECTED
          // ------------------------------------------------

          if (
            data.type ===
            "connected"
          ) {
            setPlayers(
              uniquePlayers(
                data.players,
              ),
            );

            setHostPlayerId(
              data.hostPlayerId,
            );

            if (data.roomSettings) {
              setRoomSettings(data.roomSettings);
            }

            if (data.game) {
              setGame(
                data.game,
              );
            }

            setConnection(
              "connected",
            );

            return;
          }

          // ------------------------------------------------
          // PLAYER JOINED
          // ------------------------------------------------

          if (
            data.type ===
            "player_joined"
          ) {
            setPlayers(
              uniquePlayers(
                data.players,
              ),
            );

            setHostPlayerId(
              data.hostPlayerId,
            );

            if (
              data.player.id !==
              id
            ) {
              setMessages(
                (
                  current,
                ) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    playerId:
                      "system",
                    playerName:
                      "SYSTEM",
                    message: `${data.player.name} joined the room`,
                    timestamp:
                      Date.now(),
                  },
                ],
              );

              playChatSound();
            }

            return;
          }

          // ------------------------------------------------
          // PLAYER LEFT
          // ------------------------------------------------

          if (
            data.type ===
            "player_left"
          ) {
            setPlayers(
              uniquePlayers(
                data.players,
              ),
            );

            setHostPlayerId(
              data.hostPlayerId,
            );

            setMessages(
              (
                current,
              ) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  playerId:
                    "system",
                  playerName:
                    "SYSTEM",
                  message: `${data.playerName} left the room`,
                  timestamp:
                    Date.now(),
                },
              ],
            );

            playChatSound();

            return;
          }

          // ------------------------------------------------
          // SETTINGS UPDATED
          // ------------------------------------------------

          if (data.type === "settings_updated") {
            setRoomSettings(data.roomSettings);
            setStartingGame(false);
            return;
          }

          // ------------------------------------------------
          // GAME STARTED
          // ------------------------------------------------

          if (
            data.type ===
            "game_started"
          ) {
            setStartingGame(false);

            if (data.roomSettings) {
              setRoomSettings(data.roomSettings);
            }

            setGame(
              data.game,
            );

            setRoundResult(
              null,
            );

            setFinalWinner(
              null,
            );

            setClue("");

            setHasSubmittedClue(
              false,
            );

            setSelectedVote(
              "",
            );

            setVotesSubmitted(
              0,
            );

            setHasSubmittedVote(false);

            return;
          }

          // ------------------------------------------------
          // PRIVATE ROLE
          // ------------------------------------------------

          if (
            data.type ===
            "private_role"
          ) {
            setRole(
              data.role,
            );

            setWord(
              data.word,
            );

            setClue("");

            setHasSubmittedClue(
              false,
            );

            setSelectedVote(
              "",
            );

            return;
          }

          // ------------------------------------------------
          // GAME PHASE
          // ------------------------------------------------

          if (
            data.type ===
            "game_phase"
          ) {
            setGame(
              (
                current,
              ) => ({
                status:
                  "playing",
                round:
                  data.round,
                totalRounds:
                  current?.totalRounds ||
                  roomSettings.rounds,
                phase:
                  data.phase,
                phaseEndsAt:
                  data.phaseEndsAt,
                currentCluePlayerId:
                  data.currentCluePlayerId,
                clues:
                  data.phase === "clue"
                    ? []
                    : current?.clues || [],
              }),
            );

            if (
              data.phase ===
              "clue"
            ) {
              setClue("");

              setHasSubmittedClue(
                false,
              );
            }

            if (
              data.phase ===
              "voting"
            ) {
              setSelectedVote(
                "",
              );

              setVotesSubmitted(
                0,
              );

              setHasSubmittedVote(false);
            }

            if (
              data.phase ===
              "results"
            ) {
              setSelectedVote(
                "",
              );
            }

            return;
          }

          // ------------------------------------------------
          // CLUE
          // ------------------------------------------------

          if (
            data.type ===
            "clue_submitted"
          ) {
            if (data.playerId === id) {
              setHasSubmittedClue(true);
            }

            setGame(
              (
                current,
              ) => {
                if (
                  !current
                ) {
                  return current;
                }

                const exists =
                  current.clues.some(
                    (item) =>
                      item.playerId ===
                      data.playerId,
                  );

                if (exists) {
                  return current;
                }

                return {
                  ...current,
                  clues: [
                    ...current.clues,
                    {
                      playerId:
                        data.playerId,
                      playerName:
                        data.playerName,
                      clue:
                        data.clue,
                    },
                  ],
                };
              },
            );

            return;
          }

          // ------------------------------------------------
          // VOTE UPDATE
          // ------------------------------------------------

          if (
            data.type ===
            "vote_update"
          ) {
            setVotesSubmitted(
              data.votesSubmitted,
            );

            return;
          }

          // ------------------------------------------------
          // ROUND RESULT
          // ------------------------------------------------

          if (
            data.type ===
            "round_results"
          ) {
            setRoundResult(
              data,
            );

            setGame(
              (
                current,
              ) =>
                current
                  ? {
                      ...current,
                      phase:
                        "results",
                    }
                  : current,
            );

            return;
          }

          // ------------------------------------------------
          // GAME FINISHED
          // ------------------------------------------------

          if (
            data.type ===
            "game_finished"
          ) {
            setFinalWinner(
              data.winner,
            );

            setGame(
              (
                current,
              ) =>
                current
                  ? {
                      ...current,
                      status:
                        "finished",
                    }
                  : current,
            );

            return;
          }

          // ------------------------------------------------
          // CHAT
          // ------------------------------------------------

          if (
            data.type ===
            "chat"
          ) {
            const newMessage: ChatMessage =
              {
                id: crypto.randomUUID(),
                playerId:
                  data.playerId,
                playerName:
                  data.playerName,
                message:
                  data.message,
                timestamp:
                  data.timestamp,
              };

            setMessages(
              (current) => {
                const next = [...current, newMessage];
                return next.length > 120
                  ? next.slice(-120)
                  : next;
              },
            );

            if (data.playerId !== id) {
              playChatSound();

              if (!chatNearBottomRef.current) {
                setUnreadChatCount((count) => count + 1);
              }
            }

            return;
          }

          // ------------------------------------------------
          // ERROR
          // ------------------------------------------------

          if (
            data.type ===
            "error"
          ) {
            setStartingGame(false);
            setError(
              data.message,
            );

            return;
          }
        } catch {
          console.error(
            "Invalid server message:",
            event.data,
          );
        }
      };

      socket.onerror = () => {
        if (
          socketRef.current !==
          socket
        ) {
          return;
        }

        setConnection(
          "error",
        );

        setError(
          "Unable to connect to the game server.",
        );
      };

      socket.onclose = () => {
        if (
          socketRef.current !==
          socket
        ) {
          return;
        }

        setConnection(
          (current) =>
            current ===
            "error"
              ? current
              : "disconnected",
        );
      };
    },
    [
      code,
      playChatSound,
    ],
  );

  // =====================================================
  // INITIALIZE
  // =====================================================

  useEffect(() => {
    const id =
      getPlayerId();

    const storedName =
      sessionStorage.getItem(
        "imposter_player_name",
      ) ||
      localStorage.getItem(
        "imposter_player_name",
      );

    setPlayerId(id);

    setPlayerName(
      storedName || "",
    );

    if (!storedName) {
      return;
    }

    sessionStorage.setItem(
      "imposter_player_name",
      storedName,
    );

    connect(
      id,
      storedName,
    );

    return () => {
      const socket =
        socketRef.current;

      socketRef.current =
        null;

      if (
        socket &&
        socket.readyState ===
          WebSocket.OPEN
      ) {
        socket.close(
          1000,
          "Leaving room",
        );
      }
    };
  }, [connect]);

  // =====================================================
  // TIMER
  // =====================================================

  useEffect(() => {
    if (
      !game ||
      game.status !==
        "playing"
    ) {
      setTimeLeft(0);
      return;
    }

    const update = () => {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (game.phaseEndsAt -
              Date.now()) /
              1000,
          ),
        );

      setTimeLeft(
        remaining,
      );
    };

    update();

    const interval =
      setInterval(
        update,
        1000,
      );

    return () =>
      clearInterval(
        interval,
      );
  }, [game]);

  // =====================================================
  // CHAT SCROLL
  // =====================================================

  const updateChatScrollState = useCallback(() => {
    const container = chatScrollRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    chatNearBottomRef.current = distanceFromBottom <= 72;

    if (chatNearBottomRef.current) {
      setUnreadChatCount(0);
    }
  }, []);

  const scrollChatToBottom = useCallback((smooth = false) => {
    const container = chatScrollRef.current;
    if (!container) return;

    if (chatAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(chatAutoScrollFrameRef.current);
    }

    chatAutoScrollFrameRef.current = requestAnimationFrame(() => {
      chatAutoScrollFrameRef.current = null;
      const current = chatScrollRef.current;
      if (!current) return;

      current.scrollTo({
        top: current.scrollHeight,
        left: 0,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  useEffect(() => {
    if (chatNearBottomRef.current) {
      scrollChatToBottom(false);
    }

    return () => {
      if (chatAutoScrollFrameRef.current !== null) {
        cancelAnimationFrame(chatAutoScrollFrameRef.current);
        chatAutoScrollFrameRef.current = null;
      }
    };
  }, [messages, scrollChatToBottom]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(() => {
      if (chatNearBottomRef.current) {
        scrollChatToBottom(false);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [scrollChatToBottom]);

  // =====================================================
  // SEND CHAT

  // =====================================================

  const sendMessage = () => {
    const cleanMessage =
      messageInputRef.current?.value.trim() || "";

    if (
      !cleanMessage ||
      socketRef.current
        ?.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "chat",
        message:
          cleanMessage,
      }),
    );

    if (messageInputRef.current) {
      messageInputRef.current.value = "";
    }
  };

  // =====================================================
  // ROOM SETTINGS
  // =====================================================

  const updateRoomSetting = (patch: Partial<RoomSettings>) => {
    if (
      !isHost ||
      socketRef.current?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const nextSettings = {
      ...roomSettings,
      ...patch,
    };

    setRoomSettings(nextSettings);

    socketRef.current.send(
      JSON.stringify({
        type: "settings_update",
        settings: nextSettings,
      }),
    );
  };

  // =====================================================
  // START GAME
  // =====================================================

  const startGame = () => {
    if (
      !isHost ||
      startingGame ||
      socketRef.current?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    setStartingGame(true);
    setError("");

    socketRef.current.send(
      JSON.stringify({
        type: "start_game",
        settings: roomSettings,
      }),
    );
  };

  // =====================================================
  // SUBMIT CLUE
  // =====================================================

  const currentCluePlayerId =
    game?.currentCluePlayerId ||
    (game?.phase === "clue" && players.length > 0
      ? players[game.clues.length % players.length]?.id
      : undefined);

  const isMyClueTurn =
    game?.phase === "clue" &&
    currentCluePlayerId === playerId;

  const currentCluePlayer =
    players.find((player) => player.id === currentCluePlayerId);

  const submitClue = () => {
    const clean =
      clue.trim();

    if (
      !clean ||
      hasSubmittedClue ||
      !isMyClueTurn ||
      socketRef.current
        ?.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "clue",
        clue: clean,
      }),
    );

    setHasSubmittedClue(
      true,
    );
  };

  // =====================================================
  // VOTE
  // =====================================================

  const submitVote = () => {
    if (
      !selectedVote ||
      hasSubmittedVote ||
      socketRef.current?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "vote",
        targetId:
          selectedVote,
      }),
    );

    setHasSubmittedVote(true);
  };

  // =====================================================
  // COPY
  // =====================================================

  const copyRoomCode =
    async () => {
      try {
        await navigator.clipboard.writeText(
          code,
        );

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 1500);
      } catch {
        // Clipboard unavailable.
      }
    };

  // =====================================================
  // RETRY
  // =====================================================

  const retryConnection =
    () => {
      if (
        !playerId ||
        !playerName
      ) {
        return;
      }

      setConnection(
        "connecting",
      );

      setError("");

      if (
        socketRef.current
      ) {
        socketRef.current.close();

        socketRef.current =
          null;
      }

      connect(
        playerId,
        playerName,
      );
    };

  // =====================================================
  // NO NAME
  // =====================================================

  if (!playerName) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070611] px-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-6 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/10">
            <Users className="h-6 w-6 text-violet-300" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            Enter your name
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/40">
            Go back and enter
            your player name
            before joining this
            room.
          </p>

          <motion.button
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.98,
            }}
            onClick={() =>
              router.push(
                "/join",
              )
            }
            className="mt-6 h-12 w-full rounded-2xl bg-white font-semibold text-[#070611]"
          >
            Go to Join Game
          </motion.button>
        </div>
      </main>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070611] text-white">
      {/* Background */}

      <div className="pointer-events-none fixed inset-0">
        <motion.div
          className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-violet-500/10 blur-3xl"
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
            duration: 20,
            repeat:
              Infinity,
            ease:
              "easeInOut",
          }}
        />

        <motion.div
          className="absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-indigo-500/10 blur-3xl"
          animate={{
            x: [0, -60, -20, 0],
            y: [0, -40, -90, 0],
            scale: [
              1,
              0.95,
              1.06,
              1,
            ],
          }}
          transition={{
            duration: 23,
            repeat:
              Infinity,
            ease:
              "easeInOut",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0b0b12_80%)]" />
      </div>

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="relative z-10 border-b border-white/10 bg-[#070611]/60 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <motion.button
            whileHover={{
              x: -2,
            }}
            whileTap={{
              scale: 0.94,
            }}
            onClick={() =>
              router.push(
                "/",
              )
            }
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />

            <span className="hidden sm:inline">
              Leave
            </span>
          </motion.button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
              Room
            </span>

            <motion.button
              whileTap={{
                scale: 0.96,
              }}
              onClick={
                copyRoomCode
              }
              className="group mt-0.5 flex items-center gap-2"
            >
              <span className="text-lg font-semibold tracking-[0.2em]">
                {code}
              </span>

              <AnimatePresence
                mode="wait"
              >
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{
                      opacity: 0,
                      scale: 0.7,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.7,
                    }}
                  >
                    <Check className="h-4 w-4 text-emerald-300" />
                  </motion.div>
                ) : (
                  <Copy className="h-4 w-4 text-white/30 transition group-hover:text-white" />
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
              connection ===
              "connected"
                ? "border-emerald-300/10 bg-emerald-300/5 text-emerald-200/70"
                : connection ===
                    "connecting"
                  ? "border-amber-300/10 bg-amber-300/5 text-amber-200/70"
                  : "border-red-300/10 bg-red-300/5 text-red-200/70"
            }`}
          >
            {connection ===
            "connected" ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}

            <span className="hidden sm:inline">
              {connection ===
              "connected"
                ? "Connected"
                : connection ===
                    "connecting"
                  ? "Connecting"
                  : "Disconnected"}
            </span>

            {connection ===
              "connected" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            )}
          </div>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-4 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5 lg:grid-cols-[1fr_390px]">
        {/* =================================================
            LEFT
        ================================================= */}

        <div className="min-h-0 rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl sm:min-h-[500px] sm:p-6">
          {/* =================================================
              LOBBY
          ================================================= */}

          {!game && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-violet-300" />

                    <h1 className="text-xl font-semibold">
                      Players
                    </h1>
                  </div>

                  <p className="mt-1 text-sm text-white/35">
                    Waiting for
                    everyone to
                    join
                  </p>
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
                  {players.length}/
                  {
                    roomSettings.players
                  }
                </div>
              </div>

              {/* Error */}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -5,
                    }}
                    className="mt-5 rounded-2xl border border-red-300/10 bg-red-300/5 p-4 text-sm text-red-200/70"
                  >
                    {error}

                    {connection !==
                      "connected" && (
                      <button
                        onClick={
                          retryConnection
                        }
                        className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs text-white"
                      >
                        Try again
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Players */}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {players.map(
                    (
                      player,
                    ) => {
                      const isMe =
                        player.id ===
                        playerId;

                      const host =
                        player.id ===
                        hostPlayerId;

                      return (
                        <motion.div
                          key={
                            player.id
                          }
                          layout
                          initial={{
                            opacity: 0,
                            scale: 0.94,
                            y: 10,
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.94,
                            y: -10,
                          }}
                          className={`relative overflow-hidden rounded-2xl border p-4 ${
                            isMe
                              ? "border-violet-300/20 bg-violet-400/[0.08]"
                              : "border-white/10 bg-white/[0.025]"
                          }`}
                        >
                          <div className="relative flex items-center gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold ${getAvatarStyle(
                                player.name,
                              )}`}
                            >
                              {player.name
                                .slice(
                                  0,
                                  1,
                                )
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {
                                    player.name
                                  }
                                </span>

                                {isMe && (
                                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/40">
                                    You
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/30">
                                <Circle className="h-2 w-2 fill-emerald-300 text-emerald-300" />
                                Online
                              </div>
                            </div>

                            {host && (
                              <div className="flex items-center gap-1.5 rounded-full bg-amber-300/10 px-2 py-1">
                                <Crown className="h-3.5 w-3.5 text-amber-200/80" />

                                <span className="hidden text-[10px] uppercase tracking-wider text-amber-200/70 sm:inline">
                                  Host
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    },
                  )}
                </AnimatePresence>
              </div>

              {/* Settings */}

              <div className="mt-6 overflow-hidden rounded-3xl border border-fuchsia-400/10 bg-gradient-to-br from-fuchsia-500/[0.07] via-violet-500/[0.04] to-cyan-400/[0.05] p-4 shadow-2xl shadow-violet-950/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-fuchsia-400/10 p-2">
                      <SlidersHorizontal className="h-4 w-4 text-fuchsia-300" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                        Game settings
                      </span>
                      <p className="mt-0.5 text-[11px] text-white/25">
                        {isHost ? "Tune the chaos before you start" : "Set by the host"}
                      </p>
                    </div>
                  </div>

                  {isHost && (
                    <span className="flex items-center gap-1.5 rounded-full border border-amber-300/10 bg-amber-300/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/70">
                      <Crown className="h-3 w-3" />
                      Host
                    </span>
                  )}
                </div>

                {isHost ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <SettingSelect
                      label="Players"
                      value={roomSettings.players}
                      options={[2, 3, 4, 5, 6, 7, 8, 9, 10]}
                      suffix=" players"
                      onChange={(value) =>
                        updateRoomSetting({ players: value })
                      }
                    />
                    <SettingSelect
                      label="Rounds"
                      value={roomSettings.rounds}
                      options={[3, 5, 7, 10]}
                      suffix=" rounds"
                      onChange={(value) =>
                        updateRoomSetting({ rounds: value })
                      }
                    />
                    <SettingSelect
                      label="Clue time"
                      value={roomSettings.clueTime}
                      options={[15, 30, 45, 60]}
                      suffix=" sec"
                      onChange={(value) =>
                        updateRoomSetting({ clueTime: value })
                      }
                    />
                    <SettingSelect
                      label="Discussion"
                      value={roomSettings.discussionTime}
                      options={[30, 45, 60, 90]}
                      suffix=" sec"
                      onChange={(value) =>
                        updateRoomSetting({ discussionTime: value })
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <SettingPill label="Players" value={roomSettings.players} />
                    <SettingPill label="Rounds" value={roomSettings.rounds} />
                    <SettingPill label="Clue" value={`${roomSettings.clueTime}s`} />
                    <SettingPill label="Talk" value={`${roomSettings.discussionTime}s`} />
                  </div>
                )}
              </div>

              {/* START */}

              {isHost && (
                <motion.button
                  whileHover={{
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={
                    startGame
                  }
                  disabled={
                    players.length < 2 ||
                    players.length > roomSettings.players ||
                    startingGame
                  }
                  className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 font-semibold text-white shadow-xl shadow-violet-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Play className="h-5 w-5 fill-current" />

                  Start Game
                </motion.button>
              )}

              {!isHost && (
                <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center">
                  <Crown className="mx-auto h-5 w-5 text-amber-200/50" />

                  <p className="mt-2 text-sm text-white/40">
                    Waiting for the
                    host to start
                    the game...
                  </p>
                </div>
              )}
            </>
          )}

          {/* =================================================
              GAME
          ================================================= */}

          {game && (
            <div>
              {/* Game Header */}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-violet-300" />

                    <h1 className="text-xl font-semibold">
                      {game.status ===
                      "finished"
                        ? "Game Over"
                        : phaseLabel(
                            game.phase,
                          )}
                    </h1>
                  </div>

                  <p className="mt-1 text-sm text-white/35">
                    {game.status ===
                    "finished"
                      ? "Thanks for playing."
                      : phaseDescription(
                          game.phase,
                        )}
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
                  Round{" "}
                  {game.round}/
                  {
                    game.totalRounds
                  }
                </div>
              </div>

              {/* Phase rail */}

              {game.status === "playing" && (
                <div className="mt-5 grid grid-cols-4 gap-1.5">
                  {(["clue", "discussion", "voting", "results"] as GamePhase[]).map((phase) => {
                    const active = game.phase === phase;
                    const phaseOrder = ["clue", "discussion", "voting", "results"];
                    const currentIndex = phaseOrder.indexOf(game.phase);
                    const phaseIndex = phaseOrder.indexOf(phase);
                    const complete = phaseIndex < currentIndex;
                    return (
                      <div
                        key={phase}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          active
                            ? "bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300 shadow-lg shadow-violet-500/30"
                            : complete
                              ? "bg-violet-400/50"
                              : "bg-white/10"
                        }`}
                      />
                    );
                  })}
                </div>
              )}

              {/* Timer */}

              {game.status ===
                "playing" &&
                game.phase !==
                  "results" && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className={`flex items-center gap-3 rounded-2xl border px-6 py-3 shadow-xl ${
                        timeLeft <= 5
                          ? "border-rose-400/30 bg-rose-500/10 shadow-rose-500/10"
                          : "border-violet-300/15 bg-gradient-to-r from-fuchsia-500/[0.08] via-violet-500/[0.08] to-cyan-400/[0.06] shadow-violet-500/10"
                      }`}>
                      <Clock className={`h-4 w-4 ${timeLeft <= 5 ? "text-rose-300" : "text-violet-300"}`} />

                      <span className={`text-2xl font-bold tabular-nums ${timeLeft <= 5 ? "text-rose-200" : "text-white"}`}>
                        {timeLeft}s
                      </span>
                    </div>
                  </div>
                )}

              {/* =================================================
                  PRIVATE ROLE CARD
              ================================================= */}

              {game.status ===
                "playing" &&
                role && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className={`mt-6 rounded-3xl border p-6 text-center ${
                      role ===
                      "imposter"
                        ? "border-red-300/15 bg-red-400/[0.06]"
                        : "border-emerald-300/15 bg-emerald-400/[0.05]"
                    }`}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                      {role ===
                      "imposter" ? (
                        <EyeOff className="h-7 w-7 text-red-200/80" />
                      ) : (
                        <Eye className="h-7 w-7 text-emerald-200/80" />
                      )}
                    </div>

                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/30">
                      Your role
                    </p>

                    <h2
                      className={`mt-1 text-2xl font-bold ${
                        role ===
                        "imposter"
                          ? "text-red-200"
                          : "text-emerald-200"
                      }`}
                    >
                      {role ===
                      "imposter"
                        ? "IMPOSTER"
                        : "CIVILIAN"}
                    </h2>

                    {role ===
                    "civilian" ? (
                      <>
                        <p className="mt-4 text-xs uppercase tracking-wider text-white/25">
                          Secret word
                        </p>

                        <p className="mt-1 text-3xl font-semibold">
                          {word}
                        </p>

                        <p className="mt-3 text-xs text-white/30">
                          Keep the word
                          secret.
                        </p>
                      </>
                    ) : (
                      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-red-100/50">
                        You don't know
                        the word.
                        Blend in, listen
                        carefully, and
                        convince everyone
                        you're innocent.
                      </p>
                    )}
                  </motion.div>
                )}

              {/* =================================================
                  CLUE PHASE
              ================================================= */}

              {game.status ===
                "playing" &&
                game.phase ===
                  "clue" && (
                  <div className="mt-5 overflow-hidden rounded-3xl border border-fuchsia-400/15 bg-gradient-to-br from-fuchsia-500/[0.11] via-violet-500/[0.05] to-cyan-400/[0.06] p-5 shadow-2xl shadow-violet-950/15">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/50">
                          Clue turn
                        </p>
                        <p className="mt-1 text-lg font-bold">
                          {isMyClueTurn
                            ? "Your turn! 🎯"
                            : currentCluePlayer
                              ? `${currentCluePlayer.name}'s turn`
                              : "Waiting for the next player"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/10 px-3 py-2 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-white/30">
                          Clues
                        </div>
                        <div className="text-sm font-bold text-white/80">
                          {game.clues.length}/{players.length}
                        </div>
                      </div>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-white/35">
                      {isMyClueTurn
                        ? "Give a subtle clue. Everyone is watching 👀"
                        : currentCluePlayer
                          ? `Watch ${currentCluePlayer.name}. You'll get a turn after them.`
                          : "The next turn will appear here."}
                    </p>

                    <div className="mt-4 flex gap-2">
                      <input
                        value={clue}
                        onChange={(
                          event,
                        ) =>
                          setClue(
                            event.target.value.slice(
                              0,
                              100,
                            ),
                          )
                        }
                        onKeyDown={(
                          event,
                        ) => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            submitClue();
                          }
                        }}
                        disabled={
                          hasSubmittedClue ||
                          !isMyClueTurn
                        }
                        placeholder={
                          isMyClueTurn
                            ? "Give a subtle clue..."
                            : "Wait for your turn..."
                        }
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none placeholder:text-white/20 focus:border-violet-300/20 disabled:opacity-40"
                      />

                      <motion.button
                        whileTap={{
                          scale: 0.94,
                        }}
                        onClick={
                          submitClue
                        }
                        disabled={
                          !clue.trim() ||
                          hasSubmittedClue ||
                          !isMyClueTurn
                        }
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#070611] disabled:opacity-20"
                      >
                        <Send className="h-4 w-4" />
                      </motion.button>
                    </div>

                    {hasSubmittedClue && (
                      <p className="mt-3 text-xs font-medium text-emerald-300/70">
                        ✓ Clue submitted — watch the others!
                      </p>
                    )}
                  </div>
                )}

              {/* =================================================
                  CLUES
              ================================================= */}

              {game.clues.length >
                0 && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/25">
                    Clues
                  </p>

                  <div className="mt-3 space-y-2">
                    {game.clues.map(
                      (
                        item,
                        index,
                      ) => (
                        <motion.div
                          key={
                            item.playerId
                          }
                          initial={{
                            opacity: 0,
                            x: -8,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[10px] font-bold text-white/35">
                            {index + 1}
                          </span>

                          <span className="min-w-0 flex-1 text-sm font-medium text-violet-200/70">
                            {item.playerName}
                          </span>

                          <span className="text-right text-sm text-white/60">
                            {item.clue}
                          </span>
                        </motion.div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* =================================================
                  DISCUSSION
              ================================================= */}

              {game.status ===
                "playing" &&
                game.phase ===
                  "discussion" && (
                  <div className="mt-5 rounded-2xl border border-violet-300/10 bg-violet-400/[0.04] p-5 text-center">
                    <MessageCircle className="mx-auto h-6 w-6 text-violet-300/70" />

                    <p className="mt-3 text-sm text-white/60">
                      Discussion is
                      open.
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Use the lobby
                      chat to accuse,
                      defend and
                      investigate.
                    </p>
                  </div>
                )}

              {/* =================================================
                  VOTING
              ================================================= */}

              {game.status ===
                "playing" &&
                game.phase ===
                  "voting" && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/25">
                          Vote
                        </p>

                        <p className="mt-1 text-sm text-white/40">
                          Who is the
                          imposter?
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <Vote className="h-4 w-4" />

                        {
                          votesSubmitted
                        }
                        /
                        {
                          players.length
                        }
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {players.map(
                        (
                          player,
                        ) => {
                          const selected =
                            selectedVote ===
                            player.id;

                          const isMe =
                            player.id ===
                            playerId;

                          return (
                            <button
                              key={
                                player.id
                              }
                              onClick={() =>
                                !isMe &&
                                !hasSubmittedVote &&
                                setSelectedVote(player.id)
                              }
                              disabled={
                                isMe || hasSubmittedVote
                              }
                              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                isMe
                                  ? "cursor-not-allowed border-white/5 bg-white/[0.015] opacity-30"
                                  : selected
                                    ? "border-violet-300/30 bg-violet-400/10"
                                    : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                              }`}
                            >
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold ${getAvatarStyle(
                                  player.name,
                                )}`}
                              >
                                {player.name
                                  .slice(
                                    0,
                                    1,
                                  )
                                  .toUpperCase()}
                              </div>

                              <span className="min-w-0 flex-1 truncate text-sm">
                                {
                                  player.name
                                }
                              </span>

                              {selected && (
                                <Check className="h-4 w-4 text-violet-300" />
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <motion.button
                      whileTap={{
                        scale: 0.98,
                      }}
                      onClick={
                        submitVote
                      }
                      disabled={
                        !selectedVote ||
                        hasSubmittedVote
                      }
                      className={`mt-4 h-12 w-full rounded-xl font-semibold transition ${
                        hasSubmittedVote
                          ? "bg-emerald-300/15 text-emerald-200"
                          : "bg-white text-[#070611] disabled:opacity-20"
                      }`}
                    >
                      {hasSubmittedVote ? (
                        <span className="flex items-center justify-center gap-2">
                          <Check className="h-4 w-4" />
                          Vote Submitted
                        </span>
                      ) : (
                        "Submit Vote"
                      )}
                    </motion.button>
                  </div>
                )}

              {/* =================================================
                  RESULTS
              ================================================= */}

              {roundResult && (
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.97,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10">
                    {roundResult.civiliansWon ? (
                      <Trophy className="h-7 w-7 text-amber-200/80" />
                    ) : (
                      <Skull className="h-7 w-7 text-red-200/80" />
                    )}
                  </div>

                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/25">
                    Round{" "}
                    {
                      roundResult.round
                    }{" "}
                    result
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {roundResult.civiliansWon
                      ? "Civilians caught the imposter!"
                      : "The imposter survived!"}
                  </h2>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-white/20">
                        Imposter
                      </p>

                      <p className="mt-1 text-sm text-red-200/80">
                        {
                          roundResult.imposterName
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-white/20">
                        Word
                      </p>

                      <p className="mt-1 text-sm text-emerald-200/80">
                        {
                          roundResult.word
                        }
                      </p>
                    </div>
                  </div>

                  {roundResult.eliminatedName && (
                    <p className="mt-4 text-xs text-white/30">
                      Most voted:{" "}
                      <span className="text-white/60">
                        {
                          roundResult.eliminatedName
                        }
                      </span>
                    </p>
                  )}
                </motion.div>
              )}

              {/* =================================================
                  FINAL
              ================================================= */}

              {finalWinner && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 15,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="mt-6 rounded-3xl border border-violet-300/10 bg-violet-400/[0.06] p-8 text-center"
                >
                  <Trophy className="mx-auto h-10 w-10 text-amber-200/80" />

                  <h2 className="mt-4 text-3xl font-bold">
                    {finalWinner ===
                    "civilians"
                      ? "Civilians Win!"
                      : "Imposter Wins!"}
                  </h2>

                  <p className="mt-2 text-sm text-white/35">
                    The game has
                    ended.
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            CHAT
        ================================================= */}

        <div className="flex h-[calc(100svh-120px)] min-h-[430px] max-h-[700px] flex-col overflow-hidden rounded-3xl border border-fuchsia-400/10 bg-gradient-to-b from-white/[0.045] to-white/[0.02] shadow-2xl shadow-black/20 backdrop-blur-xl lg:h-auto lg:min-h-0 lg:max-h-none">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <div className="relative rounded-xl bg-violet-400/10 p-2.5">
              <MessageCircle className="h-4 w-4 text-violet-300" />

              {messages.length >
                0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-violet-300" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="font-medium">
                Lobby chat
              </h2>

              <p className="text-xs text-white/30">
                {game
                  ? "Talk, accuse, confuse everyone."
                  : "Talk, accuse, confuse everyone."}
              </p>
            </div>

            <div className="ml-auto rounded-full border border-emerald-300/10 bg-emerald-300/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-200/50">
              Live
            </div>
          </div>

          {/* Messages */}

          <div
            ref={chatScrollRef}
            onScroll={updateChatScrollState}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-3 py-4 [scrollbar-width:thin] [scrollbar-gutter:stable] sm:space-y-4 sm:px-4 sm:py-5"
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorY: "contain",
              touchAction: "pan-y",
            }}
          >
            {messages.length ===
              0 && (
              <div className="flex h-full min-h-[400px] items-center justify-center">
                <div className="px-6 text-center">
                  <MessageCircle className="mx-auto h-7 w-7 text-white/15" />

                  <p className="mt-3 text-sm text-white/25">
                    No messages yet.
                  </p>

                  <p className="mt-1 text-xs text-white/15">
                    The chaos starts
                    when your friends
                    arrive.
                  </p>
                </div>
              </div>
            )}

            {messages.map(
              (item) => {
                const system =
                  item.playerId ===
                  "system";

                const mine =
                  item.playerId ===
                  playerId;

                if (system) {
                  return (
                    <div
                      key={item.id}
                      className="py-1 text-center"
                    >
                      <span className="rounded-full border border-white/5 bg-white/[0.025] px-3 py-1 text-[10px] text-white/25">
                        {
                          item.message
                        }
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`flex ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[88%] flex-col ${
                        mine
                          ? "items-end"
                          : "items-start"
                      }`}
                    >
                      <div
                        className={`mb-1 flex items-center gap-1.5 px-1 ${
                          mine
                            ? "flex-row-reverse"
                            : ""
                        }`}
                      >
                        <span className="text-[11px] font-medium text-violet-300/70">
                          {
                            item.playerName
                          }
                        </span>

                        {mine && (
                          <span className="rounded-full bg-violet-300/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-violet-200/50">
                            You
                          </span>
                        )}

                        <span className="text-[9px] text-white/15">
                          {formatTime(
                            item.timestamp,
                          )}
                        </span>
                      </div>

                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                          mine
                            ? "rounded-br-md bg-gradient-to-br from-fuchsia-500/20 via-violet-500/20 to-indigo-500/15 text-white shadow-lg shadow-violet-950/10"
                            : "rounded-bl-md bg-white/[0.065] text-white/75"
                        }`}
                      >
                        {
                          item.message
                        }
                      </div>
                    </div>
                  </div>
                );
              },
            )}

          </div>

          {unreadChatCount > 0 && !chatNearBottomRef.current && (
            <button
              type="button"
              onClick={() => {
                chatNearBottomRef.current = true;
                setUnreadChatCount(0);
                scrollChatToBottom(true);
              }}
              className="mx-auto -mb-2 z-10 rounded-full border border-violet-300/20 bg-violet-500/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-violet-950/40 backdrop-blur-md"
            >
              {unreadChatCount} new message{unreadChatCount === 1 ? "" : "s"} ↓
            </button>
          )}

          {/* Input */}

          <div className="border-t border-white/10 bg-[#0b0a14]/70 p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5 transition-colors focus-within:border-violet-300/20">
              <input
                ref={messageInputRef}
                maxLength={300}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  game
                    ? "Chat during the game..."
                    : "Say something suspicious..."
                }
                disabled={
                  connection !==
                  "connected"
                }
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/20"
              />

              <button
                onClick={
                  sendMessage
                }
                disabled={
                  connection !==
                    "connected"
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#070611] disabled:opacity-20"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SettingSelect({
  label,
  value,
  options,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="group block rounded-2xl border border-white/10 bg-black/15 p-3 transition hover:border-fuchsia-300/20 hover:bg-white/[0.035]">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
        {label}
      </span>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2.5 pr-8 text-sm font-semibold text-white outline-none transition focus:border-fuchsia-300/30 focus:ring-2 focus:ring-fuchsia-400/10"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#12101f] text-white">
              {option}{suffix}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">⌄</span>
      </div>
    </label>
  );
}

function SettingPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-white/20">
        {label}
      </p>

      <p className="mt-1 text-sm text-white/55">
        {value}
      </p>
    </div>
  );
}