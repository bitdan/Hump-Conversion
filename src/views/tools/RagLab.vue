<template>
  <ToolPageLayout :card="false" density="workspace" max-width="max-w-full">
    <div class="rag-lab">
      <section class="pipeline-card glass-card">
        <div>
          <div class="eyebrow">Offline explainable RAG</div>
          <h2>证据图混合检索</h2>
          <p>不依赖模型或向量数据库，直接观察召回、图扩散、重排和引用是如何工作的。</p>
        </div>
        <div class="pipeline-flow">
          <div v-for="step in pipelineSteps" :key="step.title" class="pipeline-step">
            <v-icon :icon="step.icon" size="18" />
            <span>{{ step.title }}</span>
          </div>
        </div>
        <div class="stat-strip">
          <div><strong>{{ summary.document_count }}</strong><span>文档</span></div>
          <div><strong>{{ summary.chunk_count }}</strong><span>上下文块</span></div>
          <div><strong>{{ summary.graph_edge_count }}</strong><span>证据边</span></div>
          <div><strong>{{ summary.vocabulary_size }}</strong><span>检索词项</span></div>
        </div>
      </section>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" closable @click:close="errorMessage = ''">
        {{ errorMessage }}
      </v-alert>

      <div class="lab-grid">
        <section class="corpus-panel glass-card">
          <header class="panel-header">
            <div>
              <h3>知识输入</h3>
              <span>支持 Markdown 标题感知切块</span>
            </div>
            <div class="header-actions">
              <v-btn size="small" variant="text" prepend-icon="mdi-flask-outline" @click="loadExamples">示例</v-btn>
              <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addDocument">添加</v-btn>
            </div>
          </header>

          <div class="document-list">
            <article v-for="(document, index) in documents" :key="document.id" class="document-card solid-card">
              <div class="document-card__header">
                <span class="document-number">{{ index + 1 }}</span>
                <v-text-field v-model="document.title" label="文档标题" density="compact" variant="outlined" hide-details />
                <v-btn
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  color="error"
                  :disabled="documents.length === 1"
                  @click="removeDocument(index)"
                />
              </div>
              <v-text-field v-model="document.source" label="来源 / URL" density="compact" variant="outlined" hide-details />
              <v-textarea
                v-model="document.content"
                label="Markdown 或文本内容"
                variant="outlined"
                density="compact"
                rows="7"
                hide-details
              />
            </article>
          </div>

          <div class="corpus-actions">
            <v-btn variant="text" color="error" prepend-icon="mdi-database-remove-outline" @click="resetCollection">
              清空索引
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-database-sync-outline" :loading="indexing" @click="buildIndex">
              构建证据图
            </v-btn>
          </div>
        </section>

        <section class="query-panel glass-card">
          <header class="panel-header">
            <div>
              <h3>检索实验</h3>
              <span>结果附带可解释评分与引用</span>
            </div>
            <v-chip size="small" color="primary" variant="tonal">
              {{ indexed ? '索引就绪' : '等待索引' }}
            </v-chip>
          </header>

          <div class="query-box solid-card">
            <v-textarea
              v-model="question"
              label="输入一个需要跨文档检索的问题"
              placeholder="例如：为什么混合检索比只使用向量检索更可靠？"
              variant="outlined"
              rows="3"
              hide-details
              @keydown.ctrl.enter.prevent="runQuery"
            />
            <div class="query-presets">
              <v-chip
                v-for="preset in questionPresets"
                :key="preset"
                size="small"
                variant="outlined"
                @click="question = preset"
              >
                {{ preset }}
              </v-chip>
            </div>
            <div class="query-actions">
              <span>Ctrl + Enter 执行</span>
              <v-btn color="primary" prepend-icon="mdi-magnify" :loading="querying" :disabled="!indexed" @click="runQuery">
                检索并解释
              </v-btn>
            </div>
          </div>

          <div v-if="result" class="result-stack">
            <section class="answer-card solid-card">
              <div class="answer-heading">
                <div>
                  <span>基于证据的离线回答</span>
                  <strong>{{ result.diagnostics.confidence_label }}置信度</strong>
                </div>
                <v-progress-circular
                  :model-value="result.diagnostics.confidence * 100"
                  :color="confidenceColor"
                  :size="54"
                  :width="6"
                >
                  {{ Math.round(result.diagnostics.confidence * 100) }}
                </v-progress-circular>
              </div>
              <div class="answer-text">{{ result.answer }}</div>
              <div class="term-groups">
                <div>
                  <span>原始词项</span>
                  <v-chip v-for="term in result.diagnostics.query_terms" :key="term" size="x-small" variant="tonal">
                    {{ term }}
                  </v-chip>
                </div>
                <div>
                  <span>查询扩展</span>
                  <v-chip
                    v-for="term in result.diagnostics.expanded_terms"
                    :key="term"
                    size="x-small"
                    color="info"
                    variant="tonal"
                  >
                    {{ term }}
                  </v-chip>
                  <em v-if="result.diagnostics.expanded_terms.length === 0">没有触发扩展</em>
                </div>
              </div>
            </section>

            <section class="evidence-section">
              <div class="section-header">
                <h3>证据与评分</h3>
                <span>{{ result.diagnostics.retrieval_strategy }}</span>
              </div>
              <article v-for="evidence in result.evidence" :key="evidence.chunk_id" class="evidence-card solid-card">
                <div class="evidence-header">
                  <span class="evidence-rank">[{{ evidence.rank }}]</span>
                  <div>
                    <strong>{{ evidence.title }}</strong>
                    <span>{{ evidence.heading }} · {{ evidence.source || evidence.document_id }}</span>
                  </div>
                  <v-chip size="small" color="primary" variant="tonal">
                    {{ scorePercent(evidence.final_score) }} 综合
                  </v-chip>
                </div>
                <p>{{ evidence.content }}</p>
                <div class="matched-terms">
                  <span>命中</span>
                  <v-chip v-for="term in evidence.matched_terms" :key="term" size="x-small" variant="outlined">{{ term }}</v-chip>
                </div>
                <div class="score-grid">
                  <div v-for="score in evidenceScores(evidence)" :key="score.label">
                    <span>{{ score.label }} <strong>{{ scorePercent(score.value) }}</strong></span>
                    <v-progress-linear :model-value="clampScore(score.value) * 100" :color="score.color" height="5" rounded />
                  </div>
                </div>
              </article>
            </section>

            <section v-if="result.graph_edges.length" class="graph-card solid-card">
              <div class="section-header">
                <h3>证据图连接</h3>
                <span>这些连接参与了图扩散加分</span>
              </div>
              <div class="edge-list">
                <div v-for="edge in result.graph_edges" :key="`${edge.source_chunk_id}-${edge.target_chunk_id}`">
                  <v-icon icon="mdi-source-branch" color="info" size="18" />
                  <span>{{ chunkLabel(edge.source_chunk_id) }}</span>
                  <strong>{{ Math.round(edge.weight * 100) }}%</strong>
                  <span>{{ chunkLabel(edge.target_chunk_id) }}</span>
                  <em>{{ edge.reason }}</em>
                </div>
              </div>
            </section>
          </div>

          <div v-else class="empty-state result-empty">
            <v-icon icon="mdi-text-search-variant" size="44" />
            <h3>先构建索引，再提出问题</h3>
            <p>这里会展示答案、引用证据、评分拆解与证据图连接。</p>
          </div>
        </section>
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import {
  indexRagDocuments,
  queryRag,
  resetRagCollection,
  type RagDocumentInput,
  type RagEvidence,
  type RagIndexSummary,
  type RagQueryResult
} from '@/api/rag'

