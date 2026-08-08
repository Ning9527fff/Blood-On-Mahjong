import {
  ActionType,
  MeldType,
  type GameState,
  type Player,
  type Tile
} from '../types/game';

export interface AIActionDecision {
  action: ActionType;
  tileId?: string;
  tileIds?: string[];
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const tileLabel = (tile: Tile) => ({
  id: tile.id,
  suit: tile.suit,
  value: tile.value
});

const sameTile = (left: Tile, right: Tile) =>
  left.suit === right.suit && left.value === right.value;

const getConcealedKongIds = (player: Player): string[] | undefined => {
  const groups = new Map<string, Tile[]>();
  for (const tile of player.hand.concealedTiles) {
    const key = `${tile.suit}-${tile.value}`;
    const group = groups.get(key) ?? [];
    group.push(tile);
    groups.set(key, group);
  }

  return [...groups.values()].find(group => group.length === 4)?.map(tile => tile.id);
};

const getExtendedKongTileId = (player: Player): string | undefined => {
  for (const meld of player.hand.exposedMelds) {
    if (meld.type !== MeldType.TRIPLET || meld.tiles.length === 0) continue;
    const tile = player.hand.concealedTiles.find(candidate => sameTile(candidate, meld.tiles[0]!));
    if (tile) return tile.id;
  }
  return undefined;
};

const chooseFallbackDiscard = (player: Player): string => {
  const suitCounts = player.hand.concealedTiles.reduce<Record<string, number>>((counts, tile) => {
    counts[tile.suit] = (counts[tile.suit] ?? 0) + 1;
    return counts;
  }, {});

  const sorted = [...player.hand.concealedTiles].sort((left, right) => {
    const suitDifference = (suitCounts[left.suit] ?? 0) - (suitCounts[right.suit] ?? 0);
    if (suitDifference !== 0) return suitDifference;

    const leftEdgeDistance = Math.min(left.value - 1, 9 - left.value);
    const rightEdgeDistance = Math.min(right.value - 1, 9 - right.value);
    if (leftEdgeDistance !== rightEdgeDistance) return leftEdgeDistance - rightEdgeDistance;

    return left.value - right.value;
  });

  return sorted[0]?.id ?? '';
};

export const getFallbackAIDecision = (
  player: Player,
  availableActions: ActionType[]
): AIActionDecision => {
  if (availableActions.includes(ActionType.HU)) {
    return { action: ActionType.HU };
  }

  if (availableActions.includes(ActionType.KONG)) {
    return { action: ActionType.KONG };
  }

  if (availableActions.includes(ActionType.PENG)) {
    return { action: ActionType.PENG };
  }

  if (availableActions.includes(ActionType.CONCEALED_KONG)) {
    return {
      action: ActionType.CONCEALED_KONG,
      tileIds: getConcealedKongIds(player)
    };
  }

  if (availableActions.includes(ActionType.EXTENDED_KONG)) {
    return {
      action: ActionType.EXTENDED_KONG,
      tileId: getExtendedKongTileId(player)
    };
  }

  if (availableActions.includes(ActionType.DISCARD)) {
    return {
      action: ActionType.DISCARD,
      tileId: chooseFallbackDiscard(player)
    };
  }

  return { action: ActionType.PASS };
};

const normalizeDecision = (
  value: unknown,
  player: Player,
  availableActions: ActionType[]
): AIActionDecision | null => {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const action = raw.action as ActionType;
  if (!availableActions.includes(action)) return null;

  if (action === ActionType.DISCARD) {
    const tileId = typeof raw.tileId === 'string' ? raw.tileId : '';
    if (!player.hand.concealedTiles.some(tile => tile.id === tileId)) return null;
    return { action, tileId };
  }

  if (action === ActionType.CONCEALED_KONG) {
    const tileIds = Array.isArray(raw.tileIds)
      ? raw.tileIds.filter((id): id is string => typeof id === 'string')
      : [];
    const tiles = tileIds
      .map(id => player.hand.concealedTiles.find(tile => tile.id === id))
      .filter((tile): tile is Tile => Boolean(tile));
    if (tiles.length !== 4 || !tiles.every(tile => sameTile(tile, tiles[0]!))) return null;
    return { action, tileIds };
  }

  if (action === ActionType.EXTENDED_KONG) {
    const tileId = typeof raw.tileId === 'string' ? raw.tileId : '';
    const tile = player.hand.concealedTiles.find(candidate => candidate.id === tileId);
    const matchesMeld = tile && player.hand.exposedMelds.some(
      meld => meld.type === MeldType.TRIPLET && meld.tiles[0] && sameTile(tile, meld.tiles[0])
    );
    if (!matchesMeld) return null;
    return { action, tileId };
  }

  return { action };
};

const parseJsonObject = (content: string): unknown => {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    return JSON.parse(trimmed.slice(start, end + 1));
  }
};

export class DeepSeekAIService {
  static isConfigured(): boolean {
    return Boolean(process.env.DEEPSEEK_API_KEY);
  }

  static async chooseAction(
    game: GameState,
    player: Player,
    availableActions: ActionType[]
  ): Promise<AIActionDecision> {
    const fallback = getFallbackAIDecision(player, availableActions);
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return fallback;

    const pendingAction = game.pendingActions.find(action => action.playerId === player.id);
    const promptState = {
      rules: '四川血战到底麻将。只能从 availableActions 中选择动作。不要尝试查看其他玩家暗牌。',
      roundNumber: game.roundNumber,
      wallCount: game.wall.length,
      yourPlayer: {
        id: player.id,
        name: player.name,
        position: player.position,
        concealedTiles: player.hand.concealedTiles.map(tileLabel),
        exposedMelds: player.hand.exposedMelds,
        discardedTiles: player.hand.discardedTiles.map(tileLabel),
        missingSuit: player.missingSuit,
        isTing: player.isTing
      },
      opponents: game.players
        .filter(opponent => opponent.id !== player.id)
        .map(opponent => ({
          name: opponent.name,
          position: opponent.position,
          status: opponent.status,
          handSize: opponent.hand.concealedTiles.length,
          concealedTiles: game.teachingMode
            ? opponent.hand.concealedTiles.map(tileLabel)
            : undefined,
          exposedMelds: opponent.hand.exposedMelds,
          discardedTiles: opponent.hand.discardedTiles.map(tileLabel)
        })),
      latestDiscard: pendingAction?.tile ? tileLabel(pendingAction.tile) : null,
      discardPile: game.discardPile.map(tileLabel),
      availableActions
    };

    const timeoutMs = Math.min(
      Math.max(Number(process.env.DEEPSEEK_TIMEOUT_MS) || 12000, 3000),
      30000
    );

    try {
      const response = await fetch(
        process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            temperature: 0.2,
            max_tokens: 180,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  '你是四川血战麻将玩家。根据局面选择合法动作。只输出 JSON：' +
                  '{"action":"动作","tileId":"出牌或续杠牌ID","tileIds":["暗杠的4个牌ID"]}。' +
                  '未使用的字段不要输出。'
              },
              {
                role: 'user',
                content: JSON.stringify(promptState)
              }
            ]
          }),
          signal: AbortSignal.timeout(timeoutMs)
        }
      );

      if (!response.ok) {
        throw new Error(`DeepSeek HTTP ${response.status}`);
      }

      const payload = (await response.json()) as DeepSeekResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('DeepSeek returned no decision');

      return normalizeDecision(parseJsonObject(content), player, availableActions) ?? fallback;
    } catch (error) {
      console.warn('[DeepSeek AI] Falling back to local decision:', error);
      return fallback;
    }
  }
}
