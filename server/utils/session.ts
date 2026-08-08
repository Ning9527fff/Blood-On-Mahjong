import type { H3Event } from 'h3'
import { createError, getCookie } from 'h3'
import { AuthService } from '../services/authService'
import { UserService } from '../services/userService'

export async function resolveUserIdFromEvent(event: H3Event): Promise<string> {
  const sessionToken = getCookie(event, 'mahjong_session')

  if (sessionToken) {
    const sessionUserId = await AuthService.validateSession(sessionToken)
    if (sessionUserId) {
      return sessionUserId
    }
  }

  throw createError({
    statusCode: 401,
    message: 'Not authenticated'
  })
}

export async function resolveUserFromEvent(event: H3Event) {
  const userId = await resolveUserIdFromEvent(event)
  const user = await UserService.getUserById(userId)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return user
}

export async function requireAdminUser(event: H3Event) {
  const user = await resolveUserFromEvent(event)

  if (!user.isAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Admin privileges required'
    })
  }

  return user
}

export async function isAdminFromEvent(event: H3Event): Promise<boolean> {
  try {
    const user = await resolveUserFromEvent(event)
    return !!user.isAdmin
  } catch (error) {
    return false
  }
}
