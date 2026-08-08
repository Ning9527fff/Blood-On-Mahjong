// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // Allow login page without auth
  if (to.path === '/login') return

  const userId = useCookie('user_id').value

  // Not logged in → redirect to login
  if (!userId) {
    return navigateTo('/login')
  }
})
