import request from '@/utils/request'

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

// 创建五子棋房间
export function createGomokuRoom() {
  console.log('调用创建房间接口')
  return request.post<ApiResponse<string>>('/game/room/create')
}

// 加入五子棋房间
export function joinGomokuRoom(roomId: string) {
  console.log('调用加入房间接口', roomId)
  return request.post<ApiResponse<void>>(`/game/room/join/${roomId}`)
}

// 离开五子棋房间
export function leaveGomokuRoom(roomId: string) {
  console.log('调用离开房间接口', roomId)
  return request.post<ApiResponse<void>>(`/game/room/leave/${roomId}`)
} 