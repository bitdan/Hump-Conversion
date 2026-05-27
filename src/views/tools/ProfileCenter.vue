<template>
  <div class="profile-page">
    <section class="profile-header">
      <div class="identity">
        <div class="avatar-shell">
          <img v-if="profileForm.avatar" :src="profileForm.avatar" alt="avatar" class="avatar-image"/>
          <span v-else>{{ avatarFallback }}</span>
        </div>
        <div>
          <p class="eyebrow">Account</p>
          <h1>{{ userStore.username || '用户' }}</h1>
          <p class="muted">{{ userStore.userId || '-' }}</p>
        </div>
      </div>
      <div class="header-actions">
        <v-btn v-if="isAdmin" prepend-icon="mdi-account-group-outline" color="primary" variant="tonal" to="/tools/admin-users">
          用户管理
        </v-btn>
        <v-btn prepend-icon="mdi-shield-key-outline" variant="tonal" to="/tools/two-factor-manager">
          2FA 管理
        </v-btn>
        <v-btn prepend-icon="mdi-refresh" variant="text" :loading="loadingProfile" @click="loadProfile">
          刷新
        </v-btn>
      </div>
    </section>

    <section class="stats-grid">
      <div class="stat-card">
        <span>连续登录</span>
        <strong>{{ loginStats?.consecutive_days ?? 0 }}</strong>
        <small>天</small>
      </div>
      <div class="stat-card">
        <span>近 30 天</span>
        <strong>{{ loginStats?.recent_30_days_active_days ?? 0 }}</strong>
        <small>天活跃</small>
      </div>
      <div class="stat-card">
        <span>本月登录</span>
        <strong>{{ loginStats?.current_month_active_days ?? 0 }}</strong>
        <small>天</small>
      </div>
      <div class="stat-card">
        <span>今年登录</span>
        <strong>{{ loginStats?.current_year_active_days ?? 0 }}</strong>
        <small>天</small>
      </div>
    </section>

    <section class="workspace-grid">
      <aside class="side-stack">
        <v-card rounded="lg" class="panel-card">
          <v-card-title>账号概览</v-card-title>
          <v-card-text>
            <div class="overview-list">
              <div class="overview-item">
                <span>角色</span>
                <strong>{{ userStore.roles.join(', ') || 'user' }}</strong>
              </div>
              <div class="overview-item">
                <span>邮箱</span>
                <strong>{{ profileForm.email || '未填写' }}</strong>
              </div>
              <div class="overview-item">
                <span>头像</span>
                <strong>{{ profileForm.avatar ? '已配置' : '未配置' }}</strong>
              </div>
              <div class="overview-item">
                <span>今日登录</span>
                <strong>{{ loginStats?.logged_today ? '已记录' : '未记录' }}</strong>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card rounded="lg" class="panel-card">
          <v-card-title>近 30 天登录</v-card-title>
          <v-card-text>
            <div class="login-calendar" :aria-busy="loadingStats">
              <span
                  v-for="day in loginStats?.recent_days || []"
                  :key="day.date"
                  class="login-day"
                  :class="{ active: day.logged }"
                  :title="`${day.date} ${day.logged ? '已登录' : '未登录'}`"
              />
            </div>
          </v-card-text>
        </v-card>
      </aside>

      <div class="module-stack">
        <v-card rounded="lg" class="panel-card">
          <v-card-title>资料设置</v-card-title>
          <v-card-text>
            <div class="form-grid">
              <v-text-field :model-value="userStore.username || ''" label="用户名" variant="outlined" readonly/>
              <v-text-field :model-value="userStore.userId || ''" label="用户 ID" variant="outlined" readonly/>
              <v-text-field v-model="profileForm.email" label="邮箱" variant="outlined" placeholder="填写联系邮箱"/>
              <v-text-field v-model="profileForm.avatar" label="头像地址" variant="outlined" placeholder="https://..."/>
            </div>
          </v-card-text>
          <v-card-actions class="px-6 pb-6">
            <v-spacer/>
            <v-btn color="primary" prepend-icon="mdi-content-save" :loading="savingProfile" @click="submitProfile">
              保存资料
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card rounded="lg" class="panel-card">
          <v-card-title>密码设置</v-card-title>
          <v-card-text>
            <div class="form-grid password-grid">
              <v-text-field
                  v-model="passwordForm.oldPassword"
                  label="原密码"
                  :type="showOldPassword ? 'text' : 'password'"
                  :append-inner-icon="showOldPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  @click:append-inner="showOldPassword = !showOldPassword"
              />
              <v-text-field
                  v-model="passwordForm.newPassword"
                  label="新密码"
                  :type="showNewPassword ? 'text' : 'password'"
                  :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  @click:append-inner="showNewPassword = !showNewPassword"
              />
              <v-text-field
                  v-model="passwordForm.confirmPassword"
                  label="确认新密码"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  @click:append-inner="showConfirmPassword = !showConfirmPassword"
              />
            </div>
            <p class="security-tip">密码修改后立即生效。当前会保留登录态，登出后需使用新密码登录。</p>
          </v-card-text>
          <v-card-actions class="px-6 pb-6">
            <v-spacer/>
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-lock-reset" :loading="savingPassword"
                   @click="submitPassword">
              修改密码
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {changePassword, getLoginStats, getUserInfo, type LoginStats, updateProfile} from '@/api/auth'
import {useAuthCheck} from '@/composables/useAuthCheck'
import {useMessage} from '@/composables/useMessage'
import {useUserStore} from '@/stores/user'

