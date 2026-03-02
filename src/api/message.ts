import request from '@/utils/request'

export interface ChatUser {
  userId: number
  userName: string
  role: string
  avatarUrl?: string
}

export interface ChatConversation {
  peerId: number
  peerName: string
  peerRole: string
  lastContent: string
  lastTime: string
  unreadCount: number
  avatarUrl?: string
}

export interface ChatMessage {
  msgId: number
  msgUid?: string
  fromId: number
  toId: number | null
  groupId?: number
  relatedTaskId?: number
  msgType: string
  content: string
  extra?: string
  sendTime: string
  readStatus: number // Updated from readFlag
  // recallFlag?: number // Removed in V7
}

export function fetchChatUsers(keyword?: string) {
  return request.get('/user/message/users', { params: { keyword } })
}

export function fetchConversations(userId: number) {
  return request.get('/user/message/conversations', { params: { userId } })
}

export function fetchHistory(userId: number, peerId: number, page = 1, size = 20) {
  return request.get('/user/message/history', { params: { userId, peerId, page, size } })
}

export function searchMessages(params: {
  userId: number
  keyword: string
  peerId?: number
  groupId?: number
  page?: number
  size?: number
}) {
  return request.get('/user/message/search', { params })
}

export function sendMessage(payload: {
  fromId: number
  toId: number
  relatedTaskId?: number
  msgType?: string
  content: string
  extra?: string
  msgUid?: string
}) {
  return request.post('/user/message/send', payload)
}

export function recallMessage(userId: number, msgId?: number, msgUid?: string) {
  return request.post('/user/message/recall', { userId, msgId, msgUid })
}

export function markRead(userId: number, peerId: number) {
  return request.post('/user/message/read', { userId, peerId })
}

export function fetchUnreadList(userId: number, limit = 50) {
  return request.get('/user/message/unread-list', { params: { userId, limit } })
}

export function fetchUnreadCount(userId: number) {
  return request.get('/user/message/unread-count', { params: { userId } })
}

export interface ChatGroup {
  groupId: number
  groupName: string
  creatorId: number
  memberCount?: number
  lastContent?: string
  lastTime?: string
  unreadCount?: number
}

export function fetchGroups(userId: number) {
  return request.get('/user/message/group/list', { params: { userId } })
}

export function fetchGroupConversations(userId: number) {
  return request.get('/user/message/group/conversations', { params: { userId } })
}

export function fetchGroupMembers(groupId: number) {
  return request.get('/user/message/group/members', { params: { groupId } })
}

export function createGroup(payload: { groupName: string; creatorId: number; memberIds: number[] }) {
  return request.post('/user/message/group/create', payload)
}

export function addGroupMember(groupId: number, userId: number) {
  return request.post('/user/message/group/add-member', null, { params: { groupId, userId } })
}

export function fetchGroupHistory(userId: number, groupId: number, page = 1, size = 20) {
  return request.get('/user/message/group/history', { params: { userId, groupId, page, size } })
}

export function sendGroupMessage(payload: {
  groupId: number
  fromId: number
  msgType?: string
  content: string
  extra?: string
}) {
  return request.post('/user/message/group/send', payload)
}
