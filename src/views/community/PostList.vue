<template>
  <div class="community-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <h1>社区帖子</h1>
        <p>围绕工具、问题、实践经验展开讨论，支持按分类和标签过滤。</p>
      </div>
      <div class="hero-actions">
        <v-btn color="primary" size="large" prepend-icon="mdi-pencil-plus" to="/community/posts/new">
          发布帖子
        </v-btn>
      </div>
    </section>

    <section class="search-shell">
      <div class="search-card">
        <v-text-field
            v-model="keyword"
            class="search-input"
            density="comfortable"
            variant="solo-filled"
            rounded="lg"
            flat
            hide-details
            prepend-inner-icon="mdi-magnify"
            placeholder="搜索主题、关键词或使用经验"
            @keyup.enter="reload"
        >
          <template #append-inner>
            <v-btn icon="mdi-refresh" variant="text" size="small" @click="reload"/>
          </template>
        </v-text-field>
      </div>
    </section>

    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <section class="forum-shell">
      <div class="forum-toolbar">
        <div class="forum-shortcuts">
          <v-menu>
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="outlined" append-icon="mdi-chevron-down">
                分类
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item title="全部分类" @click="applyCategory('')"/>
              <v-list-item
                  v-for="item in categories"
                  :key="item"
                  :title="item"
                  @click="applyCategory(item)"
              />
            </v-list>
          </v-menu>

          <v-menu :close-on-content-click="false">
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="outlined" append-icon="mdi-chevron-down">
                标签
              </v-btn>
            </template>
            <div class="tag-filter-panel">
              <v-combobox
                  v-model="pendingTag"
                  label="按标签筛选"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  hide-details
                  :items="tagOptions"
              />
              <div class="tag-filter-actions">
                <v-btn variant="text" @click="applyTag('')">清空</v-btn>
                <v-btn color="primary" @click="applyTag(pendingTag)">应用</v-btn>
              </div>
            </div>
          </v-menu>
        </div>

        <v-btn-toggle
            v-model="activeTab"
            class="forum-tabs"
            density="comfortable"
            mandatory
            variant="text"
            divided
        >
          <v-btn
              v-for="tab in tabs"
              :key="tab.value"
              :value="tab.value"
              size="small"
          >
            {{ tab.label }}
          </v-btn>
        </v-btn-toggle>

        <v-btn variant="text" prepend-icon="mdi-refresh" @click="reload">刷新</v-btn>
      </div>

      <div v-if="selectedCategory || selectedTag" class="active-filters">
        <v-chip
            v-if="selectedCategory"
            closable
            color="primary"
            variant="outlined"
            @click:close="applyCategory('')"
        >
          分类: {{ selectedCategory }}
        </v-chip>
        <v-chip
            v-if="selectedTag"
            closable
            color="primary"
            variant="outlined"
            @click:close="applyTag('')"
        >
          标签: #{{ selectedTag }}
        </v-chip>
      </div>

      <div v-if="loading" class="loading-shell">
        <v-skeleton-loader type="list-item-two-line@5"/>
      </div>

      <template v-else>
        <div v-if="sortedPosts.length > 0" class="topic-hint">
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-forum-outline" @click="reload">
            当前共 {{ total }} 个主题
          </v-btn>
        </div>

        <div class="topic-table">
          <div class="topic-head">
            <span>Topic</span>
            <span>Replies</span>
            <span>Views</span>
            <span>Activity</span>
          </div>

          <article
              v-for="post in sortedPosts"
              :key="post.id"
              class="topic-row"
              @click="openPost(post.id)"
          >
            <div class="topic-main">
              <div class="topic-title-line">
                <span class="pin-mark" aria-hidden="true">•</span>
                <h2>{{ post.title }}</h2>
              </div>
              <div class="topic-tags">
                <span class="topic-badge" :style="{ color: categoryColor(post.category) }">
                  {{ post.category }}
                </span>
                <v-chip
                    v-for="tag in post.tags"
                    :key="tag"
                    size="small"
                    variant="tonal"
                    class="topic-tag-button"
                    @click.stop="applyTag(tag)"
                >
                  #{{ tag }}
                </v-chip>
              </div>
              <p>{{ summarize(post.content) }}</p>
            </div>

            <div class="topic-replies">
              <div class="participant-stack" aria-hidden="true">
                <span
                    v-for="avatar in buildParticipants(post)"
                    :key="`${post.id}-${avatar}`"
                    class="participant-avatar"
                >
                  {{ avatar }}
                </span>
              </div>
              <strong>{{ formatCount(post.comment_count) }}</strong>
            </div>

            <div class="topic-views">{{ formatCompact(post.view_count) }}</div>
            <div class="topic-activity">{{ formatRelative(post.updated_at || post.created_at) }}</div>
          </article>

          <v-empty-state
              v-if="sortedPosts.length === 0"
              icon="mdi-forum-outline"
              title="暂无帖子"
              text="可以发布第一篇帖子。"
          />
        </div>
      </template>
    </section>

    <div v-if="total > pageSize" class="pagination">
      <v-pagination v-model="page" :length="pageCount" rounded="circle"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {listPosts, type PostItem} from '@/api/post'