const userStore = useUserStore()
const {checkAuth} = useAuthCheck()
const {showError, showSuccess, showWarning} = useMessage()

const loadingProfile = ref(false)
const loadingStats = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)

const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const loginStats = ref<LoginStats | null>(null)

const profileForm = ref({
  email: '',
  avatar: ''
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const avatarFallback = computed(() => (userStore.username || 'U').slice(0, 1).toUpperCase())
const isAdmin = computed(() => userStore.roles.includes('admin') || userStore.permissions.includes('*'))

async function loadProfile() {
  if (!checkAuth()) return
  loadingProfile.value = true
  try {
    const {data} = await getUserInfo()
    userStore.setUserInfo(data)
    profileForm.value = {
      email: data.user.email || '',
      avatar: data.user.avatar || ''
    }
    await loadLoginStats()
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '加载个人信息失败')
  } finally {
    loadingProfile.value = false
  }
}

async function loadLoginStats() {
  loadingStats.value = true
  try {
    const {data} = await getLoginStats()
    loginStats.value = data
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '加载登录统计失败')
  } finally {
    loadingStats.value = false
  }
}

async function submitProfile() {
  try {
    savingProfile.value = true
    const {data} = await updateProfile({
      email: profileForm.value.email.trim() || undefined,
      avatar: profileForm.value.avatar.trim() || undefined
    })
    userStore.setUserInfo(data)
    showSuccess('个人信息已更新')
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '更新个人信息失败')
  } finally {
    savingProfile.value = false
  }
}

async function submitPassword() {
  if (!passwordForm.value.oldPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    showWarning('请填写完整的密码信息')
    return
  }
  try {
    savingPassword.value = true
    await changePassword(passwordForm.value)
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    showSuccess('密码已修改')
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '修改密码失败')
  } finally {
    savingPassword.value = false
  }
}

onMounted(() => {
  void loadProfile()
})
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #ffffff;
}

.identity,
.header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar-shell {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #2563eb;
  color: #fff;
  font-size: 26px;
  font-weight: 700;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.eyebrow,
.muted,
.calendar-tip,
.security-tip {
  color: #64748b;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.profile-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 28px;
}

.muted {
  margin: 4px 0 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 18px;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #ffffff;
}

.stat-card span,
.stat-card small {
  display: block;
  color: #64748b;
}

.stat-card strong {
  display: block;
  margin: 8px 0 2px;
  color: #0f172a;
  font-size: 30px;
  line-height: 1;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
}

.side-stack,
.module-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-card {
  border: 1px solid #dbe4ef;
  box-shadow: none;
}

.overview-list {
  display: grid;
  gap: 10px;
}

.overview-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.overview-item span {
  color: #64748b;
}

.overview-item strong {
  color: #0f172a;
  text-align: right;
  overflow-wrap: anywhere;
}

.login-calendar {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
}

.login-day {
  aspect-ratio: 1;
  border-radius: 4px;
  background: #e2e8f0;
}

.login-day.active {
  background: #2563eb;
}

.calendar-tip,
.security-tip {
  margin-top: 12px;
  line-height: 1.7;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.password-grid {
  grid-template-columns: 1fr;
}

@media (max-width: 960px) {
  .profile-header,
  .workspace-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .profile-header,
  .identity,
  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
