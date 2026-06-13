<template>
  <div class="detail-page">
    <div class="detail-actions">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/community/posts">返回列表</v-btn>
      <div v-if="canEdit" class="owner-actions">
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
      <div class="post-taxonomy">
        <span class="post-category">{{ post.category }}</span>
        <span v-for="tag in post.tags" :key="tag" class="post-tag">#{{ tag }}</span>
      </div>
      <div class="meta">
        <span>{{ post.author_name }}</span>
        <span>{{ formatDate(post.created_at) }}</span>
        <span><v-icon size="16">mdi-eye-outline</v-icon>{{ post.view_count }}</span>
      </div>
      <div class="markdown-body" v-html="renderMarkdown(post.content || '')"></div>
    </article>

    <section v-if="post" class="comments">
      <header class="comments-header">
        <h2>回复</h2>
        <span>{{ comments.length }} 条</span>
      </header>

      <v-alert v-if="commentError" type="error" variant="tonal" class="mb-3">
        {{ commentError }}
      </v-alert>

      <div v-if="userStore.token" class="reply-box">
        <div v-if="replyTarget" class="reply-context">
          <span>正在回复 <strong>{{ replyTarget.author_name }}</strong></span>
          <v-btn size="small" variant="text" @click="cancelReply">取消回复</v-btn>
        </div>
        <MarkdownComposer
          ref="replyComposerRef"
          v-model="replyContent"
          :placeholder="replyTarget ? `回复 ${replyTarget.author_name}，支持 Markdown...` : '写下你的回复，支持 Markdown...'"
          :max-length="5000"
          :height="190"
        />
        <div class="reply-actions">
          <v-btn color="primary" prepend-icon="mdi-reply" :loading="replying" @click="submitReply">回复</v-btn>
        </div>
      </div>
      <v-alert v-else type="info" variant="tonal" class="mb-4">
        登录后可以回复。
      </v-alert>

      <v-skeleton-loader v-if="commentsLoading" type="list-item-three-line@3"/>
      <div v-else class="comment-list">
        <template v-if="commentTree.length > 0">
          <article v-for="comment in commentTree" :key="comment.id" class="comment-card">
            <div class="comment-meta">
              <strong>{{ comment.author_name }}</strong>
              <span>{{ formatDate(comment.created_at) }}</span>
              <button v-if="userStore.token" class="reply-link" type="button" @click="startReply(comment)">回复</button>
            </div>
            <div class="comment-content markdown-body" v-html="renderMarkdown(comment.content)"></div>
            <div v-if="comment.children.length > 0" class="nested-comments">
              <article v-for="child in comment.children" :key="child.id" class="comment-card nested">
                <div class="comment-meta">
                  <strong>{{ child.author_name }}</strong>
                  <span v-if="child.reply_to_author_name">回复 {{ child.reply_to_author_name }}</span>
                  <span>{{ formatDate(child.created_at) }}</span>
                  <button v-if="userStore.token" class="reply-link" type="button" @click="startReply(child)">回复
                  </button>
                </div>
                <div class="comment-content markdown-body" v-html="renderMarkdown(child.content)"></div>
                <div v-if="child.children.length > 0" class="nested-comments">
                  <NestedComment
                      v-for="descendant in child.children"
                      :key="descendant.id"
                      :comment="descendant"
                      :can-reply="Boolean(userStore.token)"
                      @reply="startReply"
                  />
                </div>
              </article>
            </div>
          </article>
        </template>
        <v-empty-state v-else icon="mdi-comment-outline" title="暂无回复" text="可以发布第一条回复。"/>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, defineComponent, h, nextTick, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {
  createPostComment,
  deletePost,
  getPost,
  listPostComments,
  type PostCommentItem,
  type PostItem
} from '@/api/post'
import {useUserStore} from '@/stores/user'
import {renderMarkdown} from '@/utils/markdown'
import MarkdownComposer from '@/components/community/MarkdownComposer.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const post = ref<PostItem | null>(null)
const comments = ref<PostCommentItem[]>([])
const loading = ref(false)
const commentsLoading = ref(false)
const error = ref('')
const commentError = ref('')
const replyContent = ref('')
const replyComposerRef = ref<InstanceType<typeof MarkdownComposer> | null>(null)
const replying = ref(false)
const replyTarget = ref<CommentNode | null>(null)

interface CommentNode extends PostCommentItem {
  children: CommentNode[]
}

const canEdit = computed(() => Boolean(
    post.value && (post.value.can_edit || userStore.userId === post.value.author_id)
))

