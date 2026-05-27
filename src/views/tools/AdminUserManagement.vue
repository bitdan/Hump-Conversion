<template>
  <div class="admin-users-page">
    <section class="page-header">
      <div>
        <h1>用户管理</h1>
        <p class="muted">管理 Tool Hub 账号状态、角色权限和登录密码。</p>
      </div>
      <v-btn prepend-icon="mdi-refresh" variant="text" :loading="loading" @click="loadUsers">
        刷新
      </v-btn>
    </section>

    <section class="toolbar-row">
      <v-text-field
          v-model="keyword"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          label="搜索用户"
          placeholder="用户名 / 用户 ID / 邮箱"
          @keyup.enter="searchUsers"
      />
      <v-btn color="primary" prepend-icon="mdi-magnify" :loading="loading" @click="searchUsers">
        查询
      </v-btn>
    </section>

    <v-card class="user-table-card" variant="outlined">
      <v-table class="user-table">
        <thead>
        <tr>
          <th>用户</th>
          <th>用户 ID</th>
          <th>邮箱</th>
          <th>状态</th>
          <th>角色</th>
          <th>权限</th>
          <th>更新时间</th>
          <th class="text-right">操作</th>
        </tr>
        </thead>
        <tbody>
        <tr v-if="!loading && users.length === 0">
          <td colspan="8" class="empty-cell">暂无用户</td>
        </tr>
        <tr v-for="user in users" :key="user.user_id">
          <td>
            <div class="user-cell">
              <v-avatar size="36" color="primary" variant="tonal">
                <img v-if="user.avatar" :src="user.avatar" alt="avatar"/>
                <span v-else>{{ user.username.slice(0, 1).toUpperCase() }}</span>
              </v-avatar>
              <div>
                <strong>{{ user.username }}</strong>
                <span>{{ user.roles.join(', ') || 'user' }}</span>
              </div>
            </div>
          </td>
          <td><span class="user-id">{{ user.user_id }}</span></td>
          <td>{{ user.email || '未填写' }}</td>
          <td>
            <v-chip :color="user.status === 'active' ? 'success' : 'warning'" size="small" variant="tonal">
              {{ user.status === 'active' ? '启用' : '禁用' }}
            </v-chip>
          </td>
          <td>
            <div class="chip-row">
              <v-chip v-for="role in user.roles" :key="role" size="small" variant="tonal">{{ role }}</v-chip>
            </div>
          </td>
          <td>
            <div class="chip-row">
              <v-chip v-for="permission in user.permissions" :key="permission" size="small" variant="tonal">
                {{ permission }}
              </v-chip>
              <span v-if="user.permissions.length === 0" class="muted">无</span>
            </div>
          </td>
          <td>{{ formatDate(user.updated_at) }}</td>
          <td class="text-right">
            <v-btn icon="mdi-pencil-outline" variant="text" size="small" @click="openEdit(user)"/>
            <v-btn icon="mdi-lock-reset" variant="text" size="small" @click="openPassword(user)"/>
          </td>
        </tr>
        </tbody>
      </v-table>
      <v-progress-linear v-if="loading" indeterminate color="primary"/>
      <div class="pagination-row">
        <span class="muted">共 {{ total }} 个用户</span>
        <v-select
            v-model="pageSize"
            :items="pageSizeOptions"
            density="compact"
            variant="outlined"
            hide-details
            label="每页"
            class="page-size-select"
            @update:model-value="handlePageSizeChange"
        />
        <v-pagination
            v-model="page"
            :length="pageCount"
            :total-visible="7"
            density="comfortable"
            @update:model-value="loadUsers"
        />
      </div>
    </v-card>

    <v-dialog v-model="editDialog" max-width="640">
      <v-card>
        <v-card-title>编辑用户</v-card-title>
        <v-card-text>
          <div class="dialog-grid">
            <v-text-field :model-value="editingUser?.username || ''" label="用户名" variant="outlined" readonly/>
            <v-select
                v-model="editForm.status"
                :items="statusOptions"
                label="状态"
                variant="outlined"
            />
            <v-text-field v-model="editForm.email" label="邮箱" variant="outlined"/>
            <v-text-field v-model="editForm.avatar" label="头像地址" variant="outlined"/>
            <v-combobox
                v-model="editForm.roles"
                label="角色"
                variant="outlined"
                chips
                multiple
                closable-chips
                hint="至少保留一个角色，例如 admin 或 user"
            />
            <v-combobox
                v-model="editForm.permissions"
                label="权限"
                variant="outlined"
                chips
                multiple
                closable-chips
                hint="管理员可使用 * 表示全部权限"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="editDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="savingEdit" @click="submitEdit">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="passwordDialog" max-width="460">
      <v-card>
        <v-card-title>重置密码</v-card-title>
        <v-card-text>
          <p class="dialog-tip">用户 {{ passwordUser?.username }} 的旧会话会在重置后失效。</p>
          <v-text-field
              v-model="passwordForm.newPassword"
              label="新密码"
              variant="outlined"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
          />
          <v-text-field
              v-model="passwordForm.confirmPassword"
              label="确认新密码"
              variant="outlined"
              :type="showPassword ? 'text' : 'password'"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="passwordDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="savingPassword" @click="submitPassword">重置</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  type AdminUser
} from '@/api/auth'
import {useMessage} from '@/composables/useMessage'

const {showError, showSuccess, showWarning} = useMessage()

const users = ref<AdminUser[]>([])
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)
const editDialog = ref(false)
const passwordDialog = ref(false)
const savingEdit = ref(false)
const savingPassword = ref(false)
const showPassword = ref(false)
const editingUser = ref<AdminUser | null>(null)
const passwordUser = ref<AdminUser | null>(null)

const statusOptions = [
  {title: '启用', value: 'active'},
  {title: '禁用', value: 'disabled'}
]
const pageSizeOptions = [10, 20, 50, 100]
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const editForm = ref({
  email: '',
  avatar: '',
  status: 'active' as 'active' | 'disabled',
  roles: [] as string[],
  permissions: [] as string[]
})

const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

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
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function searchUsers() {
  page.value = 1
  void loadUsers()
}

function handlePageSizeChange() {
  page.value = 1
  void loadUsers()
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
  passwordForm.value = {
    newPassword: '',
    confirmPassword: ''
  }
  passwordDialog.value = true
}

async function submitPassword() {
  if (!passwordUser.value) return
  if (!passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    showWarning('请填写完整的新密码')
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
.admin-users-page {
  min-height: 100vh;
  padding: 32px;
  background: #f8fafc;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.muted {
  color: #64748b;
  font-size: 13px;
}

.toolbar-row {
  display: grid;
  grid-template-columns: minmax(240px, 420px) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.user-table-card {
  overflow: hidden;
  border-color: rgba(15, 23, 42, 0.08);
}

.user-table {
  background: #ffffff;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 150px;
}

.user-cell strong,
.user-cell span {
  display: block;
}

.user-cell span {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 120px;
}

.user-id {
  display: inline-block;
  min-width: 96px;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 12px 16px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
}

.page-size-select {
  max-width: 110px;
}

.empty-cell {
  height: 120px;
  text-align: center;
  color: #64748b;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.dialog-grid :deep(.v-input:nth-last-child(-n + 2)) {
  grid-column: 1 / -1;
}

.dialog-tip {
  margin: 0 0 16px;
  color: #475569;
}

@media (max-width: 760px) {
  .admin-users-page {
    padding: 20px 14px;
  }

  .page-header,
  .toolbar-row,
  .pagination-row {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .dialog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
