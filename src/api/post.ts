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
