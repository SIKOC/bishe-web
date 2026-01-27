<template>
  <div class="chat-page">
    <el-page-header @back="$router.back()" style="margin-bottom: 16px">
      <template #content>
        <span class="text-large font-600">消息对话</span>
      </template>
    </el-page-header>

    <div class="chat-layout">
      <div class="chat-sider">
        <div class="sider-header">
          <span>会话列表</span>
          <el-tag size="small" :type="connected ? 'success' : 'danger'">
            {{ connected ? '在线' : '离线' }}
          </el-tag>
        </div>
        <div class="contact-list">
          <div
            v-for="c in conversations"
            :key="c.peerId"
            class="contact-item"
            :class="{ active: activePeerId === c.peerId }"
            @click="selectPeer(c.peerId)"
          >
            <div class="avatar">{{ (c.peerName || 'U').charAt(0) }}</div>
            <div class="contact-meta">
              <div class="name">
                {{ c.peerName || '未知用户' }}
                <el-badge v-if="c.unreadCount" :value="c.unreadCount" class="badge" />
              </div>
              <div class="desc">{{ c.lastContent || c.peerRole }}</div>
            </div>
          </div>
          <div v-if="conversations.length === 0" class="empty-state">暂无会话</div>
        </div>

        <div class="sider-divider">用户列表</div>
        <div class="contact-list compact">
          <div
            v-for="u in users"
            :key="u.userId"
            class="contact-item"
            :class="{ active: activePeerId === u.userId }"
            @click="selectPeer(u.userId)"
          >
            <div class="avatar">{{ (u.userName || 'U').charAt(0) }}</div>
            <div class="contact-meta">
              <div class="name">{{ u.userName }}</div>
              <div class="desc">{{ u.role }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-main">
        <div class="chat-header">
          <div class="title">
            {{ activePeer?.userName || activeConversation?.peerName || '未选择会话' }}
            <span class="sub">{{ activePeer?.role || activeConversation?.peerRole }}</span>
          </div>
          <div class="header-actions">
            <el-button size="small" text @click="clearCurrent">清空</el-button>
          </div>
        </div>

        <div class="chat-body" ref="chatBodyRef">
          <div v-if="currentMessages.length === 0" class="empty">
            暂无消息
          </div>
          <div v-else class="message-list">
            <div
              v-for="(m, index) in currentMessages"
              :key="index"
              class="message-item"
              :class="{ self: m.fromId === currentUserId }"
            >
              <div class="bubble">
                <div class="content">{{ m.content }}</div>
                <div class="meta">{{ formatTime(m.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-input">
          <el-input
            v-model="draft"
            type="textarea"
            :rows="2"
            placeholder="输入消息，Enter 发送"
            @keyup.enter.exact.prevent="sendMessage"
          />
          <el-button type="primary" @click="sendMessage" :disabled="!draft.trim() || !activePeerId">发送</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket'
import {
  fetchChatUsers,
  fetchConversations,
  fetchHistory,
  sendMessage as sendMessageApi,
  markRead,
  fetchUnreadCount,
  ChatUser,
  ChatConversation,
} from '@/api/message'

interface ChatMessage {
  fromId: number
  toId: number
  content: string
  timestamp: number
}

const conversations = ref<ChatConversation[]>([])
const users = ref<ChatUser[]>([])
const activePeerId = ref<number | null>(null)
const messages = ref<Record<string, ChatMessage[]>>({})
const draft = ref('')
const connected = ref(false)
const chatBodyRef = ref<HTMLElement | null>(null)
const unreadCount = ref(0)

const currentUserId = computed(() => {
  try {
    const raw = localStorage.getItem('user')
    const user = raw ? JSON.parse(raw) : null
    return Number(user?.id || 0)
  } catch {
    return 0
  }
})

const activeConversation = computed(() => conversations.value.find(c => c.peerId === activePeerId.value))
const activePeer = computed(() => users.value.find(u => u.userId === activePeerId.value))
const currentMessages = computed(() => messages.value[String(activePeerId.value || '')] || [])

const wsUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_NETTY_WS_BASE || 'ws://localhost:18080'
  return `${baseUrl}/ws`
})

const ws = useWebSocket({
  url: wsUrl.value,
  autoReconnect: true,
  getToken: () => localStorage.getItem('access_token'),
  onOpen: () => {
    connected.value = true
  },
  onClose: () => {
    connected.value = false
  }
})

const appendMessage = async (threadId: string, msg: ChatMessage): Promise<void> => {
  if (!messages.value[threadId]) {
    messages.value[threadId] = []
  }
  messages.value[threadId].push(msg)
  await nextTick()
  if (threadId === String(activePeerId.value || '') && chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}

const handleChatMessage = (message: WebSocketMessage): void => {
  if (message.type !== 'chat') return
  const data = message.data || {}
  const fromUserId = Number(data.fromUserId || 0)
  const toUserId = data.toUserId ? Number(data.toUserId) : 0
  if (fromUserId === currentUserId.value) {
    return
  }
  const threadId = String(fromUserId)
  appendMessage(threadId, {
    fromId: fromUserId,
    toId: toUserId,
    content: data.content || '',
    timestamp: Number(data.timestamp || Date.now())
  })
  if (activePeerId.value === fromUserId) {
    markRead(currentUserId.value, fromUserId).then(() => refreshConversations())
  } else {
    refreshConversations()
    refreshUnread()
  }
}

ws.handleMessage = (message: WebSocketMessage) => {
  handleChatMessage(message)
}

const sendMessage = async (): Promise<void> => {
  const content = draft.value.trim()
  if (!content) return
  if (!activePeerId.value) {
    ElMessage.warning('请选择会话')
    return
  }
  const toUserId = activePeerId.value
  await sendMessageApi({
    fromId: currentUserId.value,
    toId: toUserId,
    msgType: 'text',
    content
  })
  ws.send({ type: 'chat', toUserId: String(toUserId), content })
  appendMessage(String(toUserId), {
    fromId: currentUserId.value,
    toId: toUserId,
    content,
    timestamp: Date.now()
  })
  refreshConversations()
  draft.value = ''
}

const clearCurrent = (): void => {
  if (!activePeerId.value) return
  messages.value[String(activePeerId.value)] = []
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const refreshUsers = async (): Promise<void> => {
  const res: any = await fetchChatUsers()
  users.value = res?.data ?? res ?? []
}

const refreshConversations = async (): Promise<void> => {
  if (!currentUserId.value) return
  const res: any = await fetchConversations(currentUserId.value)
  conversations.value = res?.data ?? res ?? []
}

const refreshUnread = async (): Promise<void> => {
  if (!currentUserId.value) return
  const res: any = await fetchUnreadCount(currentUserId.value)
  unreadCount.value = res?.data ?? res ?? 0
}

const loadHistory = async (peerId: number): Promise<void> => {
  const res: any = await fetchHistory(currentUserId.value, peerId, 1, 50)
  const pageData = res?.data ?? res ?? {}
  const records = pageData.records || []
  const list = records.map((item: any) => ({
    fromId: item.fromId,
    toId: item.toId,
    content: item.content,
    timestamp: new Date(item.sendTime).getTime()
  }))
  messages.value[String(peerId)] = list
  await nextTick()
  if (chatBodyRef.value) chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
}

const selectPeer = async (peerId: number): Promise<void> => {
  activePeerId.value = peerId
  await loadHistory(peerId)
  await markRead(currentUserId.value, peerId)
  await refreshConversations()
  await refreshUnread()
}

onMounted(async () => {
  ws.connect()
  await refreshUsers()
  await refreshConversations()
  await refreshUnread()
  if (conversations.value.length > 0) {
    selectPeer(conversations.value[0].peerId)
  }
})
</script>

<style scoped lang="scss">
.chat-page {
  padding: 16px 20px;
  min-height: calc(100vh - 60px);
}

.chat-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  height: calc(100vh - 140px);
}

.chat-sider {
  border-radius: 12px;
  background: rgba(11, 24, 48, 0.9);
  border: 1px solid rgba(86, 211, 255, 0.18);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.sider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: #e6f0ff;
  font-weight: 600;
}

.contact-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contact-list.compact {
  max-height: 240px;
}

.sider-divider {
  margin: 12px 0 8px;
  font-size: 12px;
  color: #9bb3d3;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.badge :deep(.el-badge__content) {
  background: #ff7a45;
}

.contact-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  color: #dbe8ff;
}

.contact-item.active {
  border-color: rgba(86, 211, 255, 0.6);
  box-shadow: inset 0 0 12px rgba(86, 211, 255, 0.2);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3e8ef7, #58e0ff);
  color: #0b1b33;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.contact-meta .name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.contact-meta .desc {
  font-size: 12px;
  color: #9bb3d3;
}

.chat-main {
  display: flex;
  flex-direction: column;
  background: rgba(11, 24, 48, 0.92);
  border-radius: 12px;
  border: 1px solid rgba(86, 211, 255, 0.18);
}

.chat-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(86, 211, 255, 0.12);
  color: #e6f0ff;
}

.chat-header .sub {
  margin-left: 8px;
  font-size: 12px;
  color: #9bb3d3;
}

.chat-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-item {
  display: flex;
}

.message-item.self {
  justify-content: flex-end;
}

.bubble {
  max-width: 60%;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  color: #e6f0ff;
}

.message-item.self .bubble {
  background: linear-gradient(135deg, rgba(86, 211, 255, 0.35), rgba(86, 211, 255, 0.15));
}

.bubble .meta {
  font-size: 11px;
  color: #9bb3d3;
  margin-top: 4px;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(86, 211, 255, 0.12);
}

.chat-input :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(86, 211, 255, 0.2);
  color: #e6f0ff;
}

.empty {
  color: #9bb3d3;
  text-align: center;
  margin-top: 30px;
}
</style>
