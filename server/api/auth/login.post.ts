import { AuthService } from '../../services/authService'
import { UserService } from '../../services/userService'

const USER_ID_PATTERN = /^[a-z0-9_-]{2,32}$/

export default defineEventHandler(async (event) => {
  const body = await readBody<{ userId?: unknown }>(event)
  const userId = typeof body?.userId === 'string'
    ? body.userId.trim().toLowerCase()
    : ''

  if (!USER_ID_PATTERN.test(userId)) {
    throw createError({
      statusCode: 400,
      message: '用户 ID 必须为 2～32 位，仅支持字母、数字、下划线和短横线。'
    })
  }

  const user = await UserService.loginWithId(userId)
  const session = await AuthService.createSession(user.userId)
  const maxAge = 60 * 60 * 24 * 7
  const sharedCookieOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/'
  }

  setCookie(event, 'mahjong_session', session.token, {
    ...sharedCookieOptions,
    httpOnly: true
  })
  setCookie(event, 'user_id', user.userId, sharedCookieOptions)
  setCookie(event, 'user_name', user.name, sharedCookieOptions)
  setCookie(event, 'is_admin', user.isAdmin ? 'true' : 'false', sharedCookieOptions)
  deleteCookie(event, 'auth_token', { path: '/' })

  return {
    success: true,
    user: {
      userId: user.userId,
      name: user.name,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      stats: user.stats
    }
  }
})
