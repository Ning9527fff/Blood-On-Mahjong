import { gameManager } from '../../utils/gameManager';
import { resolveUserFromEvent } from '../../utils/session';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ teachingMode?: unknown }>(event).catch(() => ({}));
    const user = await resolveUserFromEvent(event);
    const teachingMode = body?.teachingMode === true;
    const result = await gameManager.createGame(user.userId, user.name, teachingMode);
    
    return {
      success: true,
      data: {
        ...result,
        teachingMode
      }
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, message: error.message || 'Failed to create game' });
  }
});
