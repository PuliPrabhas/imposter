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
  useLayoutEffect,
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

type VoteDetail = {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
};

type ScoreEntry = {
  playerId: string;
  playerName: string;
  score: number;
  roundPoints: number;
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
      votes: VoteDetail[];
      roundScores: Record<string, number>;
      scores: Record<string, number>;
      scoreboard: ScoreEntry[];
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
      scores: Record<string, number>;
      scoreboard: ScoreEntry[];
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

  // Chat scrolling is deliberately managed independently from the page.
  // This avoids the mobile nested-flex/overflow bug where the chat body
  // becomes part of the page scroll instead of being its own scroll surface.
  const chatShouldStickRef = useRef(true);
  const chatUnreadRef = useRef(0);

  const [chatUnread, setChatUnread] =
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

  const [finalScoreboard, setFinalScoreboard] =
    useState<ScoreEntry[]>([]);

  const isHost =
    hostPlayerId ===
      playerId &&
    playerId !== "";

  // =====================================================
  // CHAT SCROLLING
  // =====================================================

  const isChatNearBottom = useCallback(() => {
    const container = chatScrollRef.current;
    if (!container) return true;

    return (
      container.scrollHeight -
        container.scrollTop -
        container.clientHeight <= 48
    );
  }, []);

  const scrollChatToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = chatScrollRef.current;
      if (!container) return;

      chatShouldStickRef.current = true;
      chatUnreadRef.current = 0;
      setChatUnread(0);

      if (behavior === "smooth") {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    },
    [],
  );

  const handleChatScroll = useCallback(() => {
    const atBottom = isChatNearBottom();

    chatShouldStickRef.current = atBottom;

    if (atBottom && chatUnreadRef.current > 0) {
      chatUnreadRef.current = 0;
      setChatUnread(0);
    }
  }, [isChatNearBottom]);

  // Run after messages render so the browser has the new scrollHeight.
  useLayoutEffect(() => {
    if (!chatShouldStickRef.current) return;

    const container = chatScrollRef.current;
    if (!container) return;

    const frame = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [messages]);

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

            setFinalScoreboard([]);

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
                    ? current?.round === data.round
                      ? current?.clues || []
                      : []
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

            setFinalScoreboard(
              data.scoreboard || [],
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

            const shouldAutoScroll =
              chatShouldStickRef.current ||
              isChatNearBottom();

            if (!shouldAutoScroll) {
              chatUnreadRef.current += 1;
              setChatUnread(chatUnreadRef.current);
            }

            setMessages(
              (current) => {
                const next = [...current, newMessage];
                return next.length > 120
                  ? next.slice(-120)
                  : next;
              },
            );

            if (
              data.playerId !==
              id
            ) {
              playChatSound();
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
      isChatNearBottom,
    ],
  );

  // =====================================================
  // INITIALIZE
  // =====================================================

  useEffect(() => {
  const id = getPlayerId();

  const storedName =
    sessionStorage.getItem(
      "imposter_player_name",
    );

  setPlayerId(id);

  setPlayerName(
    storedName || "",
  );

  if (!storedName) {
    return;
  }

  connect(
    id,
    storedName,
  );

  return () => {
    const socket =
      socketRef.current;

    socketRef.current = null;

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

    // Send the current UI selections with the start command as well.
    // This makes PLAY atomic from the user's point of view: even if the
    // settings_update packet is still in flight, the server starts with
    // exactly what is currently selected in the UI.
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
      <main className="min-h-[100dvh] bg-[#dff3ff] px-5 py-8 text-[#20263d]">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center">
          <div className="w-full rounded-[34px] border-4 border-[#20263d] bg-white p-7 text-center shadow-[0_10px_0_#20263d]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#ffd34d] text-4xl shadow-[0_7px_0_#20263d]">
              🕵️
            </div>
            <h1 className="mt-7 text-4xl font-black tracking-tight">WHO ARE YOU?</h1>
            <p className="mt-3 font-bold text-[#68718e]">Enter your name from the join screen before entering this room.</p>
            <button onClick={() => router.push("/join")} className="mt-7 h-14 w-full rounded-full border-4 border-[#20263d] bg-[#20c4e8] text-lg font-black text-white shadow-[0_6px_0_#20263d] active:translate-y-1 active:shadow-[0_2px_0_#20263d]">GO TO JOIN</button>
          </div>
        </div>
      </main>
    );
  }

  const phaseTheme =
    game?.phase === "voting"
      ? { bg: "#ffd34d", accent: "#ff5f5f", title: "VOTE!", icon: "🗳️" }
      : game?.phase === "discussion"
        ? { bg: "#7bd13f", accent: "#20c4e8", title: "DISCUSSION!", icon: "💬" }
        : game?.phase === "results"
          ? { bg: "#b28cff", accent: "#ff5f5f", title: "RESULTS!", icon: "🏆" }
          : { bg: "#20c4e8", accent: "#ff5f5f", title: "GIVE YOUR CLUE!", icon: "💡" };

  // A clue timer belongs ONLY to the player whose clue turn is active.
  // Other players see a waiting state instead of watching someone else's
  // countdown, which also makes the UI match the server's per-player timer.
  const clueTurnActive =
    game?.phase === "clue" &&
    isMyClueTurn;

  const timerTotal =
    game?.phase === "clue"
      ? roomSettings.clueTime
      : game?.phase === "discussion"
        ? roomSettings.discussionTime
        : game?.phase === "voting"
          ? 30
          : 8;

  const timerVisible =
    game?.phase !== "clue" ||
    clueTurnActive;

  const timerPercent =
    timerVisible && timerTotal > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (timeLeft / timerTotal) * 100,
          ),
        )
      : 0;

  const playerColors = [
    "bg-[#ff625f]",
    "bg-[#20b6d5]",
    "bg-[#7bd13f]",
    "bg-[#ffb84d]",
    "bg-[#a98af4]",
    "bg-[#f276b9]",
    "bg-[#38c6a7]",
    "bg-[#ff8b45]",
    "bg-[#5f9df7]",
    "bg-[#d5c14a]",
  ];

  const renderPlayerCard = (player: Player, index: number, mode: "lobby" | "vote" = "lobby") => {
    const isMe = player.id === playerId;
    const host = player.id === hostPlayerId;
    const selected = selectedVote === player.id;

    if (mode === "vote") {
      return (
        <motion.button
          key={player.id}
          whileTap={!isMe && !hasSubmittedVote ? { scale: 0.98 } : undefined}
          onClick={() => !isMe && !hasSubmittedVote && setSelectedVote(player.id)}
          disabled={isMe || hasSubmittedVote}
          className={`relative min-h-28 overflow-hidden rounded-[28px] border-4 border-[#20263d] p-5 text-left shadow-[0_7px_0_#20263d] transition ${playerColors[index % playerColors.length]} ${selected ? "ring-8 ring-white/80" : ""} ${isMe ? "opacity-35" : ""}`}
        >
          <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl border-3 border-[#20263d] bg-white/75 text-xl font-black text-[#20263d]">
            {selected ? "✓" : index + 1}
          </div>
          <div className="pr-14 text-2xl font-black tracking-tight text-[#20263d]">{player.name}</div>
          <div className="mt-2 text-xs font-black uppercase tracking-wider text-[#20263d]/60">{isMe ? "YOU CAN'T VOTE YOURSELF" : selected ? "YOUR VOTE" : "TAP TO VOTE"}</div>
        </motion.button>
      );
    }

    return (
      <motion.div
        key={player.id}
        layout
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        className={`relative overflow-hidden rounded-[28px] border-4 border-[#20263d] p-5 shadow-[0_7px_0_#20263d] ${playerColors[index % playerColors.length]}`}
      >
        <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-white/20" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border-4 border-[#20263d] bg-white/80 text-xl font-black text-[#20263d] shadow-[0_3px_0_#20263d]">
            {player.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-xl font-black text-[#20263d]">{player.name}</span>
              {isMe && <span className="rounded-full border-2 border-[#20263d] bg-white/80 px-2 py-0.5 text-[9px] font-black uppercase text-[#20263d]">YOU</span>}
            </div>
            <div className="mt-1 text-xs font-black uppercase tracking-wider text-[#20263d]/60">● ONLINE {host ? "• HOST 👑" : ""}</div>
          </div>
          <div className="hidden rounded-2xl border-3 border-[#20263d] bg-white/75 px-3 py-2 text-xs font-black text-[#20263d] sm:block">#{index + 1}</div>
        </div>
      </motion.div>
    );
  };

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#dff3ff] text-[#20263d]">
      {/* playful question-mark background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-10 top-16 rotate-12 text-[150px] font-black leading-none text-[#cbe8f7]">?</div>
        <div className="absolute right-[-25px] top-40 -rotate-12 text-[190px] font-black leading-none text-[#cbe8f7]">?</div>
        <div className="absolute left-10 bottom-16 -rotate-6 text-[180px] font-black leading-none text-[#cbe8f7]">?</div>
        <div className="absolute right-16 bottom-[-20px] rotate-12 text-[160px] font-black leading-none text-[#cbe8f7]">?</div>
      </div>

      <header className="relative z-20 border-b-4 border-[#20263d] bg-white/95 shadow-[0_5px_0_#20263d]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button onClick={() => router.push("/")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-[#20263d] bg-white text-2xl font-black shadow-[0_4px_0_#20263d] active:translate-y-1 active:shadow-none" aria-label="Leave room">
            ←
          </button>

          <div className="min-w-0 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#73809f]">IMPOSTOR ROOM</div>
            <button onClick={copyRoomCode} className="mt-0.5 flex items-center gap-2 text-xl font-black tracking-[0.18em] text-[#20263d]">
              {code}
              <span className="text-sm">{copied ? "✓" : "⧉"}</span>
            </button>
          </div>

          <div className={`flex h-12 shrink-0 items-center gap-2 rounded-full border-4 border-[#20263d] px-3 text-xs font-black shadow-[0_4px_0_#20263d] ${connection === "connected" ? "bg-[#7bd13f]" : connection === "connecting" ? "bg-[#ffd34d]" : "bg-[#ff625f]"}`}>
            <span>{connection === "connected" ? "●" : "!"}</span>
            <span className="hidden sm:inline">{connection === "connected" ? "LIVE" : connection === "connecting" ? "CONNECTING" : "OFFLINE"}</span>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-0 min-h-[calc(100dvh-84px)] max-w-7xl gap-5 px-3 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 min-h-0">
          {!game ? (
            <div className="space-y-5">
              <div className="rounded-[36px] border-4 border-[#20263d] bg-[#303a70] p-6 text-center text-white shadow-[0_9px_0_#20263d] sm:p-9">
                <div className="text-5xl">🕵️</div>
                <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">IMPOSTOR</h1>
                <p className="mx-auto mt-3 max-w-2xl text-base font-bold leading-6 text-white/90 sm:text-lg">Give smart clues. Spot the liar. Make everyone suspicious.</p>
                <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-full border-4 border-[#20263d] bg-white/15 px-4 py-3 font-black">
                  <span className="text-[#ffd34d]">ROOM</span> {code} <span className="text-white/50">•</span> {players.length}/{roomSettings.players} PLAYERS
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[24px] border-4 border-[#20263d] bg-[#ff625f] p-4 font-black shadow-[0_6px_0_#20263d]">
                    {error}
                    {connection !== "connected" && <button onClick={retryConnection} className="ml-3 rounded-full border-3 border-[#20263d] bg-white px-4 py-2 text-xs font-black">TRY AGAIN</button>}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-[32px] border-4 border-[#20263d] bg-white p-5 shadow-[0_8px_0_#20263d] sm:p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.2em] text-[#7b86a5]">PLAYERS</div>
                    <h2 className="mt-1 text-3xl font-black">Who is in? 👀</h2>
                  </div>
                  <div className="rounded-full border-3 border-[#20263d] bg-[#ffd34d] px-4 py-2 text-sm font-black shadow-[0_3px_0_#20263d]">{players.length} / {roomSettings.players}</div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {players.map((player, index) => renderPlayerCard(player, index))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="rounded-[32px] border-4 border-[#20263d] bg-[#303a70] p-5 text-white shadow-[0_8px_0_#20263d] sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-white/60">GAME SETTINGS</div>
                    <h2 className="mt-1 text-2xl font-black">Set the chaos</h2>
                  </div>
                  {isHost && <span className="rounded-full border-3 border-[#20263d] bg-[#ffd34d] px-3 py-1 text-xs font-black text-[#20263d]">👑 HOST</span>}
                </div>
                {isHost ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <SettingSelect label="Players" value={roomSettings.players} options={[2,3,4,5,6,7,8,9,10]} suffix=" players" onChange={(value) => updateRoomSetting({ players: value })} />
                    <SettingSelect label="Rounds" value={roomSettings.rounds} options={[1,3,5,7,10]} suffix=" rounds" onChange={(value) => updateRoomSetting({ rounds: value })} />
                    <SettingSelect label="Clue" value={roomSettings.clueTime} options={[15,30,45,60]} suffix=" sec" onChange={(value) => updateRoomSetting({ clueTime: value })} />
                    <SettingSelect label="Discussion" value={roomSettings.discussionTime} options={[30,45,60,90]} suffix=" sec" onChange={(value) => updateRoomSetting({ discussionTime: value })} />
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    <SettingPill label="Players" value={roomSettings.players} />
                    <SettingPill label="Rounds" value={roomSettings.rounds} />
                    <SettingPill label="Clue" value={`${roomSettings.clueTime}s`} />
                    <SettingPill label="Talk" value={`${roomSettings.discussionTime}s`} />
                  </div>
                )}
              </div>

              {isHost && (
                <motion.button whileTap={{ scale: 0.98, y: 3 }} onClick={startGame} disabled={players.length < 2 || startingGame} className="flex h-20 w-full items-center justify-center gap-3 rounded-full border-4 border-[#20263d] bg-[#20c4e8] text-2xl font-black text-white shadow-[0_8px_0_#20263d] disabled:cursor-not-allowed disabled:opacity-40">
                  {startingGame ? "STARTING..." : <>PLAY GAME <span className="text-3xl">▶</span></>}
                </motion.button>
              )}

              {!isHost && (
                <div className="rounded-[28px] border-4 border-[#20263d] bg-white p-5 text-center font-black shadow-[0_7px_0_#20263d]">
                  <div className="text-3xl">👑</div>
                  <p className="mt-2 text-lg">Waiting for the host to start...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* GAME HERO */}
              <div className="overflow-hidden rounded-[36px] border-4 border-[#20263d] shadow-[0_9px_0_#20263d]" style={{ backgroundColor: phaseTheme.bg }}>
                <div className="relative p-6 sm:p-8">
                  <div className="absolute right-5 top-5 text-6xl opacity-20">{phaseTheme.icon}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border-3 border-[#20263d] bg-white px-4 py-2 text-xs font-black shadow-[0_3px_0_#20263d]">ROUND {game.round} / {game.totalRounds}</span>
                    {role && <span className={`rounded-full border-3 border-[#20263d] px-4 py-2 text-xs font-black shadow-[0_3px_0_#20263d] ${role === "imposter" ? "bg-[#ff625f]" : "bg-[#7bd13f]"}`}>{role === "imposter" ? "😈 IMPOSTOR" : "😇 CIVILIAN"}</span>}
                  </div>
                  <h1 className="mt-5 max-w-2xl text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">{game.status === "finished" ? "GAME OVER" : phaseTheme.title}</h1>
                  <p className="mt-3 max-w-2xl text-base font-black text-[#20263d]/75 sm:text-lg">{game.status === "finished" ? "The chaos is complete." : phaseDescription(game.phase)}</p>

                  {game.status === "playing" && game.phase !== "results" && (
                    <div className="mt-6">
                      {game.phase === "clue" && !clueTurnActive ? (
                        <div className="flex items-center gap-4 rounded-[26px] border-4 border-[#20263d] bg-white/85 p-4 shadow-[0_5px_0_#20263d]">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-[#20263d] bg-[#ffd34d] text-3xl">⏳</div>
                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7b86a5]">WAIT YOUR TURN</div>
                            <div className="mt-1 text-xl font-black">{currentCluePlayer ? `${currentCluePlayer.name} is giving a clue` : "Another player is giving a clue"}</div>
                            <div className="mt-1 text-sm font-bold text-[#68718e]">Your {roomSettings.clueTime}s timer starts when your turn begins.</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-[#20263d] bg-white shadow-[0_6px_0_#20263d]">
                            <span className="text-3xl font-black leading-none">{timeLeft}</span>
                            <span className="mt-1 text-[9px] font-black uppercase">{game.phase === "clue" ? "your seconds" : "seconds"}</span>
                          </div>
                          <div className="min-w-[180px] flex-1">
                            <div className="mb-2 flex justify-between text-xs font-black uppercase"><span>{game.phase === "clue" ? "YOUR TIME" : "TIME"}</span><span>{timeLeft}s left</span></div>
                            <div className="h-5 overflow-hidden rounded-full border-3 border-[#20263d] bg-white/70">
                              <motion.div animate={{ width: `${timerPercent}%` }} transition={{ duration: 0.2 }} className="h-full rounded-full bg-[#ff625f]" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* PRIVATE ROLE */}
              {role && (
                <div className={`rounded-[32px] border-4 border-[#20263d] p-6 shadow-[0_8px_0_#20263d] ${role === "imposter" ? "bg-[#ff625f]" : "bg-[#7bd13f]"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#20263d]/60">YOUR SECRET ROLE</div>
                      <h2 className="mt-1 text-3xl font-black">{role === "imposter" ? "YOU ARE THE IMPOSTOR 😈" : "YOU ARE A CIVILIAN 😇"}</h2>
                    </div>
                    <div className="text-5xl">{role === "imposter" ? "🕵️" : "🔎"}</div>
                  </div>
                  <div className="mt-5 rounded-[24px] border-4 border-[#20263d] bg-white p-5 text-center shadow-[0_5px_0_#20263d]">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-[#7b86a5]">{role === "imposter" ? "YOUR MISSION" : "SECRET WORD"}</div>
                    <div className="mt-2 text-3xl font-black text-[#20263d] sm:text-4xl">{role === "imposter" ? "BLEND IN. SURVIVE." : word || "Waiting..."}</div>
                  </div>
                </div>
              )}

              {/* CLUE PHASE */}
              {game.phase === "clue" && (
                <div className="rounded-[32px] border-4 border-[#20263d] bg-white p-5 shadow-[0_8px_0_#20263d] sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#7b86a5]">CLUE TURN</div>
                      <h2 className="mt-1 text-3xl font-black">{currentCluePlayer ? `${currentCluePlayer.name}'s turn` : "Next player"}</h2>
                    </div>
                    <div className="rounded-2xl border-4 border-[#20263d] bg-[#ffd34d] px-4 py-3 text-center shadow-[0_4px_0_#20263d]"><div className="text-2xl font-black">{game.clues.length}</div><div className="text-[9px] font-black uppercase">clues</div></div>
                  </div>
                  <p className="mt-3 font-bold text-[#68718e]">{isMyClueTurn ? "Your turn! Give a clever clue without making the word obvious." : currentCluePlayer ? `Watch ${currentCluePlayer.name}. Your turn is coming.` : "Get ready."}</p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input value={clue} onChange={(event) => setClue(event.target.value.slice(0, 100))} onKeyDown={(event) => event.key === "Enter" && submitClue()} disabled={hasSubmittedClue || !isMyClueTurn} placeholder={isMyClueTurn ? "Type your clue..." : `Waiting for ${currentCluePlayer?.name || "the next player"}...`} className="h-14 min-w-0 flex-1 rounded-2xl border-4 border-[#20263d] bg-[#eef9ff] px-4 text-base font-bold text-[#20263d] outline-none placeholder:text-[#8c97b1] focus:bg-white disabled:opacity-50" />
                    <button onClick={submitClue} disabled={!clue.trim() || hasSubmittedClue || !isMyClueTurn} className="h-14 rounded-full border-4 border-[#20263d] bg-[#20c4e8] px-8 text-lg font-black text-white shadow-[0_5px_0_#20263d] disabled:opacity-30">{hasSubmittedClue ? "SENT ✓" : "SEND CLUE"}</button>
                  </div>
                </div>
              )}

              {/* CLUE HISTORY */}
              {game.clues.length > 0 && (
                <div className="rounded-[32px] border-4 border-[#20263d] bg-[#303a70] p-5 text-white shadow-[0_8px_0_#20263d] sm:p-7">
                  <div className="flex items-center justify-between"><h2 className="text-2xl font-black">CLUE BOARD 🧠</h2><span className="rounded-full border-3 border-[#20263d] bg-white px-3 py-1 text-xs font-black text-[#20263d]">{game.clues.length} / {players.length}</span></div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {game.clues.map((item, index) => (
                      <motion.div key={item.playerId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-[24px] border-4 border-[#20263d] p-4 text-[#20263d] shadow-[0_5px_0_#20263d] ${playerColors[index % playerColors.length]}`}>
                        <div className="flex items-center justify-between gap-2"><span className="font-black">{item.playerName}</span><span className="rounded-full border-2 border-[#20263d] bg-white/75 px-2 py-0.5 text-[9px] font-black">#{index + 1}</span></div>
                        <div className="mt-3 rounded-2xl border-3 border-[#20263d] bg-white/80 p-3 text-lg font-black">“{item.clue}”</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* DISCUSSION */}
              {game.phase === "discussion" && (
                <div className="rounded-[32px] border-4 border-[#20263d] bg-[#7bd13f] p-6 text-center shadow-[0_8px_0_#20263d] sm:p-9">
                  <div className="text-6xl">💬</div>
                  <h2 className="mt-2 text-5xl font-black uppercase">DISCUSS!</h2>
                  <p className="mx-auto mt-3 max-w-xl text-lg font-black text-[#20263d]/75">Accuse. Defend. Lie. Figure out who has no idea what the secret word is.</p>
                  <div className="mx-auto mt-6 max-w-xl rounded-[24px] border-4 border-[#20263d] bg-white p-4 text-xl font-black shadow-[0_5px_0_#20263d]">🔥 Use the chat — this is where the chaos happens.</div>
                </div>
              )}

              {/* VOTING */}
              {game.phase === "voting" && (
                <div className="rounded-[32px] border-4 border-[#20263d] bg-white p-5 shadow-[0_8px_0_#20263d] sm:p-7">
                  <div className="flex items-end justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.2em] text-[#7b86a5]">FINAL CALL</div><h2 className="mt-1 text-4xl font-black">WHO IS SUS? 🧐</h2></div><div className="rounded-full border-3 border-[#20263d] bg-[#ffd34d] px-4 py-2 text-sm font-black shadow-[0_3px_0_#20263d]">{votesSubmitted}/{players.length} VOTED</div></div>
                  <p className="mt-3 font-bold text-[#68718e]">Pick one player. You cannot vote yourself.</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">{players.map((player, index) => renderPlayerCard(player, index, "vote"))}</div>
                  <button onClick={submitVote} disabled={!selectedVote || hasSubmittedVote} className={`mt-5 h-16 w-full rounded-full border-4 border-[#20263d] text-xl font-black shadow-[0_6px_0_#20263d] disabled:opacity-40 ${hasSubmittedVote ? "bg-[#7bd13f]" : "bg-[#ff625f]"}`}>{hasSubmittedVote ? "VOTE LOCKED ✓" : "CAST MY VOTE"}</button>
                </div>
              )}

              {/* ROUND RESULTS */}
              {roundResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-[36px] border-4 border-[#20263d] p-5 shadow-[0_9px_0_#20263d] sm:p-7 ${roundResult.civiliansWon ? "bg-[#7bd13f]" : "bg-[#ff625f]"}`}
                >
                  <div className="text-center">
                    <div className="text-7xl">{roundResult.civiliansWon ? "🎉" : "😈"}</div>
                    <div className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#20263d]/60">
                      ROUND {roundResult.round} RESULT
                    </div>
                    <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">
                      {roundResult.civiliansWon ? "CIVILIANS WON!" : "IMPOSTOR WON!"}
                    </h2>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[24px] border-4 border-[#20263d] bg-white p-4 text-center shadow-[0_5px_0_#20263d]">
                      <div className="text-[10px] font-black uppercase tracking-wider text-[#7b86a5]">IMPOSTOR</div>
                      <div className="mt-1 text-2xl font-black">{roundResult.imposterName}</div>
                    </div>
                    <div className="rounded-[24px] border-4 border-[#20263d] bg-white p-4 text-center shadow-[0_5px_0_#20263d]">
                      <div className="text-[10px] font-black uppercase tracking-wider text-[#7b86a5]">SECRET WORD</div>
                      <div className="mt-1 text-2xl font-black">{roundResult.word}</div>
                    </div>
                    <div className="rounded-[24px] border-4 border-[#20263d] bg-white p-4 text-center shadow-[0_5px_0_#20263d]">
                      <div className="text-[10px] font-black uppercase tracking-wider text-[#7b86a5]">MOST VOTED</div>
                      <div className="mt-1 text-2xl font-black">{roundResult.eliminatedName || "TIE — NOBODY"}</div>
                    </div>
                  </div>

                  {/* WHO VOTED WHOM */}
                  <div className="mt-5 rounded-[28px] border-4 border-[#20263d] bg-white p-4 shadow-[0_5px_0_#20263d] sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7b86a5]">THE RECEIPTS 🧾</div>
                        <h3 className="mt-1 text-2xl font-black">Who voted whom?</h3>
                      </div>
                      <div className="rounded-full border-3 border-[#20263d] bg-[#ffd34d] px-3 py-1 text-xs font-black">
                        {roundResult.votes.length} VOTES
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {roundResult.votes.length > 0 ? (
                        roundResult.votes.map((vote) => (
                          <div key={`${vote.voterId}-${vote.targetId}`} className="flex items-center gap-2 rounded-2xl border-3 border-[#20263d] bg-[#eef9ff] p-3">
                            <div className="min-w-0 flex-1 truncate font-black">{vote.voterName}</div>
                            <div className="shrink-0 text-lg font-black">→</div>
                            <div className="min-w-0 flex-1 truncate rounded-xl border-2 border-[#20263d] bg-white px-2 py-1 text-right font-black">{vote.targetName}</div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border-3 border-dashed border-[#20263d] p-4 text-center font-bold text-[#68718e]">
                          Vote details will appear after the updated server is deployed.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VOTE TOTALS */}
                  <div className="mt-5 rounded-[28px] border-4 border-[#20263d] bg-[#303a70] p-4 text-white shadow-[0_5px_0_#20263d] sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">VOTE COUNT</div>
                        <h3 className="mt-1 text-2xl font-black">Where did the votes land?</h3>
                      </div>
                      <span className="text-2xl">🗳️</span>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {players.map((player, index) => {
                        const count = roundResult.voteCounts[player.id] || 0;
                        const isImposter = player.id === roundResult.imposterId;
                        const isEliminated = player.id === roundResult.eliminatedId;
                        return (
                          <div key={player.id} className={`flex items-center gap-3 rounded-2xl border-3 border-[#20263d] p-3 ${isImposter ? "bg-[#ff625f] text-[#20263d]" : "bg-white text-[#20263d]"}`}>
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#20263d] bg-white text-xs font-black ${playerColors[index % playerColors.length]}`}>
                              {count}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-black">{player.name}</div>
                              <div className="text-[9px] font-black uppercase opacity-60">
                                {isImposter ? "😈 IMPOSTOR" : isEliminated ? "☠ MOST VOTED" : "PLAYER"}
                              </div>
                            </div>
                            <div className="text-xl font-black">{count === 1 ? "vote" : "votes"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ROUND SCOREBOARD */}
                  <div className="mt-5 rounded-[28px] border-4 border-[#20263d] bg-white p-4 shadow-[0_5px_0_#20263d] sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7b86a5]">SCOREBOARD</div>
                        <h3 className="mt-1 text-2xl font-black">Who is leading? 🏆</h3>
                      </div>
                      <span className="text-2xl">⭐</span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {roundResult.scoreboard.map((entry, index) => (
                        <div key={entry.playerId} className={`flex items-center gap-3 rounded-2xl border-3 border-[#20263d] p-3 ${index === 0 ? "bg-[#ffd34d]" : "bg-[#eef9ff]"}`}>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#20263d] bg-white font-black">
                            {index === 0 ? "👑" : `#${index + 1}`}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-black">{entry.playerName}</div>
                            <div className="text-[9px] font-black uppercase text-[#7b86a5]">+{entry.roundPoints} THIS ROUND</div>
                          </div>
                          <div className="rounded-xl border-2 border-[#20263d] bg-white px-3 py-1 text-xl font-black">{entry.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* FINAL RESULTS */}
              {finalWinner && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-[38px] border-4 border-[#20263d] p-6 shadow-[0_10px_0_#20263d] sm:p-8 ${finalWinner === "civilians" ? "bg-[#20c4e8]" : "bg-[#ff625f]"}`}
                >
                  <div className="text-center">
                    <div className="text-8xl">{finalWinner === "civilians" ? "🏆" : "😈"}</div>
                    <div className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#20263d]/60">FINAL GAME RESULT</div>
                    <h2 className="mt-2 text-5xl font-black uppercase sm:text-6xl">
                      {finalWinner === "civilians" ? "CIVILIANS WIN!" : "IMPOSTOR WINS!"}
                    </h2>
                    <p className="mt-2 text-lg font-black text-[#20263d]/70">Final scores are in.</p>
                  </div>

                  {finalScoreboard.length > 0 && (
                    <div className="mt-6 rounded-[30px] border-4 border-[#20263d] bg-white p-4 shadow-[0_6px_0_#20263d] sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7b86a5]">FINAL LEADERBOARD</div>
                          <h3 className="mt-1 text-2xl font-black">Highest score 👑</h3>
                        </div>
                        {finalScoreboard[0] && (
                          <div className="rounded-full border-3 border-[#20263d] bg-[#ffd34d] px-3 py-1 text-xs font-black">
                            {finalScoreboard[0].playerName}: {finalScoreboard[0].score}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 grid gap-2">
                        {finalScoreboard.map((entry, index) => (
                          <div key={entry.playerId} className={`flex items-center gap-3 rounded-2xl border-3 border-[#20263d] p-3 ${index === 0 ? "bg-[#ffd34d]" : "bg-[#eef9ff]"}`}>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#20263d] bg-white font-black">
                              {index === 0 ? "👑" : `#${index + 1}`}
                            </div>
                            <div className="min-w-0 flex-1 truncate font-black">{entry.playerName}</div>
                            <div className="rounded-xl border-2 border-[#20263d] bg-white px-3 py-1 text-xl font-black">{entry.score}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* CHAT */}
        <aside
          className="relative isolate flex h-[68dvh] min-h-[380px] max-h-[680px] min-w-0 flex-col overflow-hidden rounded-[32px] border-4 border-[#20263d] bg-white shadow-[0_8px_0_#20263d] lg:sticky lg:top-5 lg:h-[calc(100dvh-105px)] lg:min-h-0 lg:max-h-none"
          style={{ WebkitTransform: "translateZ(0)" }}
        >
          <div className="flex shrink-0 items-center gap-3 border-b-4 border-[#20263d] bg-[#303a70] px-5 py-4 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-3 border-[#20263d] bg-[#20c4e8] text-2xl">💬</div>
            <div className="min-w-0"><h2 className="text-xl font-black">CHAOS CHAT</h2><p className="text-xs font-bold text-white/60">Accuse. Defend. Confuse.</p></div>
            <span className="ml-auto rounded-full border-3 border-[#20263d] bg-[#7bd13f] px-3 py-1 text-[10px] font-black text-[#20263d]">LIVE</span>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              className="absolute inset-0 min-h-0 overflow-y-scroll overscroll-y-contain px-3 py-4 sm:px-4"
              style={{
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
                scrollbarGutter: "stable",
              }}
            >
              <div className="flex min-h-full flex-col justify-end gap-3">
                {messages.length === 0 && <div className="flex min-h-[240px] items-center justify-center px-5 text-center"><div><div className="text-5xl">🦗</div><p className="mt-3 text-lg font-black text-[#20263d]">Crickets...</p><p className="mt-1 text-sm font-bold text-[#7b86a5]">Someone say something suspicious.</p></div></div>}
            {messages.map((item) => {
              const system = item.playerId === "system";
              const mine = item.playerId === playerId;
              if (system) return <div key={item.id} className="py-1 text-center"><span className="inline-block max-w-full rounded-full border-3 border-[#20263d] bg-[#eef9ff] px-3 py-1 text-[10px] font-black text-[#68718e]">{item.message}</span></div>;
              return <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`flex max-w-[88%] flex-col ${mine ? "items-end" : "items-start"}`}><div className={`mb-1 flex items-center gap-1.5 px-1 text-[10px] font-black text-[#7b86a5] ${mine ? "flex-row-reverse" : ""}`}><span>{item.playerName}</span>{mine && <span className="rounded-full bg-[#b28cff]/30 px-1.5 py-0.5 text-[8px]">YOU</span>}<span className="font-bold text-[#a5aec4]">{formatTime(item.timestamp)}</span></div><div className={`border-3 border-[#20263d] px-3.5 py-2.5 text-sm font-bold leading-5 shadow-[0_3px_0_#20263d] ${mine ? "rounded-2xl rounded-br-md bg-[#b28cff] text-[#20263d]" : "rounded-2xl rounded-bl-md bg-[#eef9ff] text-[#20263d]"}`}>{item.message}</div></div></div>;
              })}
              </div>
            </div>

            {chatUnread > 0 && (
              <button
                type="button"
                onClick={() => scrollChatToBottom("smooth")}
                className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border-4 border-[#20263d] bg-[#ffd34d] px-4 py-2 text-xs font-black text-[#20263d] shadow-[0_5px_0_#20263d] active:translate-y-0.5 active:shadow-[0_3px_0_#20263d]"
              >
                ↓ {chatUnread} NEW {chatUnread === 1 ? "MESSAGE" : "MESSAGES"}
              </button>
            )}
          </div>

          <div className="shrink-0 border-t-4 border-[#20263d] bg-[#f8fcff] p-3">
            <div className="flex items-center gap-2 rounded-[20px] border-4 border-[#20263d] bg-white p-1.5 focus-within:bg-[#eef9ff]">
              <input ref={messageInputRef} maxLength={300} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); } }} placeholder={game ? "Say something sus..." : "Say something..."} disabled={connection !== "connected"} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-bold text-[#20263d] outline-none placeholder:text-[#9ba5bb]" />
              <button onClick={sendMessage} disabled={connection !== "connected"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-3 border-[#20263d] bg-[#20c4e8] text-white shadow-[0_3px_0_#20263d] disabled:opacity-30" aria-label="Send message">➤</button>
            </div>
          </div>
        </aside>
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
    <label className="block rounded-[22px] border-3 border-[#20263d] bg-white p-3 shadow-[0_4px_0_#20263d]">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7b86a5]">{label}</span>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full appearance-none rounded-2xl border-3 border-[#20263d] bg-[#eef9ff] px-3 py-3 pr-9 text-sm font-black text-[#20263d] outline-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}{suffix}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg font-black text-[#20263d]">⌄</span>
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
    <div className="rounded-[20px] border-3 border-[#20263d] bg-white p-3 shadow-[0_4px_0_#20263d]">
      <p className="text-[9px] font-black uppercase tracking-wider text-[#7b86a5]">{label}</p>
      <p className="mt-1 text-base font-black text-[#20263d]">{value}</p>
    </div>
  );
}
