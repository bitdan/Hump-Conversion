import request from '@/utils/request'

export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface RagDocumentInput {
  id?: string
  title: string
  content: string
  source: string
}

export interface RagIndexSummary {
  collection_id: string
  document_count: number
  chunk_count: number
  graph_edge_count: number
  vocabulary_size: number
}

export interface RagEvidence {
  rank: number
  chunk_id: string
  document_id: string
  title: string
  heading: string
  source: string
  content: string
  matched_terms: string[]
  lexical_score: number
  semantic_score: number
  graph_score: number
  diversity_penalty: number
  final_score: number
}

export interface RagGraphEdge {
  source_chunk_id: string
  target_chunk_id: string
  weight: number
  reason: string
}

export interface RagQueryResult {
  answer: string
  evidence: RagEvidence[]
  graph_edges: RagGraphEdge[]
  diagnostics: {
    query_terms: string[]
    expanded_terms: string[]
    retrieval_strategy: string
    confidence: number
    confidence_label: string
    knowledge_gap: string
  }
}

export function indexRagDocuments(collectionId: string, documents: RagDocumentInput[]) {
  return request.post<ApiResponse<RagIndexSummary>>('/api/v1/rag/index', {
    collection_id: collectionId,
    documents
  })
}

export function queryRag(collectionId: string, question: string, topK = 5) {
  return request.post<ApiResponse<RagQueryResult>>('/api/v1/rag/query', {
    collection_id: collectionId,
    question,
    top_k: topK
  })
}

export function resetRagCollection(collectionId: string) {
  return request.delete<ApiResponse<RagIndexSummary>>(`/api/v1/rag/collections/${collectionId}`)
}
