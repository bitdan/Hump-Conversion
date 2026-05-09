import request from '@/utils/request'

export interface ApiResponse<T> {
    code: number
    msg: string
    data: T
}

export interface PostItem {
    id: string
    title: string
    content?: string
    author_id: string
    author_name: string
    view_count: number
    like_count: number
    comment_count: number
    created_at: string
    updated_at: string
    can_edit: boolean
}

export interface PostListData {
    items: PostItem[]
    total: number
    page: number
    page_size: number
}

export interface PostUpsertPayload {
    title: string
    content: string
}

export interface PostCommentItem {
    id: string
    post_id: string
    parent_id?: string | null
    author_id: string
    author_name: string
    reply_to_author_name?: string | null
    content: string
    created_at: string
    updated_at: string
    can_edit: boolean
}

export function listPosts(params: { keyword?: string; page?: number; page_size?: number }) {
    return request.get<ApiResponse<PostListData>>('/api/v1/posts', {params} as any)
}

export function getPost(postId: string) {
    return request.get<ApiResponse<PostItem>>(`/api/v1/posts/${postId}`)
}

export function createPost(payload: PostUpsertPayload) {
    return request.post<ApiResponse<PostItem>>('/api/v1/posts', payload)
}

export function updatePost(postId: string, payload: PostUpsertPayload) {
    return request.put<ApiResponse<PostItem>>(`/api/v1/posts/${postId}`, payload)
}

export function deletePost(postId: string) {
    return request.delete<ApiResponse<void>>(`/api/v1/posts/${postId}`)
}

export function listPostComments(postId: string) {
    return request.get<ApiResponse<PostCommentItem[]>>(`/api/v1/posts/${postId}/comments`)
}

export function createPostComment(postId: string, payload: { content: string; parent_id?: string | null }) {
    return request.post<ApiResponse<PostCommentItem>>(`/api/v1/posts/${postId}/comments`, payload)
}
