<template>
  <div class="detail-page">
    <div class="detail-actions">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/community/posts">返回列表</v-btn>
      <div v-if="post?.can_edit" class="owner-actions">
        <v-btn variant="tonal" prepend-icon="mdi-pencil" :to="`/community/posts/${post.id}/edit`">编辑</v-btn>
        <v-btn color="error" variant="tonal" prepend-icon="mdi-delete-outline" @click="removePost">删除</v-btn>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-skeleton-loader v-if="loading" type="article"/>

    <article v-else-if="post" class="post-detail">
      <h1>{{ post.title }}</h1>
      <div class="meta">
        <span>{{ post.author_name }}</span>
        <span>{{ formatDate(post.created_at) }}</span>
        <span><v-icon size="16">mdi-eye-outline</v-icon>{{ post.view_count }}</span>
      </div>
      <div class="content">{{ post.content }}</div>
    </article>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {deletePost, getPost, type PostItem} from '@/api/post'

const route = useRoute()
const router = useRouter()
const post = ref<PostItem | null>(null)
const loading = ref(false)
const error = ref('')

async function loadPost() {
  loading.value = true
  error.value = ''
  try {
    const response = await getPost(String(route.params.id))
    post.value = response.data
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.message || '帖子加载失败'
  } finally {
    loading.value = false
  }
}

async function removePost() {
  if (!post.value || !window.confirm('确定删除这篇帖子吗？')) return
  await deletePost(post.value.id)
  router.push('/community/posts')
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(loadPost)
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.owner-actions {
  display: flex;
  gap: 8px;
}

.post-detail {
  padding: 26px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.post-detail h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.35;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
}

.meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.content {
  margin-top: 24px;
  color: #1f2937;
  font-size: 16px;
  line-height: 1.85;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .detail-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .owner-actions {
    flex-direction: column;
  }
}
</style>
