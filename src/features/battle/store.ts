export type Battle = {
  id: string;
  threadId: string;
  readyMessageId: string;
  playerA: string;
  playerB: string;
  playerAName: string;
  playerBName: string;
  ready: Set<string>;
  started: boolean;
  finished: boolean;
  questionIndex: number;
  scores: Map<string, number>;
  answeredThisQuestion: Set<string>;
  questionResolved: boolean;
};

const battlesById = new Map<string, Battle>();
const battlesByThreadId = new Map<string, Battle>();
const battlesByReadyMessageId = new Map<string, Battle>();
const battlesByUserId = new Map<string, Battle>();

export function createBattle(input: {
  id: string;
  threadId: string;
  readyMessageId: string;
  playerA: string;
  playerB: string;
  playerAName: string;
  playerBName: string;
}): Battle {
  const battle: Battle = {
    id: input.id,
    threadId: input.threadId,
    readyMessageId: input.readyMessageId,
    playerA: input.playerA,
    playerB: input.playerB,
    playerAName: input.playerAName,
    playerBName: input.playerBName,
    ready: new Set(),
    started: false,
    finished: false,
    questionIndex: 0,
    scores: new Map([
      [input.playerA, 0],
      [input.playerB, 0],
    ]),
    answeredThisQuestion: new Set(),
    questionResolved: false,
  };

  battlesById.set(battle.id, battle);
  battlesByThreadId.set(battle.threadId, battle);
  battlesByReadyMessageId.set(battle.readyMessageId, battle);
  battlesByUserId.set(battle.playerA, battle);
  battlesByUserId.set(battle.playerB, battle);

  return battle;
}

export function setReadyMessageId(battle: Battle, messageId: string): void {
  battlesByReadyMessageId.delete(battle.readyMessageId);
  battle.readyMessageId = messageId;
  battlesByReadyMessageId.set(messageId, battle);
}

export function getBattleById(id: string): Battle | undefined {
  return battlesById.get(id);
}

export function getBattleByThreadId(threadId: string): Battle | undefined {
  return battlesByThreadId.get(threadId);
}

export function getBattleByReadyMessageId(messageId: string): Battle | undefined {
  return battlesByReadyMessageId.get(messageId);
}

export function getBattleByUserId(userId: string): Battle | undefined {
  return battlesByUserId.get(userId);
}

export function deleteBattle(battle: Battle): void {
  battlesById.delete(battle.id);
  battlesByThreadId.delete(battle.threadId);
  battlesByReadyMessageId.delete(battle.readyMessageId);
  battlesByUserId.delete(battle.playerA);
  battlesByUserId.delete(battle.playerB);
}

export type LobbyPlayer = {
  id: string;
  name: string;
};

type Lobby = {
  slot1: LobbyPlayer | null;
  slot2: LobbyPlayer | null;
};

const lobby: Lobby = {
  slot1: null,
  slot2: null,
};

export function getLobby(): Lobby {
  return lobby;
}

export type ClaimLobbyResult =
  | { ok: false; reason: 'taken' | 'already' | 'in_battle' }
  | { ok: true; matched: false }
  | { ok: true; matched: true; playerA: LobbyPlayer; playerB: LobbyPlayer };

export function claimLobbySlot(slot: 1 | 2, player: LobbyPlayer): ClaimLobbyResult {
  if (getBattleByUserId(player.id)) {
    return { ok: false, reason: 'in_battle' };
  }

  if (lobby.slot1?.id === player.id || lobby.slot2?.id === player.id) {
    return { ok: false, reason: 'already' };
  }

  if (slot === 1) {
    if (lobby.slot1) {
      return { ok: false, reason: 'taken' };
    }
    lobby.slot1 = player;
  } else {
    if (lobby.slot2) {
      return { ok: false, reason: 'taken' };
    }
    lobby.slot2 = player;
  }

  if (lobby.slot1 && lobby.slot2) {
    const playerA = lobby.slot1;
    const playerB = lobby.slot2;
    lobby.slot1 = null;
    lobby.slot2 = null;
    return { ok: true, matched: true, playerA, playerB };
  }

  return { ok: true, matched: false };
}
