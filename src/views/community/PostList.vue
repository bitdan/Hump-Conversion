<template>
  <div class="community-page">
    <header class="page-header">
      <div>
        <h1>社区帖子</h1>
        <p>记录想法、问题和工具使用经验。</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-pencil-plus" to="/community/posts/new">
        发帖
      </v-btn>
    </header>

    <div class="toolbar">
      <v-text-field
          v-model="keyword"
          density="compact"
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          placeholder="搜索标题或正文"
          hide-details
          @keyup.enter="reload"
      />
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="reload">刷新</v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-skeleton-loader v-if="loading" type="list-item-three-line@4"/>

    <div v-else class="post-list">
      <article v-for="post in posts" :key="post.id" class="post-card" @click="openPost(post.id)">
        <div class="post-main">
          <h2>{{ post.title }}</h2>
          <p>{{ post.content }}</p>
          <div class="meta">
            <span>{{ post.author_name }}</span>
            <span>{{ formatDate(post.created_at) }}</span>
          </div>
        </div>
        <div class="stats">
          <span><v-icon size="16">mdi-eye-outline</v-icon>{{ post.view_count }}</span>
          <span><v-icon size="16">mdi-comment-outline</v-icon>{{ post.comment_count }}</span>
        </div>
      </article>

      <v-empty-state
          v-if="posts.length === 0"
          icon="mdi-forum-outline"
          title="暂无帖子"
          text="可以发布第一篇帖子。"
      />
    </div>

    <div v-if="total > pageSize" class="pagination">
      <v-pagination v-model="page" :length="pageCount" rounded="circle"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {listPosts, type PostItem} from '@/api/post'

const router = useRouter()
const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const posts = ref<PostItem[]>([])
const loading = ref(false)
const error = ref('')

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function loadPosts() {
  loading.value = true
  error.value = ''
  try {
    const response = await listPosts({
      keyword: keyword.value.trim(),
      page: page.value,
      page_size: pageSize
    })
    posts.value = response.data.items
    total.value = response.data.total
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.message || '帖子加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  loadPosts()
}

function openPost(postId: string) {
  router.push(`/community/posts/${postId}`)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

watch(page, loadPosts)
onMounted(loadPosts)
</script>

<style scoped>
.community-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header,
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
  font-weight: 700;
}

.page-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.toolbar {
  align-items: stretch;
}

.toolbar .v-text-field {
  max-width: 520px;
}

.post-list {
  display: grid;
  gap: 12px;
}

.post-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color .2s, box-shadow .2s, transform .2s;
}

.post-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .08);
  transform: translateY(-1px);
}

.post-main h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 18px;
}

.post-main p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.meta,
.stats {
  display: flex;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}

.meta {
  margin-top: 12px;
}

.stats {
  align-items: center;
}

.stats span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
}

@media (max-width: 720px) {
  .page-header,
  .toolbar,
  .post-card {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar .v-text-field {
    max-width: none;
  }
}
</style>
