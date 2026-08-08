import { AuthService } from '../../services/authService';

/**
 * Logout endpoint
 */
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'mahjong_session');

  if (token) {
    await AuthService.deleteSession(token);
  }

  deleteCookie(event, 'mahjong_session', { path: '/' });
  deleteCookie(event, 'user_id', { path: '/' });
  deleteCookie(event, 'user_name', { path: '/' });
  deleteCookie(event, 'is_admin', { path: '/' });
  deleteCookie(event, 'auth_token', { path: '/' });

  return {
    success: true,
    message: 'Logged out successfully'
  };
});
