import { gameManager } from '../../utils/gameManager';
import { resolveUserFromEvent } from '../../utils/session';

export default defineEventHandler(async (event) => {
  try {
    const user = await resolveUserFromEvent(event);
    const result = await gameManager.createGame(user.userId, user.name);
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, message: error.message || 'Failed to create game' });
  }
});