const COLLECTION_ID = 'evidence-graph-demo'

const exampleDocuments: RagDocumentInput[] = [
  {
    id: 'ragflow',
    title: 'RAGFlow 的工程启发',
    source: 'github.com/infiniflow/ragflow',
    content: `# 可解释检索
RAGFlow 强调可视化切块、可追踪引用和多路召回后的融合重排。RAG 系统不仅要给出答案，还要让用户看到答案依赖了哪些文本块。

# 质量原则
高质量 RAG 遵循 quality in, quality out。文档解析、切块和检索质量通常比更换更大的生成模型更重要。`
  },
  {
    id: 'lightrag',
    title: 'LightRAG 与知识图谱',
    source: 'github.com/HKUDS/LightRAG',
    content: `# 双层检索
LightRAG 将向量检索与知识图谱结合，通过实体和关系补充普通相似度检索难以发现的上下文。

# 引用与评测
现代 RAG 应返回检索上下文和引用，才能评估 context precision，并判断回答是否真正受到证据支持。`
  },
  {
    id: 'advanced-rag',
    title: 'Advanced RAG 技术',
    source: 'github.com/NirDiamant/RAG_Techniques',
    content: `# 混合检索与重排
Fusion Retrieval 合并关键词检索和语义检索。Reranking 再根据问题对候选证据重新排序，通常比单一路径召回更稳定。

# 多样性
MMR 在相关性与多样性之间做平衡，避免检索结果全部来自相似段落。Query Transformation、HyDE 和查询扩展可以提高召回率。`
  }
]

