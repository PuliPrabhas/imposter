import { DurableObject } from "cloudflare:workers";

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

// All timing values are stored in seconds. Keeping them in the game state
// makes every client and every alarm use the exact same server-side clock.
type RoomSettings = {
  players: number;
  rounds: number;
  clueTime: number;
  discussionTime: number;
};

const DEFAULT_SETTINGS: RoomSettings = {
  players: 5,
  rounds: 5,
  clueTime: 30,
  discussionTime: 60,
};

type Player = {
  id: string;
  name: string;
  joinedAt: number;
};

type Session = {
  playerId: string;
  playerName: string;
  joinedAt: number;
};

type Role = "civilian" | "imposter";

type GamePhase =
  | "clue"
  | "discussion"
  | "voting"
  | "results";

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

type GameState = {
  status: "lobby" | "playing" | "finished";
  round: number;
  totalRounds: number;
  settings: RoomSettings;

  phase: GamePhase;
  currentCluePlayerId?: string;

  phaseEndsAt: number;

  word: string;
  imposterId: string;

  roles: Record<string, Role>;

  clues: Record<
    string,
    {
      playerId: string;
      playerName: string;
      clue: string;
    }
  >;

  votes: Record<string, string>;
  scores: Record<string, number>;
  civilianRoundsWon: number;
  imposterRoundsWon: number;

  lastResult?: {
    imposterId: string;
    imposterName: string;
    word: string;
    voteCounts: Record<string, number>;
    eliminatedId: string | null;
    eliminatedName: string | null;
    civiliansWon: boolean;
  };
};

type ClientMessage =
  | {
      type: "join";
      playerId: string;
      playerName: string;
    }
  | {
      type: "chat";
      message: string;
    }
  | {
      type: "start_game";
      settings?: Partial<RoomSettings>;
    }
  | {
      type: "clue";
      clue: string;
    }
  | {
      type: "vote";
      targetId: string;
    }
  | {
      type: "ping";
    };