const commentTree = computed<CommentNode[]>(() => {
  const nodes = new Map<string, CommentNode>()
  const roots: CommentNode[] = []
  comments.value.forEach(comment => {
    nodes.set(comment.id, {...comment, children: []})
  })
  nodes.forEach(node => {
    const parent = node.parent_id ? nodes.get(node.parent_id) : null
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
})

const NestedComment = defineComponent({
  name: 'NestedComment',
  props: {
    comment: {
      type: Object as () => CommentNode,
      required: true
    },
    canReply: {
      type: Boolean,
      default: false
    }
  },
  emits: ['reply'],
  setup(props, {emit}) {
    return () => h('article', {class: 'comment-card nested'}, [
      h('div', {class: 'comment-meta'}, [
        h('strong', props.comment.author_name),
        props.comment.reply_to_author_name ? h('span', `回复 ${props.comment.reply_to_author_name}`) : null,
        h('span', formatDate(props.comment.created_at)),
        props.canReply ? h('button', {
          class: 'reply-link',
          type: 'button',
          onClick: () => emit('reply', props.comment)
        }, '回复') : null
      ]),
      h('div', {
        class: 'comment-content markdown-body',
        innerHTML: renderMarkdown(props.comment.content)
      }),
      props.comment.children.length > 0
          ? h('div', {class: 'nested-comments'}, props.comment.children.map(child =>
              h(NestedComment, {
                key: child.id,
                comment: child,
                canReply: props.canReply,
                onReply: (comment: CommentNode) => emit('reply', comment)
              })
          ))
          : null
    ])
  }
})

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

async function loadComments() {
  commentsLoading.value = true
  commentError.value = ''
  try {
    const response = await listPostComments(String(route.params.id))
    comments.value = response.data
  } catch (err: any) {
    commentError.value = err?.response?.data?.detail || err?.message || '回复加载失败'
  } finally {
    commentsLoading.value = false
  }
}

async function removePost() {
  if (!post.value || !window.confirm('确定删除这篇帖子吗？')) return
  await deletePost(post.value.id)
  router.push('/community/posts')
}

async function submitReply() {
  const content = replyContent.value.trim()
  if (!content) {
    commentError.value = '回复内容不能为空'
    return
  }
  replying.value = true
  commentError.value = ''
  try {
    const response = await createPostComment(String(route.params.id), {
      content,
      parent_id: replyTarget.value?.id || null
    })
    comments.value.push(response.data)
    replyContent.value = ''
    replyTarget.value = null
    if (post.value) {
      post.value.comment_count += 1
    }
  } catch (err: any) {
    commentError.value = err?.response?.data?.detail || err?.message || '回复失败'
  } finally {
    replying.value = false
  }
}

async function startReply(comment: CommentNode) {
  replyTarget.value = comment
  await nextTick()
  replyComposerRef.value?.focus()
}

function cancelReply() {
  replyTarget.value = null
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(async () => {
  await loadPost()
  if (post.value) {
    await loadComments()
  }
})
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

.post-taxonomy {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.post-category,
.post-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.post-category {
  background: #e0f2fe;
  color: #0369a1;
}

.post-tag {
  background: #f3f4f6;
  color: #4b5563;
}

.meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.comments,
.post-detail {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.comments {
  padding: 20px;
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.comments-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
}

.comments-header span,
.comment-meta {
  color: #64748b;
  font-size: 13px;
}

.reply-box {
  margin-bottom: 16px;
}

.reply-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.comment-list {
  display: grid;
  gap: 12px;
}

.comment-card {
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.comment-card.nested {
  background: #ffffff;
}

.nested-comments {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding-left: 16px;
  border-left: 2px solid #dbeafe;
}

.comment-meta {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.reply-link {
  padding: 0;
  background: transparent;
  color: #2563eb;
  line-height: 1;
  font-size: 13px;
}

.comment-meta strong {
  color: #334155;
}

.markdown-body {
  margin-top: 24px;
  color: #1f2937;
  font-size: 16px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.comment-content.markdown-body {
  margin-top: 0;
  font-size: 14px;
  line-height: 1.7;
}

.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 20px 0 10px;
  color: #0f172a;
  line-height: 1.35;
}

.markdown-body :deep(pre) {
  margin: 12px 0;
  padding: 12px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  overflow-x: auto;
}

.markdown-body :deep(code) {
  padding: 2px 5px;
  border-radius: 4px;
  background: #e2e8f0;
  color: #0f172a;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}

.markdown-body :deep(blockquote) {
  margin: 12px 0;
  padding-left: 12px;
  border-left: 3px solid #93c5fd;
  color: #475569;
}

.markdown-body :deep(a) {
  color: #2563eb;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0 12px;
  padding-left: 24px;
}

.markdown-body :deep(li + li) {
  margin-top: 4px;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--color-bg);
}

.markdown-body :deep(hr) {
  margin: 18px 0;
  border: 0;
  border-top: 1px solid var(--color-border);
}

.markdown-body :deep(img:not(.inline-sticker)) {
  max-width: 100%;
  border-radius: var(--radius-element);
}

.markdown-body :deep(input[type='checkbox']) {
  accent-color: var(--color-primary);
}

.markdown-body :deep(.inline-sticker) {
  width: 44px;
  height: 44px;
  vertical-align: middle;
  margin: 0 4px;
  border-radius: 10px;
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