const pipelineSteps = [
  { title: '标题感知切块', icon: 'mdi-content-cut' },
  { title: '混合召回', icon: 'mdi-call-merge' },
  { title: '证据图扩散', icon: 'mdi-graph-outline' },
  { title: 'MMR 重排', icon: 'mdi-sort-variant' },
  { title: '引用与置信度', icon: 'mdi-shield-check-outline' }
]

const questionPresets = [
  '为什么混合检索比单一向量检索更可靠？',
  '证据图在 RAG 中解决了什么问题？',
  '如何判断一个 RAG 回答值得信任？'
]

const documents = ref<RagDocumentInput[]>(cloneExamples())
const summary = ref<RagIndexSummary>(emptySummary())
const question = ref(questionPresets[0])
const result = ref<RagQueryResult | null>(null)
const indexing = ref(false)
const querying = ref(false)
const errorMessage = ref('')
const indexed = computed(() => summary.value.chunk_count > 0)
const confidenceColor = computed(() => {
  const confidence = result.value?.diagnostics.confidence || 0
  return confidence >= 0.72 ? 'success' : confidence >= 0.42 ? 'warning' : 'error'
})

function cloneExamples() {
  return exampleDocuments.map(document => ({ ...document }))
}

function emptySummary(): RagIndexSummary {
  return {
    collection_id: COLLECTION_ID,
    document_count: 0,
    chunk_count: 0,
    graph_edge_count: 0,
    vocabulary_size: 0
  }
}

function loadExamples() {
  documents.value = cloneExamples()
  result.value = null
}

function addDocument() {
  const index = documents.value.length + 1
  documents.value.push({
    id: `custom-${Date.now()}`,
    title: `新文档 ${index}`,
    source: '',
    content: '# 标题\n在这里输入知识内容。'
  })
}

function removeDocument(index: number) {
  documents.value.splice(index, 1)
}

async function buildIndex() {
  const validDocuments = documents.value.filter(document => document.title.trim() && document.content.trim())
  if (!validDocuments.length) {
    errorMessage.value = '至少需要一篇包含标题和内容的文档'
    return
  }
  indexing.value = true
  errorMessage.value = ''
  try {
    const response = await indexRagDocuments(COLLECTION_ID, validDocuments)
    summary.value = response.data
    result.value = null
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.detail || error?.message || '索引构建失败'
  } finally {
    indexing.value = false
  }
}

async function runQuery() {
  if (!question.value.trim()) {
    errorMessage.value = '请输入问题'
    return
  }
  querying.value = true
  errorMessage.value = ''
  try {
    const response = await queryRag(COLLECTION_ID, question.value.trim(), 5)
    result.value = response.data
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.detail || error?.message || '检索失败'
  } finally {
    querying.value = false
  }
}

async function resetCollection() {
  try {
    const response = await resetRagCollection(COLLECTION_ID)
    summary.value = response.data
    result.value = null
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.detail || error?.message || '清空索引失败'
  }
}

function clampScore(value: number) {
  return Math.min(1, Math.max(0, value))
}

function scorePercent(value: number) {
  return `${Math.round(clampScore(value) * 100)}%`
}

function evidenceScores(evidence: RagEvidence) {
  return [
    { label: 'BM25 词法', value: evidence.lexical_score, color: 'primary' },
    { label: '哈希语义', value: evidence.semantic_score, color: 'info' },
    { label: '图扩散', value: evidence.graph_score, color: 'success' },
    { label: '多样性扣分', value: evidence.diversity_penalty, color: 'warning' }
  ]
}

function chunkLabel(chunkId: string) {
  const evidence = result.value?.evidence.find(item => item.chunk_id === chunkId)
  return evidence ? `[${evidence.rank}] ${evidence.heading}` : chunkId
}

onMounted(buildIndex)
</script>

<style scoped>
.rag-lab {
  display: flex;
  flex-direction: column;
  gap: var(--space-tight);
}

.pipeline-card {
  display: grid;
  grid-template-columns: minmax(230px, 0.9fr) minmax(480px, 1.6fr) auto;
  align-items: center;
  gap: 20px;
  padding: 18px;
}