import {usePagination} from '@/composables/usePagination'
import {POST_CATEGORIES, POST_CATEGORY_COLORS} from '@/views/community/postMeta'
import {replaceStickerTokens} from '@/utils/stickers'

type TabValue = 'latest' | 'top' | 'hot'

const router = useRouter()
const keyword = ref('')
const {page, pageSize, total, pageCount, reset} = usePagination()
const posts = ref<PostItem[]>([])
const loading = ref(false)
const error = ref('')
const activeTab = ref<TabValue>('latest')
const selectedCategory = ref('')
const selectedTag = ref('')
const pendingTag = ref('')

const tabs: Array<{ label: string; value: TabValue }> = [
  {label: '最新', value: 'latest'},
  {label: '高赞', value: 'top'},
  {label: '热门', value: 'hot'}
]

const categories = POST_CATEGORIES

const tagOptions = computed(() => {
  const tags = new Set<string>()
  posts.value.forEach(post => {
    post.tags.forEach(tag => tags.add(tag))
  })
  return Array.from(tags)
})

const sortedPosts = computed(() => {
  const items = [...posts.value]
  switch (activeTab.value) {
    case 'top':
      return items.sort((a, b) => (b.view_count + b.like_count * 3) - (a.view_count + a.like_count * 3))
    case 'hot':
      return items.sort((a, b) => topicHeat(b) - topicHeat(a))
    case 'latest':
    default:
      return items.sort((a, b) => getTime(b.updated_at || b.created_at) - getTime(a.updated_at || a.created_at))
  }
})

