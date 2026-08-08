import { gameManager } from '../../utils/gameManager';
import { emitToRoom } from '../../utils/socket';
import { resolveUserFromEvent } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const gameId = typeof body?.gameId === 'string' ? body.gameId.trim() : '';

  if (!gameId) {
    throw createError({ statusCode: 400, message: 'Game ID is required' });
  }

  const sessionUser = await resolveUserFromEvent(event);
  const game = await gameManager.getGame(gameId);

  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  const owner = game.players.find(player => player.isDealer);
  if (!owner || owner.id !== sessionUser.userId) {
    throw createError({ statusCode: 403, message: 'Only the room owner can add AI players' });
  }

  try {
    const player = await gameManager.addAIPlayer(gameId);
    emitToRoom(gameId, 'game:state-changed', {
      gameId,
      phase: game.phase,
      source: 'ai-player-added'
    });

    return {
      success: true,
      data: {
        player: {
          id: player.id,
          name: player.name,
          position: player.position,
          isAI: true
        },
        deepSeekConfigured: Boolean(process.env.DEEPSEEK_API_KEY)
      }
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to add AI player'
    });
  }
});