.eyebrow {
  color: var(--color-primary);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pipeline-card h2,
.panel-header h3,
.section-header h3 {
  margin: 0;
  color: var(--color-text);
}

.pipeline-card h2 {
  margin-top: 3px;
  font-size: 1.25rem;
}

.pipeline-card p,
.panel-header span,
.section-header span {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.pipeline-flow {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow-x: auto;
}

.pipeline-step {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  padding: 7px 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.7rem;
  font-weight: 700;
}

.pipeline-step + .pipeline-step::before {
  content: '→';
  margin-left: -15px;
  color: var(--color-text-subtle);
}

.stat-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(54px, 1fr));
  gap: 6px;
}

.stat-strip div {
  display: grid;
  justify-items: center;
  padding: 7px;
  border-radius: var(--radius-element);
  background: var(--color-bg);
}

.stat-strip strong {
  color: var(--color-text);
  font-size: 1rem;
}

.stat-strip span {
  color: var(--color-text-muted);
  font-size: 0.65rem;
}

.lab-grid {
  display: grid;
  grid-template-columns: minmax(340px, 0.78fr) minmax(0, 1.5fr);
  gap: var(--space-tight);
  align-items: start;
}

.corpus-panel,
.query-panel {
  min-width: 0;
  padding: 16px;
}

.panel-header,
.section-header,
.document-card__header,
.corpus-actions,
.query-actions,
.answer-heading,
.evidence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-tight);
}

.panel-header {
  margin-bottom: 12px;
}

.panel-header h3,
.section-header h3 {
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
}

.document-list,
.result-stack,
.evidence-section {
  display: grid;
  gap: 10px;
}

.document-list {
  max-height: calc(100dvh - 285px);
  overflow-y: auto;
}

.document-card {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.document-card__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.document-number,
.evidence-rank {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-size: 0.72rem;
  font-weight: 800;
}

.corpus-actions {
  margin-top: 12px;
}

.query-box,
.answer-card,
.graph-card {
  padding: 12px;
}

.query-presets,
.matched-terms {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.query-actions {
  margin-top: 8px;
}

.query-actions span {
  color: var(--color-text-subtle);
  font-size: 0.7rem;
}

.result-stack {
  margin-top: 12px;
}

.answer-heading > div,
.evidence-header > div {
  display: grid;
  min-width: 0;
}

.answer-heading span,
.evidence-header span,
.matched-terms > span,
.term-groups span {
  color: var(--color-text-muted);
  font-size: 0.7rem;
}

.answer-heading strong {
  color: var(--color-text);
  font-size: 1rem;
}

.answer-text {
  margin-top: 10px;
  padding: 12px;
  border-left: 3px solid var(--color-primary);
  border-radius: 0 var(--radius-element) var(--radius-element) 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.83rem;
  line-height: 1.7;
  white-space: pre-wrap;
}

.term-groups {
  display: grid;
  gap: 7px;
  margin-top: 10px;
}

.term-groups > div {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.term-groups span {
  width: 58px;
}

.term-groups em {
  color: var(--color-text-subtle);
  font-size: 0.7rem;
}

.section-header {
  margin: 4px 0 0;
}

.evidence-card {
  padding: 12px;
}

.evidence-header {
  justify-content: flex-start;
}

.evidence-header > div {
  flex: 1;
}

.evidence-header strong {
  color: var(--color-text);
  font-size: 0.82rem;
}

.evidence-card p {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  line-height: 1.65;
}

.matched-terms {
  align-items: center;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.score-grid span {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: var(--color-text-muted);
  font-size: 0.65rem;
}

.edge-list {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.edge-list > div {
  display: grid;
  grid-template-columns: auto minmax(90px, 1fr) auto minmax(90px, 1fr) minmax(120px, 1.3fr);
  align-items: center;
  gap: 7px;
  padding: 7px;
  border-radius: var(--radius-element);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font-size: 0.68rem;
}

.edge-list strong {
  color: var(--color-info);
}

.edge-list em {
  color: var(--color-text-subtle);
}

.result-empty {
  min-height: 420px;
}

.result-empty h3,
.result-empty p {
  margin: 0;
}

@media (max-width: 1280px) {
  .pipeline-card {
    grid-template-columns: 1fr;
  }

  .stat-strip {
    max-width: 420px;
  }
}

@media (max-width: 960px) {
  .lab-grid {
    grid-template-columns: 1fr;
  }

  .document-list {
    max-height: none;
  }

  .score-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .score-grid,
  .stat-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .edge-list > div {
    grid-template-columns: auto 1fr auto;
  }

  .edge-list em {
    grid-column: 2 / -1;
  }
}
</style>
