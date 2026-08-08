<template>
  <div class="mahjong-page">
    <form class="mahjong-card" @submit.prevent="handleLogin">
      <h1 class="mahjong-title">Mahjong Online</h1>
      <p class="mahjong-subtitle">血战到底 · 四川麻将</p>

      <p class="mahjong-text">
        输入你的用户 ID。首次使用会自动创建用户，再次输入同一 ID 会继续使用原账号。
      </p>

      <label class="field-label" for="user-id">用户 ID</label>
      <input
        id="user-id"
        v-model="userId"
        class="id-input"
        type="text"
        inputmode="text"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        maxlength="32"
        placeholder="例如：player_001"
        :disabled="isSubmitting"
        autofocus
      >
      <p class="field-hint">2～32 位，仅支持字母、数字、下划线和短横线，不区分大小写。</p>

      <button
        class="mahjong-button"
        type="submit"
        :disabled="isSubmitting || !userId.trim()"
      >
        {{ isSubmitting ? '正在进入…' : '进入游戏' }}
      </button>

      <p v-if="loginError" class="status-text error">{{ loginError }}</p>
      <p class="security-note">此登录方式不使用密码，知道用户 ID 的人可以使用同一身份。</p>
    </form>
  </div>
</template>

<script setup lang="ts">
const userId = ref('')
const isSubmitting = ref(false)
const loginError = ref('')

const handleLogin = async () => {
  if (isSubmitting.value) return

  loginError.value = ''
  isSubmitting.value = true

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { userId: userId.value }
    })

    await navigateTo('/')
  } catch (error: any) {
    loginError.value = error?.data?.message || error?.message || '登录失败，请稍后重试。'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.mahjong-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(16px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
}

.mahjong-card {
  display: flex;
  flex-direction: column;
  width: min(100%, 420px);
  padding: 32px 40px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(7, 19, 14, 0.92);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
}

.mahjong-title {
  margin: 0 0 4px;
  text-align: center;
  font-size: 2rem;
  letter-spacing: 0.08em;
}

.mahjong-subtitle {
  margin: 0 0 20px;
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.85;
}

.mahjong-text {
  margin: 0 0 24px;
  font-size: 0.95rem;
  line-height: 1.65;
  opacity: 0.9;
}

.field-label {
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #d4f8d3;
}

.id-input {
  width: 100%;
  box-sizing: border-box;
  padding: 13px 15px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 16px;
}

.id-input:focus {
  border-color: #46c574;
  box-shadow: 0 0 0 3px rgba(70, 197, 116, 0.16);
}

.field-hint,
.security-note,
.status-text {
  font-size: 0.8rem;
  line-height: 1.5;
}

.field-hint {
  margin: 8px 0 18px;
  opacity: 0.7;
}

.mahjong-button {
  padding: 13px 24px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  font-size: 0.95rem;
  font-weight: 700;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

.mahjong-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status-text.error {
  margin: 14px 0 0;
  color: #ff9f9f;
}

.security-note {
  margin: 18px 0 0;
  text-align: center;
  opacity: 0.55;
}

@media (max-width: 520px) {
  .mahjong-card {
    padding: 28px 22px;
  }

  .mahjong-title {
    font-size: 1.65rem;
  }

  .mahjong-button {
    min-height: 48px;
  }
}
</style>
