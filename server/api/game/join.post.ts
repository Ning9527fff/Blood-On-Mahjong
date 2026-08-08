import { gameManager } from '../../utils/gameManager';
import { resolveUserFromEvent } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId } = body;

  if (!gameId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID is required'
    });
  }

  try {
    const user = await resolveUserFromEvent(event);
    const result = await gameManager.joinGame(gameId, user.userId, user.name);
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 400, message: error.message || 'Failed to join game' });
  }
});
