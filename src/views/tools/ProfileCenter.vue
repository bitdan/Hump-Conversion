<template>
  <div class="profile-page">
    <section class="workspace-hero">
      <div>
        <p class="profile-kicker">Account Workspace</p>
        <h1 class="profile-title">个人中心</h1>
        <p class="profile-copy">围绕账号资料、安全与后续扩展能力构建的账户工作台。当前已支持资料维护与密码修改，后续可以继续扩展
          2FA 状态、设备记录和操作审计。</p>
      </div>
      <div class="hero-pills">
        <span class="hero-pill">资料维护</span>
        <span class="hero-pill">密码安全</span>
        <span class="hero-pill">可扩展模块</span>
      </div>
    </section>

    <section class="workspace-grid">
      <aside class="overview-shell">
        <v-card rounded="xl" class="overview-card">
          <div class="overview-top">
            <div class="avatar-shell">
              <img v-if="profileForm.avatar" :src="profileForm.avatar" alt="avatar" class="avatar-image"/>
              <span v-else>{{ avatarFallback }}</span>
            </div>
            <div>
              <p class="badge-name">{{ userStore.username || '用户' }}</p>
              <p class="badge-meta">{{ userStore.roles.join(', ') || 'user' }}</p>
            </div>
          </div>

          <div class="overview-list">
            <div class="overview-item">
              <span>用户 ID</span>
              <strong>{{ userStore.userId || '-' }}</strong>
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
              <span>安全模块</span>
              <strong>密码 / 2FA</strong>
            </div>
          </div>
        </v-card>

        <v-card rounded="xl" class="ext-card">
          <v-card-title>后续扩展</v-card-title>
          <v-card-text>
            <div class="ext-list">
              <div class="ext-item">2FA 状态总览与快捷入口</div>
              <div class="ext-item">登录设备 / 最近活跃记录</div>
              <div class="ext-item">敏感操作审计时间线</div>
            </div>
          </v-card-text>
        </v-card>
      </aside>

      <div class="module-stack">
        <v-card rounded="xl" class="panel-card">
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
            <v-btn color="primary" :loading="savingProfile" @click="submitProfile">保存个人信息</v-btn>
          </v-card-actions>
        </v-card>

        <v-card rounded="xl" class="panel-card">
          <v-card-title>密码设置</v-card-title>
          <v-card-text>
            <div class="form-grid password-grid">
              <v-text-field
                  v-model="passwordForm.oldPassword"
                  label="原密码"
                  :type="showOldPassword ? 'text' : 'password'"
                  :append-inner-icon="showOldPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showOldPassword = !showOldPassword"
                  variant="outlined"
              />
              <v-text-field
                  v-model="passwordForm.newPassword"
                  label="新密码"
                  :type="showNewPassword ? 'text' : 'password'"
                  :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showNewPassword = !showNewPassword"
                  variant="outlined"
              />
              <v-text-field
                  v-model="passwordForm.confirmPassword"
                  label="确认新密码"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showConfirmPassword = !showConfirmPassword"
                  variant="outlined"
              />
            </div>
            <p class="security-tip">
              修改密码后当前登录态仍会保留，新密码立即生效。后续如果加入设备管理或异地登录策略，这里可以继续承接。</p>
          </v-card-text>
          <v-card-actions class="px-6 pb-6">
            <v-spacer/>
            <v-btn color="primary" variant="tonal" :loading="savingPassword" @click="submitPassword">修改密码</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {changePassword, getUserInfo, updateProfile} from '@/api/auth'
import {useAuthCheck} from '@/composables/useAuthCheck'
import {useMessage} from '@/composables/useMessage'
import {useUserStore} from '@/stores/user'

const userStore = useUserStore()
const {checkAuth} = useAuthCheck()
const {showError, showSuccess, showWarning} = useMessage()

const savingProfile = ref(false)
const savingPassword = ref(false)

const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

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

async function loadProfile() {
  if (!checkAuth()) return
  try {
    const {data} = await getUserInfo()
    userStore.setUserInfo(data)
    profileForm.value = {
      email: data.user.email || '',
      avatar: data.user.avatar || ''
    }
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '加载个人信息失败')
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
  gap: 22px;
}

.workspace-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 30px;
  border-radius: 30px;
  background: radial-gradient(circle at 85% 15%, rgba(251, 191, 36, 0.24), transparent 18%),
  radial-gradient(circle at 100% 100%, rgba(14, 165, 233, 0.18), transparent 28%),
  linear-gradient(135deg, #152238 0%, #0f766e 54%, #164e63 100%);
  color: #f8fafc;
}

.profile-kicker {
  margin-bottom: 8px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.72);
}

.profile-title {
  font-size: 2.3rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.profile-copy {
  max-width: 760px;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.88);
}

.hero-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.hero-pill {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
}

.avatar-shell {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
  font-size: 1.5rem;
  font-weight: 700;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge-name {
  font-size: 1.15rem;
  font-weight: 700;
}

.badge-meta {
  margin-top: 6px;
  color: #64748b;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
}

.overview-shell,
.module-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-card,
.overview-card,
.ext-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
}

.overview-card {
  padding: 22px;
}

.overview-top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.overview-list,
.ext-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.overview-item,
.ext-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f8fafc;
}

.overview-item span {
  color: #64748b;
}

.overview-item strong,
.ext-item {
  color: #0f172a;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.password-grid {
  grid-template-columns: 1fr;
}

.security-tip {
  margin-top: 12px;
  color: #64748b;
  line-height: 1.7;
}

@media (max-width: 960px) {
  .workspace-hero,
  .workspace-grid,
  .form-grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-pills {
    justify-content: flex-start;
  }
}
</style>
