import { gameManager } from '../../utils/gameManager';
import { TileSuit } from '../../types/game';
import { isAdminFromEvent, resolveUserFromEvent } from '../../utils/session';
import { aiPlayerController } from '../../services/aiPlayerController';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId } = query;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player ID are required'
    });
  }

  const normalizedGameId = gameId as string;
  const normalizedPlayerId = playerId as string;
  const sessionUser = await resolveUserFromEvent(event);
  const isAdminUser = await isAdminFromEvent(event);

  if (sessionUser.userId !== normalizedPlayerId && !isAdminUser) {
    throw createError({ statusCode: 403, message: 'Player identity does not match the session' });
  }

  const game = await gameManager.getGame(normalizedGameId);
  
  if (!game) {
    throw createError({
      statusCode: 404,
      message: 'Game not found'
    });
  }

  const player = game.players.find(p => p.id === normalizedPlayerId);
  
  if (!player) {
    throw createError({
      statusCode: 404,
      message: 'Player not found'
    });
  }

  const availableActions = await gameManager.getAvailableActions(normalizedGameId, normalizedPlayerId);

  const maskedPlayers = game.players.map((p) => {
    const shouldReveal = game.teachingMode || isAdminUser || p.id === normalizedPlayerId;

    return {
      ...p,
      hand: {
        ...p.hand,
        concealedTiles: shouldReveal
          ? p.hand.concealedTiles
          : p.hand.concealedTiles.map((_, index) => ({
              id: `hidden-${p.id}-${index}`,
              suit: TileSuit.WAN,
              value: 0
            }))
      }
    };
  });

  // Ensure isDealer is correctly passed
  const isDealer = player.isDealer;
  aiPlayerController.queue(normalizedGameId);

  return {
    success: true,
    data: {
      game: {
        ...game,
        players: maskedPlayers
      },
      playerView: player.hand,
      availableActions
    }
  };
});