async function loadPosts() {
  loading.value = true
  error.value = ''
  try {
    const response = await listPosts({
      keyword: keyword.value.trim(),
      category: selectedCategory.value,
      tag: selectedTag.value,
      page: page.value,
      page_size: pageSize.value
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
  reset()
  loadPosts()
}

function applyCategory(value: string) {
  selectedCategory.value = value
  reset()
  loadPosts()
}

function applyTag(value: string) {
  selectedTag.value = String(value || '').trim()
  pendingTag.value = selectedTag.value
  reset()
  loadPosts()
}

function openPost(postId: string) {
  router.push(`/community/posts/${postId}`)
}

function summarize(content?: string) {
  const normalized = replaceStickerTokens(String(content || ''), (sticker) => `[${sticker.name}]`)
      .replace(/\s+/g, ' ')
      .trim()
  if (!normalized) return '这篇帖子还没有摘要，点进去查看完整内容。'
  return normalized.length > 132 ? `${normalized.slice(0, 132)}...` : normalized
}

function buildParticipants(post: PostItem) {
  const seed = authorInitial(post.author_name)
  const extras = ['T', 'H', 'U', 'B']
  const size = Math.min(4, Math.max(1, Math.ceil((post.comment_count + 1) / 3)))
  return [seed, ...extras].slice(0, size)
}

function authorInitial(name: string) {
  const normalized = String(name || '').trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : 'U'
}

function topicHeat(post: PostItem) {
  const ageHours = Math.max(1, (Date.now() - getTime(post.updated_at || post.created_at)) / (1000 * 60 * 60))
  return (post.comment_count * 4 + post.like_count * 3 + post.view_count * 0.15) / ageHours
}

function getTime(value: string) {
  return new Date(value).getTime()
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en', {notation: 'compact', maximumFractionDigits: 1}).format(value)
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function formatRelative(value: string) {
  const diff = Date.now() - getTime(value)
  const hour = 1000 * 60 * 60
  const day = hour * 24
  if (diff < hour) return `${Math.max(1, Math.floor(diff / (1000 * 60)))}m`
  if (diff < day) return `${Math.floor(diff / hour)}h`
  return `${Math.floor(diff / day)}d`
}

function categoryColor(category: string) {
  return POST_CATEGORY_COLORS[category] || '#2b84cb'
}

watch(page, loadPosts)
onMounted(loadPosts)
</script>

<style scoped>
.community-page {
  --community-bg: linear-gradient(180deg, #f8fbff 0%, #ffffff 28%, #f5f7fb 100%);
  --community-panel: #ffffff;
  --community-text: #1f2937;
  --community-muted: #6b7280;
  --community-accent: #2596f3;
  --community-accent-soft: #d9eefc;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: var(--community-bg);
}

.hero-panel {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 4px 0;
}

.hero-copy h1 {
  margin: 0;
  color: #1d2433;
  font-size: clamp(34px, 5vw, 60px);
  line-height: .95;
  font-weight: 800;
}

.hero-copy p {
  max-width: 760px;
  margin: 14px 0 0;
  color: var(--community-muted);
  font-size: 15px;
  line-height: 1.7;
}

.search-shell {
  display: flex;
  justify-content: center;
}

.search-card {
  width: min(100%, 760px);
}

.search-input :deep(.v-field) {
  border: 2px solid #43a4f5;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(62, 125, 178, .08);
}

.search-input :deep(.v-field__input) {
  min-height: 58px;
  font-size: 18px;
}

.forum-shell {
  border: 1px solid rgba(214, 223, 232, .9);
  border-radius: 20px;
  background: var(--community-panel);
  box-shadow: 0 18px 40px rgba(15, 23, 42, .05);
  overflow: hidden;
}

.forum-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px 12px;
}

.forum-shortcuts,
.active-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tag-filter-panel {
  width: min(320px, calc(100vw - 32px));
  padding: 16px;
  background: #ffffff;
}

.tag-filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.forum-tabs {
  border: 1px solid #d8dee8;
  border-radius: 8px;
  overflow: hidden;
}

.active-filters {
  padding: 0 22px 14px;
}

.loading-shell {
  padding: 12px 22px 24px;
}

.topic-hint {
  display: flex;
  justify-content: center;
  padding: 4px 22px 10px;
}

.topic-table {
  display: flex;
  flex-direction: column;
}

.topic-head,
.topic-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 148px 92px 92px;
  gap: 20px;
  align-items: center;
  padding: 16px 22px;
}

.topic-head {
  color: #8a94a5;
  font-size: 14px;
  border-top: 1px solid #edf2f7;
  border-bottom: 1px solid #edf2f7;
}

.topic-row {
  cursor: pointer;
  border-bottom: 1px solid #edf2f7;
  transition: background-color .18s ease;
}

.topic-row:last-child {
  border-bottom: 0;
}

.topic-row:hover {
  background: #f8fbff;
}

.topic-main {
  min-width: 0;
}

.topic-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pin-mark {
  color: #7d8797;
  font-size: 22px;
  line-height: 1;
}

.topic-main h2 {
  margin: 0;
  color: var(--community-text);
  font-size: 18px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.topic-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eef6ff;
  font-size: 12px;
  font-weight: 600;
}

.topic-badge.subtle {
  background: #f3f4f6;
  color: #6b7280;
}

.topic-tag-button {
  cursor: pointer;
}

.topic-main p {
  margin: 10px 0 0;
  color: #5b6472;
  line-height: 1.7;
}

.topic-replies,
.topic-views,
.topic-activity {
  color: #6b7280;
  font-size: 15px;
}

.topic-replies {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topic-replies strong,
.topic-views {
  color: #f28c2e;
  font-size: 15px;
  font-weight: 700;
}

.participant-stack {
  display: flex;
  align-items: center;
}

.participant-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-left: -6px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: linear-gradient(135deg, #cce7ff 0%, #7cc5ff 100%);
  color: #16405f;
  font-size: 12px;
  font-weight: 800;
}

.participant-avatar:first-child {
  margin-left: 0;
}

.pagination {
  display: flex;
  justify-content: center;
}

@media (max-width: 960px) {
  .hero-panel,
  .forum-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .topic-head,
  .topic-row {
    grid-template-columns: minmax(0, 1fr) 96px 72px 72px;
    gap: 12px;
  }
}

@media (max-width: 720px) {
  .community-page {
    padding: 14px;
  }

  .hero-copy h1 {
    font-size: 36px;
  }

  .topic-head {
    display: none;
  }

  .topic-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .topic-replies,
  .topic-views,
  .topic-activity {
    justify-content: flex-start;
  }

  .topic-main h2 {
    white-space: normal;
  }
}
</style>
