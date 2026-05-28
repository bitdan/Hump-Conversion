<template>
  <ToolPageLayout max-width="max-w-[1400px]">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" :class="{ active: statusFilter === '' }" @click="setStatusFilter('')">
        <span class="stat-label">全部用户</span>
        <strong class="stat-value">{{ statsTotal }}</strong>
      </div>
      <div class="stat-card stat-card--active" :class="{ active: statusFilter === 'active' }" @click="setStatusFilter('active')">
        <span class="stat-label">启用</span>
        <strong class="stat-value">{{ statsActive }}</strong>
      </div>
      <div class="stat-card stat-card--disabled" :class="{ active: statusFilter === 'disabled' }" @click="setStatusFilter('disabled')">
        <span class="stat-label">禁用</span>
        <strong class="stat-value">{{ statsDisabled }}</strong>
      </div>
      <div class="stat-card stat-card--frozen" :class="{ active: statusFilter === 'frozen' }" @click="setStatusFilter('frozen')">
        <span class="stat-label">冻结</span>
        <strong class="stat-value">{{ statsFrozen }}</strong>
      </div>
    </div>

    <!-- 搜索 & 筛选 -->
    <div class="toolbar-row">
      <v-text-field
        v-model="keyword"
        density="comfortable"
        variant="outlined"
        hide-details
        prepend-inner-icon="mdi-magnify"
        placeholder="用户名 / 用户 ID / 邮箱"
        class="search-field"
        @keyup.enter="searchUsers"
      />
      <v-select
        v-model="statusFilter"
        :items="statusFilterOptions"
        density="comfortable"
        variant="outlined"
        hide-details
        class="filter-select"
        @update:model-value="searchUsers"
      />
      <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="loadUsers">
        刷新
      </v-btn>
    </div>

    <!-- 用户表格 -->
    <v-card class="table-card" variant="flat">
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="pageSize"
        :headers="headers"
        :items="users"
        :items-length="total"
        :items-per-page-options="pageSizeOptions"
        :loading="loading"
        item-value="user_id"
        density="comfortable"
        hover
        no-data-text="暂无匹配的用户"
        loading-text="加载中..."
        @update:page="loadUsers"
        @update:items-per-page="handlePageSizeChange"
      >
        <template #item.username="{ item }">
          <div class="user-cell">
            <v-avatar size="36" :color="avatarColor(item.status)" variant="tonal">
              <img v-if="item.avatar" :src="item.avatar" alt="avatar" />
              <span v-else>{{ item.username.slice(0, 1).toUpperCase() }}</span>
            </v-avatar>
            <div>
              <strong>{{ item.username }}</strong>
              <span class="user-sub">{{ item.roles.join(', ') || 'user' }}</span>
            </div>
          </div>
        </template>

        <template #item.user_id="{ item }">
          <code class="user-id">{{ item.user_id }}</code>
        </template>

        <template #item.email="{ item }">
          <span :class="{ 'text-muted': !item.email }">{{ item.email || '未填写' }}</span>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" size="small" variant="tonal" label>
            {{ statusLabel(item.status) }}
          </v-chip>
        </template>

        <template #item.roles="{ item }">
          <div class="chip-row">
            <v-chip v-for="role in item.roles" :key="role" size="x-small" variant="tonal">{{ role }}</v-chip>
          </div>
        </template>

        <template #item.permissions="{ item }">
          <div class="chip-row">
            <v-chip v-for="perm in item.permissions" :key="perm" size="x-small" variant="tonal">{{ perm }}</v-chip>
            <span v-if="item.permissions.length === 0" class="text-muted text-xs">无</span>
          </div>
        </template>

        <template #item.updated_at="{ item }">
          <span class="text-sm">{{ formatDate(item.updated_at) }}</span>
        </template>

        <template #item.created_at="{ item }">
          <span class="text-sm">{{ formatDate(item.created_at) }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="action-cell">
            <v-tooltip text="切换启用/禁用" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  :icon="item.status === 'active' ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'"
                  variant="text"
                  size="small"
                  :color="item.status === 'active' ? 'warning' : 'success'"
                  :loading="statusChangingUserId === item.user_id"
                  @click="confirmToggleStatus(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip text="冻结账号" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-snowflake"
                  variant="text"
                  size="small"
                  color="info"
                  :disabled="item.status === 'frozen'"
                  @click="confirmFreeze(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip text="编辑用户" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  @click="openEdit(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip text="重置密码" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-lock-reset"
                  variant="text"
                  size="small"
                  @click="openPassword(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- 状态变更确认弹窗 -->
    <v-dialog v-model="confirmDialog" max-width="420">
      <v-card>
        <v-card-title>确认操作</v-card-title>
        <v-card-text>
          <p class="confirm-text">
            确定要将用户 <strong>{{ confirmTarget?.username }}</strong>
            的状态改为 <strong>{{ confirmTargetLabel }}</strong> 吗？
          </p>
          <p v-if="confirmTargetStatus === 'disabled' || confirmTargetStatus === 'frozen'" class="confirm-hint">
            此操作会使该用户无法登录，当前会话也会失效。
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDialog = false">取消</v-btn>
          <v-btn :color="confirmBtnColor" :loading="statusChangingUserId !== null" @click="executeStatusChange">
            确认
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 编辑用户弹窗 -->
    <v-dialog v-model="editDialog" max-width="560">
      <v-card>
        <v-card-title>
          <div class="dialog-title-row">
            <v-avatar size="36" color="primary" variant="tonal">
              <img v-if="editingUser?.avatar" :src="editingUser.avatar" alt="avatar" />
              <span v-else>{{ editingUser?.username?.slice(0, 1)?.toUpperCase() }}</span>
            </v-avatar>
            <span>编辑 {{ editingUser?.username }}</span>
          </div>
        </v-card-title>
        <v-card-text>
          <div class="edit-form">
            <v-select
              v-model="editForm.status"
              :items="statusOptions"
              label="账号状态"
              variant="outlined"
              density="comfortable"
            />
            <v-text-field v-model="editForm.email" label="邮箱" variant="outlined" density="comfortable" placeholder="user@example.com" />
            <v-text-field v-model="editForm.avatar" label="头像地址" variant="outlined" density="comfortable" placeholder="https://..." />
            <v-combobox
              v-model="editForm.roles"
              label="角色"
              variant="outlined"
              density="comfortable"
              chips multiple closable-chips
              hint="至少保留一个角色"
            />
            <v-combobox
              v-model="editForm.permissions"
              label="权限"
              variant="outlined"
              density="comfortable"
              chips multiple closable-chips
              hint="管理员可使用 * 表示全部权限"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="savingEdit" @click="submitEdit">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 重置密码弹窗 -->
    <v-dialog v-model="passwordDialog" max-width="420">
      <v-card>
        <v-card-title>重置密码 — {{ passwordUser?.username }}</v-card-title>
        <v-card-text>
          <p class="confirm-hint">新密码至少 6 位。用户当前的登录会话将在重置后失效。</p>
          <v-text-field
            v-model="passwordForm.newPassword"
            label="新密码"
            variant="outlined"
            density="comfortable"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            class="mt-2"
            @click:append-inner="showPassword = !showPassword"
          />
          <v-text-field
            v-model="passwordForm.confirmPassword"
            label="确认新密码"
            variant="outlined"
            density="comfortable"
            :type="showPassword ? 'text' : 'password'"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="passwordDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="savingPassword" @click="submitPassword">重置</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {listAdminUsers, resetAdminUserPassword, updateAdminUser, type AdminUser} from '@/api/auth'
import {useMessage} from '@/composables/useMessage'
import {usePagination} from '@/composables/usePagination'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

const {showError, showSuccess, showWarning} = useMessage()

const users = ref<AdminUser[]>([])
const keyword = ref('')
const statusFilter = ref('')
const {page, pageSize, total, pageCount, reset} = usePagination(20)
const loading = ref(false)
const editDialog = ref(false)
const passwordDialog = ref(false)
const confirmDialog = ref(false)
const savingEdit = ref(false)
const savingPassword = ref(false)
const showPassword = ref(false)
const statusChangingUserId = ref<string | null>(null)
const editingUser = ref<AdminUser | null>(null)
const passwordUser = ref<AdminUser | null>(null)
const confirmTarget = ref<AdminUser | null>(null)
const confirmTargetStatus = ref('')
const statsActive = ref(0)
const statsDisabled = ref(0)
const statsFrozen = ref(0)

const statsTotal = computed(() => total.value)
const statusFilterOptions = [
  {title: '全部状态', value: ''},
  {title: '启用', value: 'active'},
  {title: '禁用', value: 'disabled'},
  {title: '冻结', value: 'frozen'}
]

const statusOptions = [
  {title: '启用', value: 'active'},
  {title: '禁用', value: 'disabled'},
  {title: '冻结', value: 'frozen'}
]

const statusMeta: Record<string, { label: string; color: string }> = {
  active: {label: '启用', color: 'success'},
  disabled: {label: '禁用', color: 'warning'},
  frozen: {label: '冻结', color: 'info'}
}

const pageSizeOptions = [
  {value: 10, title: '10'},
  {value: 20, title: '20'},
  {value: 50, title: '50'},
  {value: 100, title: '100'}
]

const headers = [
  {title: '用户', key: 'username', sortable: false, minWidth: '180px'},
  {title: '用户 ID', key: 'user_id', sortable: false, minWidth: '140px'},
  {title: '邮箱', key: 'email', sortable: false, minWidth: '160px'},
  {title: '状态', key: 'status', sortable: false, width: '90px'},
  {title: '角色', key: 'roles', sortable: false, minWidth: '120px'},
  {title: '权限', key: 'permissions', sortable: false, minWidth: '120px'},
  {title: '更新时间', key: 'updated_at', sortable: false, minWidth: '170px'},
  {title: '创建时间', key: 'created_at', sortable: false, minWidth: '170px'},
  {title: '操作', key: 'actions', sortable: false, align: 'end' as const, width: '200px'}
]

const editForm = ref({
  email: '',
  avatar: '',
  status: 'active' as AdminUser['status'],
  roles: [] as string[],
  permissions: [] as string[]
})

const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

const confirmTargetLabel = computed(() => statusMeta[confirmTargetStatus.value]?.label || confirmTargetStatus.value)
const confirmBtnColor = computed(() => {
  if (confirmTargetStatus.value === 'disabled') return 'warning'
  if (confirmTargetStatus.value === 'frozen') return 'info'
  return 'success'
})

function statusColor(status: string) { return statusMeta[status]?.color || 'grey' }
function statusLabel(status: string) { return statusMeta[status]?.label || status }
function avatarColor(status: string) {
  if (status === 'disabled') return 'warning'
  if (status === 'frozen') return 'info'
  return 'primary'
}

async function loadUsers() {
  loading.value = true
  try {
    const {data} = await listAdminUsers({
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      page_size: pageSize.value
    })
    users.value = data.items
    total.value = data.total
    page.value = data.page
    pageSize.value = data.page_size
    statsActive.value = (data as any).total_active ?? 0
    statsDisabled.value = (data as any).total_disabled ?? 0
    statsFrozen.value = (data as any).total_frozen ?? 0
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function searchUsers() {
  reset()
  void loadUsers()
}

function setStatusFilter(value: string) {
  statusFilter.value = statusFilter.value === value ? '' : value
  searchUsers()
}

function handlePageSizeChange() {
  reset()
  void loadUsers()
}

function confirmToggleStatus(user: AdminUser) {
  confirmTarget.value = user
  confirmTargetStatus.value = user.status === 'active' ? 'disabled' : 'active'
  confirmDialog.value = true
}

function confirmFreeze(user: AdminUser) {
  confirmTarget.value = user
  confirmTargetStatus.value = 'frozen'
  confirmDialog.value = true
}

async function executeStatusChange() {
  if (!confirmTarget.value) return
  const user = confirmTarget.value
  confirmDialog.value = false
  statusChangingUserId.value = user.user_id
  try {
    const {data} = await updateAdminUser(user.user_id, {
      status: confirmTargetStatus.value as AdminUser['status'],
      roles: user.roles,
      permissions: user.permissions
    })
    users.value = users.value.map(item => item.user_id === data.user_id ? data : item)
    showSuccess(`用户已${statusMeta[confirmTargetStatus.value].label}`)
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '更新用户状态失败')
  } finally {
    statusChangingUserId.value = null
  }
}

function openEdit(user: AdminUser) {
  editingUser.value = user
  editForm.value = {
    email: user.email || '',
    avatar: user.avatar || '',
    status: user.status,
    roles: [...user.roles],
    permissions: [...user.permissions]
  }
  editDialog.value = true
}

async function submitEdit() {
  if (!editingUser.value) return
  if (editForm.value.roles.length === 0) {
    showWarning('请至少保留一个角色')
    return
  }
  savingEdit.value = true
  try {
    const {data} = await updateAdminUser(editingUser.value.user_id, {
      email: editForm.value.email.trim() || undefined,
      avatar: editForm.value.avatar.trim() || undefined,
      status: editForm.value.status,
      roles: editForm.value.roles,
      permissions: editForm.value.permissions
    })
    users.value = users.value.map(item => item.user_id === data.user_id ? data : item)
    editDialog.value = false
    showSuccess('用户已更新')
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '保存用户失败')
  } finally {
    savingEdit.value = false
  }
}

function openPassword(user: AdminUser) {
  passwordUser.value = user
  passwordForm.value = {newPassword: '', confirmPassword: ''}
  passwordDialog.value = true
}

async function submitPassword() {
  if (!passwordUser.value) return
  if (!passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    showWarning('请填写完整信息')
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    showWarning('两次输入的密码不一致')
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    showWarning('密码长度至少 6 位')
    return
  }
  savingPassword.value = true
  try {
    await resetAdminUserPassword(passwordUser.value.user_id, passwordForm.value)
    passwordDialog.value = false
    showSuccess('密码已重置')
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '重置密码失败')
  } finally {
    savingPassword.value = false
  }
}

function formatDate(value: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

onMounted(() => {
  void loadUsers()
})
</script>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 16px 20px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}
.stat-card:hover { border-color: #2563eb; background: #f0f6ff; }
.stat-card.active { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 1px #2563eb; }

.stat-label { display: block; color: #64748b; font-size: 13px; margin-bottom: 4px; }
.stat-value { display: block; color: #0f172a; font-size: 28px; font-weight: 800; line-height: 1; }

.stat-card--active .stat-value { color: #16a34a; }
.stat-card--disabled .stat-value { color: #d97706; }
.stat-card--frozen .stat-value { color: #0891b2; }

.toolbar-row {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) 140px auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.table-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  overflow-x: auto;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-sub {
  display: block;
  margin-top: 1px;
  color: #64748b;
  font-size: 12px;
}

.user-id {
  font-size: 12px;
  color: #475569;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-cell {
  display: flex;
  gap: 1px;
  justify-content: flex-end;
}

.text-muted { color: #94a3b8; }
.text-xs { font-size: 12px; }
.text-sm { font-size: 13px; }

.confirm-text { margin: 0; font-size: 15px; line-height: 1.6; }
.confirm-hint { margin: 12px 0 0; color: #64748b; font-size: 13px; line-height: 1.6; }

.dialog-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 760px) {
  .stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .toolbar-row {
    grid-template-columns: 1fr;
  }
}
</style>
