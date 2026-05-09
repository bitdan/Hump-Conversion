<template>
  <div class="editor-page">
    <header class="page-header">
      <div>
        <h1>{{ isEdit ? '编辑帖子' : '发布帖子' }}</h1>
        <p>标题尽量明确，正文可以保留换行和代码片段。</p>
      </div>
      <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/community/posts">返回列表</v-btn>
    </header>

    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <v-form class="editor-form" @submit.prevent="submit">
      <v-text-field
          v-model="title"
          label="标题"
          variant="outlined"
          counter="120"
          maxlength="120"
          :rules="[rules.required]"
      />
      <v-textarea
          v-model="content"
          label="正文"
          variant="outlined"
          rows="14"
          counter="20000"
          maxlength="20000"
          auto-grow
          :rules="[rules.required]"
      />
      <div class="form-actions">
        <v-btn variant="text" to="/community/posts">取消</v-btn>
        <v-btn color="primary" type="submit" prepend-icon="mdi-send" :loading="saving">
          {{ isEdit ? '保存' : '发布' }}
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {createPost, getPost, updatePost} from '@/api/post'

const route = useRoute()
const router = useRouter()
const title = ref('')
const content = ref('')
const saving = ref(false)
const error = ref('')
const isEdit = computed(() => !!route.params.id)

const rules = {
  required: (value: string) => !!value.trim() || '不能为空'
}

async function loadPost() {
  if (!isEdit.value) return
  const response = await getPost(String(route.params.id))
  title.value = response.data.title
  content.value = response.data.content || ''
}

async function submit() {
  const payload = {
    title: title.value.trim(),
    content: content.value.trim()
  }
  if (!payload.title || !payload.content) {
    error.value = '标题和正文不能为空'
    return
  }

  saving.value = true
  error.value = ''
  try {
    const response = isEdit.value
        ? await updatePost(String(route.params.id), payload)
        : await createPost(payload)
    router.push(`/community/posts/${response.data.id}`)
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await loadPost()
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.message || '帖子加载失败'
  }
})
</script>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.page-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.editor-form {
  display: grid;
  gap: 12px;
  padding: 22px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column-reverse;
  }
}
</style>