type ServerMessage =
  | {
      type: "connected";
      playerId: string;
      players: Player[];
      hostPlayerId: string;
      roomSettings: RoomSettings;
      game?: PublicGameState;
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
      voteCounts: Record<string, number>;
      votes: VoteDetail[];
      roundScores: Record<string, number>;
      scores: Record<string, number>;
      scoreboard: ScoreEntry[];
      eliminatedId: string | null;
      eliminatedName: string | null;
      civiliansWon: boolean;
      nextRound: boolean;
    }
  | {
      type: "game_finished";
      winner: "civilians" | "imposter";
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

type PublicGameState = {
  status: "playing" | "finished";
  round: number;
  totalRounds: number;
  phase: GamePhase;
  phaseEndsAt: number;
  currentCluePlayerId?: string;
  clues: Array<{
    playerId: string;
    playerName: string;
    clue: string;
  }>;
};

const WORDS = [
  "Apple",
  "Beach",
  "Cinema",
  "Mountain",
  "Pizza",
  "Airport",
  "School",
  "Hospital",
  "Cricket",
  "Football",
  "Birthday",
  "Wedding",
  "Restaurant",
  "Laptop",
  "Phone",
  "Rain",
  "Sunset",
  "Train",
  "Library",
  "Coffee",
  "Temple",
  "Garden",
  "Ocean",
  "Forest",
  "Robot",
  "Guitar",
  "Camera",
  "Chocolate",
  "Ice Cream",
  "Car",
];

const VOTING_TIME = 30;
const RESULT_TIME = 8;

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalizeSettings(input?: Partial<RoomSettings>): RoomSettings {
  return {
    players: clampInt(input?.players, MIN_PLAYERS, MAX_PLAYERS, DEFAULT_SETTINGS.players),
    rounds: clampInt(input?.rounds, 1, 20, DEFAULT_SETTINGS.rounds),
    clueTime: clampInt(input?.clueTime, 10, 120, DEFAULT_SETTINGS.clueTime),
    discussionTime: clampInt(input?.discussionTime, 15, 300, DEFAULT_SETTINGS.discussionTime),
  };
}

export class MyDurableObject extends DurableObject<Env> {
  constructor(
    ctx: DurableObjectState,
    env: Env,
  ) {
    super(ctx, env);
  }

  // =======================================================
  // HTTP / WEBSOCKET
  // =======================================================

  async fetch(
    request: Request,
  ): Promise<Response> {
    if (
      request.headers.get("Upgrade")?.toLowerCase() !==
      "websocket"
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          service:
            "Imposter Multiplayer Server",
          status: "online",
        }),
        {
          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );
    }

    const webSocketPair =
      new WebSocketPair();

    const [client, server] =
      Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    server.serializeAttachment({
      playerId: "",
      playerName: "",
      joinedAt: Date.now(),
    } satisfies Session);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // =======================================================
  // SESSION HELPERS
  // =======================================================

  private getSessions(): Array<{
    socket: WebSocket;
    session: Session;
  }> {
    return this.ctx
      .getWebSockets()
      .map((socket) => {
        const session =
          socket.deserializeAttachment() as
            | Session
            | null;

        if (!session) {
          return null;
        }

        return {
          socket,
          session,
        };
      })
      .filter(
        (
          value,
        ): value is {
          socket: WebSocket;
          session: Session;
        } => value !== null,
      );
  }

  private getPlayers(): Player[] {
    const players =
      new Map<string, Player>();

    for (const {
      session,
    } of this.getSessions()) {
      if (!session.playerId) {
        continue;
      }

      if (
        players.has(
          session.playerId,
        )
      ) {
        continue;
      }

      players.set(
        session.playerId,
        {
          id: session.playerId,
          name: session.playerName,
          joinedAt:
            session.joinedAt,
        },
      );
    }

    return Array.from(
      players.values(),
    ).sort(
      (a, b) =>
        a.joinedAt - b.joinedAt,
    );
  }

  private findSocketsForPlayer(
    playerId: string,
  ): WebSocket[] {
    return this.getSessions()
      .filter(
        ({ session }) =>
          session.playerId ===
          playerId,
      )
      .map(
        ({ socket }) => socket,
      );
  }

  // =======================================================
  // HOST
  // =======================================================

  private async getHostPlayerId(): Promise<string> {
    const storedHost =
      await this.ctx.storage.get<string>(
        "hostPlayerId",
      );

    const players =
      this.getPlayers();

    if (storedHost) {
      const stillExists =
        players.some(
          (player) =>
            player.id ===
            storedHost,
        );

      if (stillExists) {
        return storedHost;
      }
    }

    const firstPlayer =
      players[0];

    if (!firstPlayer) {
      await this.ctx.storage.delete(
        "hostPlayerId",
      );

      return "";
    }

    await this.ctx.storage.put(
      "hostPlayerId",
      firstPlayer.id,
    );

    return firstPlayer.id;
  }

  private async getRoomSettings(): Promise<RoomSettings> {
    const stored = await this.ctx.storage.get<RoomSettings>("roomSettings");
    return normalizeSettings(stored);
  }

  private async setRoomSettings(settings: RoomSettings) {
    await this.ctx.storage.put("roomSettings", settings);
  }

  // =======================================================
  // GAME STATE
  // =======================================================

  private async getGame(): Promise<GameState | null> {
    const game = await this.ctx.storage.get<GameState>("game");
    if (!game) return null;

    // Backward-compatible migration for rooms created by the previous build.
    game.settings = normalizeSettings(game.settings);
    game.civilianRoundsWon ??= 0;
    game.imposterRoundsWon ??= 0;
    return game;
  }

  private async saveGame(
    game: GameState,
  ) {
    await this.ctx.storage.put(
      "game",
      game,
    );
  }

  private async getPublicGame(): Promise<PublicGameState | undefined> {
    const game =
      await this.getGame();

    if (!game) {
      return undefined;
    }

    if (
      game.status !== "playing" &&
      game.status !== "finished"
    ) {
      return undefined;
    }

    return {
      status:
        game.status ===
        "finished"
          ? "finished"
          : "playing",
      round: game.round,
      totalRounds:
        game.totalRounds,
      phase: game.phase,
      phaseEndsAt:
        game.phaseEndsAt,
      currentCluePlayerId:
        game.currentCluePlayerId,
      clues:
        Object.values(
          game.clues,
        ),
    };
  }

  // =======================================================
  // SOCKET HELPERS
  // =======================================================

  private send(
    socket: WebSocket,
    message: ServerMessage,
  ) {
    try {
      if (
        socket.readyState ===
        WebSocket.OPEN
      ) {
        socket.send(
          JSON.stringify(message),
        );
      }
    } catch {
      // Socket may already be closed.
    }
  }

  private broadcast(
    message: ServerMessage,
    except?: WebSocket,
  ) {
    const payload =
      JSON.stringify(message);

    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) {
        continue;
      }

      try {
        if (
          socket.readyState ===
          WebSocket.OPEN
        ) {
          socket.send(payload);
        }
      } catch {
        // Ignore closed sockets.
      }
    }
  }

  private async sendPrivateRoles(
    game: GameState,
  ) {
    for (const {
      socket,
      session,
    } of this.getSessions()) {
      const role =
        game.roles[
          session.playerId
        ];

      if (!role) {
        continue;
      }

      this.send(socket, {
        type: "private_role",
        round: game.round,
        role,
        word:
          role === "civilian"
            ? game.word
            : null,
      });
    }
  }

  // =======================================================
  // GAME START
  // =======================================================

  private async startGame(
    socket: WebSocket,
    playerId: string,
    requestedSettings?: Partial<RoomSettings>,
  ) {
    const host =
      await this.getHostPlayerId();

    if (host !== playerId) {
      this.send(socket, {
        type: "error",
        message:
          "Only the host can start the game.",
      });

      return;
    }

    const existingGame =
      await this.getGame();

    if (
      existingGame?.status ===
      "playing"
    ) {
      this.send(socket, {
        type: "error",
        message:
          "The game has already started.",
      });

      return;
    }

    const players =
      this.getPlayers();

    const settings = normalizeSettings(requestedSettings);

    if (players.length < MIN_PLAYERS) {
      this.send(socket, {
        type: "error",
        message:
          "At least 2 players are required.",
      });

      return;
    }

    if (players.length > settings.players) {
      this.send(socket, {
        type: "error",
        message: `Room limit is ${settings.players} players. Remove extra players before starting.`,
      });
      return;
    }

    await this.setRoomSettings(settings);

    await this.startRound(
      1,
      settings.rounds,
      players,
      settings,
    );
  }

  // =======================================================
  // START ROUND
  // =======================================================

  private async startRound(
    round: number,
    totalRounds: number,
    players: Player[],
    suppliedSettings?: RoomSettings,
    previousScores?: { civilianRoundsWon: number; imposterRoundsWon: number },
    previousPlayerScores?: Record<string, number>,
  ) {
    if (players.length < 2) {
      return;
    }

    const imposterIndex =
      Math.floor(
        Math.random() *
          players.length,
      );

    const imposter =
      players[imposterIndex];

    const word =
      WORDS[
        Math.floor(
          Math.random() *
            WORDS.length,
        )
      ];

    const roles: Record<
      string,
      Role
    > = {};

    for (const player of players) {
      roles[player.id] =
        player.id ===
        imposter.id
          ? "imposter"
          : "civilian";
    }

    const settings = suppliedSettings ?? await this.getRoomSettings();
    const cluePlayer = players[0];
    const phaseEndsAt =
      Date.now() +
      settings.clueTime * 1000;

    const game: GameState = {
      status: "playing",
      round,
      totalRounds,
      settings,
      phase: "clue",
      phaseEndsAt,
      currentCluePlayerId: cluePlayer.id,
      word,
      imposterId:
        imposter.id,
      roles,
      clues: {},
      votes: {},
      scores: previousPlayerScores ?? {},
      civilianRoundsWon: previousScores?.civilianRoundsWon ?? 0,
      imposterRoundsWon: previousScores?.imposterRoundsWon ?? 0,
    };

    await this.saveGame(game);

    await this.ctx.storage.setAlarm(
      phaseEndsAt,
    );

    const publicGame =
      await this.getPublicGame();

    if (!publicGame) {
      return;
    }

    this.broadcast({
      type: "game_started",
      game: publicGame,
      roomSettings: settings,
    });

    this.broadcast({
      type: "game_phase",
      round,
      phase: "clue",
      phaseEndsAt,
      currentCluePlayerId: cluePlayer.id,
    });

    await this.sendPrivateRoles(
      game,
    );
  }

  // =======================================================
  // PHASE CHANGE
  // =======================================================

  private async changePhase(
    game: GameState,
    phase: GamePhase,
    seconds: number,
    currentCluePlayerId?: string,
  ) {
    game.phase = phase;
    game.phaseEndsAt =
      Date.now() +
      seconds * 1000;
    game.currentCluePlayerId =
      phase === "clue" ? currentCluePlayerId : undefined;

    await this.saveGame(game);

    await this.ctx.storage.setAlarm(
      game.phaseEndsAt,
    );

    this.broadcast({
      type: "game_phase",
      round: game.round,
      phase,
      phaseEndsAt:
        game.phaseEndsAt,
      currentCluePlayerId:
        game.currentCluePlayerId,
    });
  }

  // =======================================================
  // CLUE
  // =======================================================

  private async submitClue(
    socket: WebSocket,
    playerId: string,
    clue: string,
  ) {
    const game =
      await this.getGame();

    if (
      !game ||
      game.status !== "playing"
    ) {
      return;
    }

    if (game.phase !== "clue") {
      this.send(socket, {
        type: "error",
        message:
          "The clue phase is over.",
      });

      return;
    }

    const cleanClue =
      clue.trim();

    if (!cleanClue) {
      return;
    }

    if (cleanClue.length > 100) {
      this.send(socket, {
        type: "error",
        message:
          "Clue must be 100 characters or less.",
      });

      return;
    }

    if (game.currentCluePlayerId !== playerId) {
      this.send(socket, {
        type: "error",
        message: "It is not your turn to give a clue yet.",
      });
      return;
    }

    if (game.clues[playerId]) {
      this.send(socket, {
        type: "error",
        message:
          "You already submitted a clue.",
      });

      return;
    }

    const player =
      this.getPlayers().find(
        (item) =>
          item.id === playerId,
      );

    if (!player) {
      return;
    }

    game.clues[playerId] = {
      playerId,
      playerName:
        player.name,
      clue: cleanClue,
    };

    const players = this.getPlayers();
    const nextPlayer = players.find((item) => !game.clues[item.id]);

    if (nextPlayer) {
      game.currentCluePlayerId = nextPlayer.id;
    } else {
      game.currentCluePlayerId = undefined;
    }

    await this.saveGame(game);

    this.broadcast({
      type: "clue_submitted",
      playerId,
      playerName: player.name,
      clue: cleanClue,
      nextPlayerId: nextPlayer?.id,
    });

    if (!nextPlayer) {
      await this.changePhase(
        game,
        "discussion",
        game.settings.discussionTime,
      );
    } else {
      // Each player gets a full clue timer. The server owns the timer so
      // mobile clients cannot drift away from the real round clock.
      game.phaseEndsAt = Date.now() + game.settings.clueTime * 1000;
      await this.saveGame(game);
      await this.ctx.storage.setAlarm(game.phaseEndsAt);
      this.broadcast({
        type: "game_phase",
        round: game.round,
        phase: "clue",
        phaseEndsAt: game.phaseEndsAt,
        currentCluePlayerId: nextPlayer.id,
      });
    }
  }

  // =======================================================
  // VOTE
  // =======================================================

  private async submitVote(
    socket: WebSocket,
    playerId: string,
    targetId: string,
  ) {
    const game =
      await this.getGame();

    if (
      !game ||
      game.status !== "playing"
    ) {
      return;
    }

    if (
      game.phase !== "voting"
    ) {
      this.send(socket, {
        type: "error",
        message:
          "Voting is not active.",
      });

      return;
    }

    if (game.votes[playerId]) {
      this.send(socket, {
        type: "error",
        message: "You have already voted this round.",
      });
      return;
    }

    const players =
      this.getPlayers();

    const target =
      players.find(
        (player) =>
          player.id ===
          targetId,
      );

    if (!target) {
      this.send(socket, {
        type: "error",
        message:
          "Invalid player.",
      });

      return;
    }

    game.votes[playerId] =
      targetId;

    await this.saveGame(game);

    const voteCount =
      Object.keys(
        game.votes,
      ).length;

    this.broadcast({
      type: "vote_update",
      votesSubmitted:
        voteCount,
      totalPlayers:
        players.length,
    });

    if (
      voteCount >=
      players.length
    ) {
      await this.resolveRound(
        game,
      );
    }
  }

  // =======================================================
  // ROUND RESULT
  // =======================================================

  private async resolveRound(
    game: GameState,
  ) {
    if (game.phase !== "voting") {
      return;
    }

    const players = this.getPlayers();
    const playerById = new Map(players.map((player) => [player.id, player]));

    const voteCounts: Record<string, number> = {};
    for (const targetId of Object.values(game.votes)) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    let eliminatedId: string | null = null;
    let highestVotes = 0;

    for (const [targetId, count] of Object.entries(voteCounts)) {
      if (count > highestVotes) {
        highestVotes = count;
        eliminatedId = targetId;
      } else if (count === highestVotes) {
        eliminatedId = null;
      }
    }

    const imposter = playerById.get(game.imposterId);
    const eliminated = eliminatedId
      ? playerById.get(eliminatedId)
      : undefined;

    const civiliansWon = eliminatedId === game.imposterId;

    if (civiliansWon) {
      game.civilianRoundsWon += 1;
    } else {
      game.imposterRoundsWon += 1;
    }

    // Build a complete, safe result payload for the premium results UI.
    // Older persisted games may not have a scores object, so always migrate it.
    const scores: Record<string, number> = { ...(game.scores ?? {}) };
    for (const player of players) {
      if (typeof scores[player.id] !== "number" || !Number.isFinite(scores[player.id])) {
        scores[player.id] = 0;
      }
    }

    const roundScores: Record<string, number> = {};
    for (const player of players) {
      roundScores[player.id] = 0;
    }

    // Correct voters earn a point when civilians catch the imposter.
    // The imposter earns a point when they survive. This does not alter the
    // existing win/elimination rules; it only supplies the scoreboard UI.
    if (civiliansWon) {
      for (const [voterId, targetId] of Object.entries(game.votes)) {
        if (targetId === game.imposterId) {
          roundScores[voterId] = (roundScores[voterId] || 0) + 1;
        }
      }
    } else if (scores[game.imposterId] !== undefined) {
      roundScores[game.imposterId] = 1;
    }

    for (const player of players) {
      scores[player.id] = (scores[player.id] || 0) + (roundScores[player.id] || 0);
    }

    game.scores = scores;

    const votes: VoteDetail[] = Object.entries(game.votes).map(
      ([voterId, targetId]) => ({
        voterId,
        voterName: playerById.get(voterId)?.name || "Unknown",
        targetId,
        targetName: playerById.get(targetId)?.name || "Unknown",
      }),
    );

    const scoreboard: ScoreEntry[] = players
      .map((player) => ({
        playerId: player.id,
        playerName: player.name,
        score: scores[player.id] || 0,
        roundPoints: roundScores[player.id] || 0,
      }))
      .sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName));

    game.lastResult = {
      imposterId: game.imposterId,
      imposterName: imposter?.name || "Unknown",
      word: game.word,
      voteCounts,
      eliminatedId,
      eliminatedName: eliminated?.name || null,
      civiliansWon,
    };

    game.phase = "results";
    game.phaseEndsAt = Date.now() + RESULT_TIME * 1000;

    await this.saveGame(game);
    await this.ctx.storage.setAlarm(game.phaseEndsAt);

    this.broadcast({
      type: "round_results",
      round: game.round,
      imposterId: game.imposterId,
      imposterName: imposter?.name || "Unknown",
      word: game.word,
      voteCounts,
      votes,
      roundScores,
      scores,
      scoreboard,
      eliminatedId,
      eliminatedName: eliminated?.name || null,
      civiliansWon,
      nextRound: game.round < game.totalRounds,
    });
  }

  // =======================================================
  // ALARM
  // =======================================================

  async alarm() {
    const game =
      await this.getGame();

    if (
      !game ||
      game.status !== "playing"
    ) {
      return;
    }

    if (
      game.phaseEndsAt >
      Date.now()
    ) {
      await this.ctx.storage.setAlarm(
        game.phaseEndsAt,
      );

      return;
    }

    // -----------------------------------------------------
    // CLUE → DISCUSSION
    // -----------------------------------------------------

    if (game.phase === "clue") {
      const players = this.getPlayers();
      const nextPlayer = players.find((player) => !game.clues[player.id]);

      if (nextPlayer) {
        game.currentCluePlayerId = nextPlayer.id;
        game.phaseEndsAt = Date.now() + game.settings.clueTime * 1000;
        await this.saveGame(game);
        await this.ctx.storage.setAlarm(game.phaseEndsAt);
        this.broadcast({
          type: "game_phase",
          round: game.round,
          phase: "clue",
          phaseEndsAt: game.phaseEndsAt,
          currentCluePlayerId: nextPlayer.id,
        });
      } else {
        await this.changePhase(
          game,
          "discussion",
          game.settings.discussionTime,
        );
      }

      return;
    }

    // -----------------------------------------------------
    // DISCUSSION → VOTING
    // -----------------------------------------------------

    if (
      game.phase ===
      "discussion"
    ) {
      await this.changePhase(
        game,
        "voting",
        VOTING_TIME,
      );

      return;
    }

    // -----------------------------------------------------
    // VOTING → RESULT
    // -----------------------------------------------------

    if (game.phase === "voting") {
      await this.resolveRound(
        game,
      );

      return;
    }

    // -----------------------------------------------------
    // RESULT → NEXT ROUND
    // -----------------------------------------------------

    if (
      game.phase === "results"
    ) {
      if (
        game.round <
        game.totalRounds
      ) {
        const players =
          this.getPlayers();

        await this.startRound(
          game.round + 1,
          game.totalRounds,
          players,
          game.settings,
          {
            civilianRoundsWon: game.civilianRoundsWon,
            imposterRoundsWon: game.imposterRoundsWon,
          },
          game.scores,
        );
      } else {
        game.status =
          "finished";

        await this.saveGame(
          game,
        );

        const winner =
          game.civilianRoundsWon > game.imposterRoundsWon
            ? "civilians"
            : game.imposterRoundsWon > game.civilianRoundsWon
              ? "imposter"
              : game.lastResult?.civiliansWon
                ? "civilians"
                : "imposter";

        const finalScores: Record<string, number> = { ...(game.scores ?? {}) };
        const finalScoreboard: ScoreEntry[] = this.getPlayers()
          .map((player) => ({
            playerId: player.id,
            playerName: player.name,
            score: finalScores[player.id] || 0,
            roundPoints: 0,
          }))
          .sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName));

        this.broadcast({
          type: "game_finished",
          winner,
          rounds: game.totalRounds,
          scores: finalScores,
          scoreboard: finalScoreboard,
        });
      }
    }
  }

  // =======================================================
  // WEBSOCKET MESSAGE
  // =======================================================

  async webSocketMessage(
    socket: WebSocket,
    message:
      | string
      | ArrayBuffer,
  ) {
    if (
      typeof message !==
      "string"
    ) {
      return;
    }

    let data: ClientMessage;

    try {
      data =
        JSON.parse(
          message,
        ) as ClientMessage;
    } catch {
      this.send(socket, {
        type: "error",
        message:
          "Invalid message format.",
      });

      return;
    }

    // -----------------------------------------------------
    // PING
    // -----------------------------------------------------

    if (data.type === "ping") {
      this.send(socket, {
        type: "pong",
      });

      return;
    }

    const currentSession =
      socket.deserializeAttachment() as
        | Session
        | null;

    if (!currentSession) {
      this.send(socket, {
        type: "error",
        message:
          "Session not found.",
      });

      return;
    }

    // -----------------------------------------------------
    // JOIN
    // -----------------------------------------------------

    if (data.type === "join") {
      const playerId =
        data.playerId.trim();

      const playerName =
        data.playerName.trim();

      if (
        !playerId ||
        !playerName
      ) {
        this.send(socket, {
          type: "error",
          message:
            "Player name is required.",
        });

        return;
      }

      if (
        playerName.length >
        20
      ) {
        this.send(socket, {
          type: "error",
          message:
            "Player name must be 20 characters or less.",
        });

        return;
      }

      const game =
        await this.getGame();

      // Don't allow new players to enter
      // once a game has started.
      if (
        game?.status ===
          "playing" &&
        !this.getPlayers().some(
          (player) =>
            player.id ===
            playerId,
        )
      ) {
        this.send(socket, {
          type: "error",
          message:
            "The game has already started.",
        });

        socket.close(
          4003,
          "Game already started",
        );

        return;
      }

      // ---------------------------------------------------
      // ONE ACTIVE SOCKET PER PLAYER
      // ---------------------------------------------------

      const duplicateSockets =
        this.findSocketsForPlayer(
          playerId,
        ).filter(
          (existingSocket) =>
            existingSocket !==
            socket,
        );

      for (const oldSocket of duplicateSockets) {
        try {
          oldSocket.close(
            4002,
            "Replaced by newer connection",
          );
        } catch {
          // Ignore.
        }
      }

      const previousPlayerId =
        currentSession.playerId;

      const existingPlayers =
        this.getPlayers();

      const existingPlayer =
        existingPlayers.find(
          (player) =>
            player.id ===
            playerId,
        );

      const alreadyJoined =
        Boolean(existingPlayer);

      // A player can reconnect with the same playerId but a new
      // display name. Because getPlayers() is derived from active
      // WebSocket attachments, the old socket may still be present
      // for a moment after close(). Build the public list explicitly
      // with the name from THIS join request so the entered name wins.
      const nameChanged =
        Boolean(
          existingPlayer &&
            existingPlayer.name !==
              playerName,
        );

      if (
        !alreadyJoined &&
        existingPlayers.length >=
          MAX_PLAYERS
      ) {
        this.send(socket, {
          type: "error",
          message:
            "This room is full.",
        });

        socket.close(
          4001,
          "Room full",
        );

        return;
      }

      const session: Session = {
        playerId,
        playerName,
        joinedAt:
          currentSession.joinedAt ||
          Date.now(),
      };

      socket.serializeAttachment(
        session,
      );

      const hostPlayerId =
        await this.getHostPlayerId();

      const players =
        this.getPlayers().map(
          (player) =>
            player.id === playerId
              ? {
                  ...player,
                  name: playerName,
                  joinedAt:
                    session.joinedAt,
                }
              : player,
        );

      const publicGame =
        await this.getPublicGame();
      const roomSettings = await this.getRoomSettings();

      this.send(socket, {
        type: "connected",
        playerId,
        players,
        hostPlayerId,
        roomSettings,
        game: publicGame,
      });

      // If reconnecting to an active game,
      // restore this player's private role.
      const activeGame =
        await this.getGame();

      if (activeGame?.status === "playing") {
        this.send(socket, {
          type: "game_phase",
          round: activeGame.round,
          phase: activeGame.phase,
          phaseEndsAt: activeGame.phaseEndsAt,
          currentCluePlayerId: activeGame.currentCluePlayerId,
        });
      }

      if (
        activeGame?.status ===
          "playing" &&
        activeGame.roles[
          playerId
        ]
      ) {
        this.send(socket, {
          type: "private_role",
          round:
            activeGame.round,
          role:
            activeGame.roles[
              playerId
            ],
          word:
            activeGame.roles[
              playerId
            ] === "civilian"
              ? activeGame.word
              : null,
        });
      }

      if (!alreadyJoined || nameChanged) {
        this.broadcast(
          {
            type: "player_joined",
            player: {
              id: playerId,
              name: playerName,
              joinedAt:
                session.joinedAt,
            },
            players,
            hostPlayerId,
          },
          socket,
        );
      }

      return;
    }

    // -----------------------------------------------------
    // EVERYTHING BELOW REQUIRES JOIN
    // -----------------------------------------------------

    if (
      !currentSession.playerId
    ) {
      this.send(socket, {
        type: "error",
        message:
          "Join the room first.",
      });

      return;
    }

    const playerId =
      currentSession.playerId;

    // -----------------------------------------------------
    // START GAME
    // -----------------------------------------------------

    if (
      data.type ===
      "start_game"
    ) {
      await this.startGame(
        socket,
        playerId,
        data.settings,
      );

      return;
    }

    // -----------------------------------------------------
    // CLUE
    // -----------------------------------------------------

    if (data.type === "clue") {
      await this.submitClue(
        socket,
        playerId,
        data.clue,
      );

      return;
    }

    // -----------------------------------------------------
    // VOTE
    // -----------------------------------------------------

    if (data.type === "vote") {
      await this.submitVote(
        socket,
        playerId,
        data.targetId,
      );

      return;
    }

    // -----------------------------------------------------
    // CHAT
    // -----------------------------------------------------

    if (data.type === "chat") {
      const text =
        data.message.trim();

      if (!text) {
        return;
      }

      if (
        text.length > 300
      ) {
        this.send(socket, {
          type: "error",
          message:
            "Message is too long.",
        });

        return;
      }

      this.broadcast({
        type: "chat",
        playerId:
          currentSession.playerId,
        playerName:
          currentSession.playerName,
        message: text,
        timestamp: Date.now(),
      });

      return;
    }
  }

  // =======================================================
  // SOCKET CLOSE
  // =======================================================

  async webSocketClose(
    socket: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ) {
    const session =
      socket.deserializeAttachment() as
        | Session
        | null;

    if (!session?.playerId) {
      return;
    }

    // Don't remove the player if another
    // connection for the same player exists.
    const replacementExists =
      this.findSocketsForPlayer(
        session.playerId,
      ).some(
        (activeSocket) =>
          activeSocket !==
            socket &&
          activeSocket.readyState ===
            WebSocket.OPEN,
      );

    if (replacementExists) {
      return;
    }

    const playersBefore =
      this.getPlayers();

    const playerStillExists =
      playersBefore.some(
        (player) =>
          player.id ===
          session.playerId,
      );

    if (!playerStillExists) {
      return;
    }

    let hostPlayerId =
      await this.ctx.storage.get<string>(
        "hostPlayerId",
      );

    if (
      hostPlayerId ===
      session.playerId
    ) {
      const remaining =
        playersBefore.filter(
          (player) =>
            player.id !==
            session.playerId,
        );

      if (remaining.length > 0) {
        hostPlayerId =
          remaining[0].id;

        await this.ctx.storage.put(
          "hostPlayerId",
          hostPlayerId,
        );
      } else {
        hostPlayerId = "";

        await this.ctx.storage.delete(
          "hostPlayerId",
        );
      }
    }

    const players =
      playersBefore.filter(
        (player) =>
          player.id !==
          session.playerId,
      );

    this.broadcast({
      type: "player_left",
      playerId:
        session.playerId,
      playerName:
        session.playerName,
      players,
      hostPlayerId,
    });
  }

  // =======================================================
  // SOCKET ERROR
  // =======================================================

  async webSocketError(
    _socket: WebSocket,
    error: unknown,
  ) {
    console.error(
      "WebSocket error:",
      error,
    );
  }
}

// =========================================================
// WORKER ENTRYPOINT
// =========================================================

export default {
  async fetch(
    request,
    env,
  ): Promise<Response> {
    const url =
      new URL(request.url);

    const match =
      url.pathname.match(
        /^\/room\/([A-Za-z0-9_-]+)$/,
      );

    if (!match) {
      return new Response(
        JSON.stringify({
          service:
            "Imposter Multiplayer Server",
          status: "online",
          usage:
            "Connect using /room/{ROOM_CODE}",
        }),
        {
          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );
    }

    const roomCode =
      match[1].toUpperCase();

    const room =
      env.MY_DURABLE_OBJECT.getByName(
        roomCode,
      );

    return room.fetch(request);
  },
} satisfies ExportedHandler<Env>;