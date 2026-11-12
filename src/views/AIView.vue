<script setup>
import { ref, nextTick, watch } from 'vue';
import axios from 'axios';

// 开发环境留空走 Vite 代理（/api → http://localhost:3000）
// 线上部署时用 VITE_API_BASE_URL 指向后端地址
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const REQUEST_TIMEOUT = 35000;

const message = ref('');
const chatLog = ref([]);
const isLoading = ref(false);
const chatContainer = ref(null);

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

watch([() => chatLog.value.length, isLoading], scrollToBottom);

const quickQuestions = [
  '推荐几个热门旅游目的地',
  '巴厘岛有什么必体验的项目？',
  '预算5000元可以去哪里旅游？',
  '日本自由行需要准备什么？'
];

// 把不同失败原因翻译成用户能看懂的话
const toErrorMessage = (error) => {
  if (error.code === 'ECONNABORTED') return '请求超时了，请稍后重试。';
  if (!error.response) return '网络连接失败，请检查后端服务是否已启动。';
  if (error.response.status === 429) return '你问得有点快，休息一下再试试。';
  return error.response.data?.error || '抱歉，我现在无法回答，请稍后再试。';
};

const sendMessage = async (text) => {
  if (isLoading.value) return;

  const msg = (text ?? message.value).trim();
  if (!msg) return;

  chatLog.value.push({ role: 'user', content: msg });
  message.value = '';
  isLoading.value = true;

  try {
    const { data } = await axios.post(
      `${API_BASE}/api/ai/chat`,
      {
        // 只提交角色和内容；错误提示气泡不参与上下文，服务端还会做校验与截断
        messages: chatLog.value
          .filter((item) => !item.isError)
          .map(({ role, content }) => ({ role, content }))
      },
      { timeout: REQUEST_TIMEOUT }
    );
    chatLog.value.push({ role: 'assistant', content: data.reply });
  } catch (error) {
    console.error('AI 请求失败:', error);
    chatLog.value.push({ role: 'assistant', content: toErrorMessage(error), isError: true });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="section ai-page">
    <div class="ai-header">
      <div class="ai-header-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
          <path d="M21 14c0 4.97-4.03 9-9 9a9 9 0 0 1-9-9v-3h18v3z"/>
          <path d="M8 14v1a4 4 0 0 0 8 0v-1"/>
        </svg>
      </div>
      <div>
        <h2 class="section-title" style="margin-bottom:2px;padding-left:0;">AI 旅行助手</h2>
        <p style="margin-bottom:0;">智能推荐行程，解答您的旅行疑问</p>
      </div>
    </div>

    <div
      class="chat-container"
      ref="chatContainer"
      role="log"
      aria-live="polite"
      aria-label="对话记录"
    >
      <div v-if="chatLog.length === 0" class="chat-welcome">
        <div class="welcome-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="1.2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </div>
        <h3>你好！有什么可以帮您？</h3>
        <p>我是您的专属旅行助手，可以帮您规划行程、推荐景点、解答疑问</p>
        <div class="quick-questions">
          <button
            v-for="(q, i) in quickQuestions"
            :key="i"
            class="quick-btn"
            @click="sendMessage(q)"
          >{{ q }}</button>
        </div>
      </div>

      <div v-for="(msg, index) in chatLog" :key="index"
        :class="['message', msg.role === 'user' ? 'user-message' : 'bot-message']">
        <div class="message-avatar" v-if="msg.role === 'assistant'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
            <path d="M21 14c0 4.97-4.03 9-9 9a9 9 0 0 1-9-9v-3h18v3z"/>
          </svg>
        </div>
        <div :class="['message-bubble', { 'is-error': msg.isError }]">{{ msg.content }}</div>
        <div class="message-avatar" v-if="msg.role === 'user'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      </div>

      <div v-if="isLoading" class="message bot-message">
        <div class="message-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
          </svg>
        </div>
        <div class="message-bubble typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="message"
        type="text"
        placeholder="输入您的旅行问题..."
        aria-label="旅行问题输入框"
        :disabled="isLoading"
        @keyup.enter="sendMessage()"
        class="chat-input"
      />
      <button
        class="send-btn"
        aria-label="发送"
        @click="sendMessage()"
        :disabled="isLoading || !message.trim()"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ai-page {
  max-width: 800px;
  margin: 0 auto;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.ai-header-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary-light), #d4e4fc);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  flex-shrink: 0;
}

.ai-header .section-title::before {
  display: none;
}

/* ── Chat Container ── */
.chat-container {
  height: 420px;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg);
  border-radius: var(--radius);
  margin-bottom: 16px;
  scroll-behavior: smooth;
}

/* ── Welcome State ── */
.chat-welcome {
  text-align: center;
  padding: 40px 20px;
}

.welcome-icon {
  margin-bottom: 12px;
  opacity: 0.7;
}

.chat-welcome h3 {
  font-size: 1.2rem;
  color: var(--text);
  margin-bottom: 6px;
}

.chat-welcome p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.quick-btn {
  padding: 8px 16px;
  border: 1.5px solid var(--primary);
  background: #fff;
  color: var(--primary);
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}

.quick-btn:hover {
  background: var(--primary);
  color: #fff;
}

/* ── Messages ── */
.message {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 14px;
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.user-message .message-avatar {
  background: var(--primary-light);
  color: var(--primary);
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  line-height: 1.55;
  font-size: 0.92rem;
  word-break: break-word;
}

.bot-message .message-bubble {
  background: #fff;
  color: var(--text);
  border-bottom-left-radius: 6px;
  box-shadow: var(--shadow-sm);
}

.user-message .message-bubble {
  background: var(--primary);
  color: #fff;
  border-bottom-right-radius: 6px;
}

/* 请求失败时的提示气泡 */
.bot-message .message-bubble.is-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.chat-input:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

/* ── Typing Indicator ── */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 18px !important;
}

.typing-indicator span {
  width: 7px;
  height: 7px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
.typing-indicator span:nth-child(3) { animation-delay: 0; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* ── Input Area ── */
.input-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 20px;
  background: #fff;
  border-radius: 30px;
  border: 2px solid var(--border);
  transition: border-color var(--transition);
}

.input-area:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.1);
}

.chat-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: var(--text);
  background: transparent;
  padding: 6px 0;
}

.chat-input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition);
}

.send-btn:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: scale(1.05);
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .chat-container {
    height: 360px;
  }

  .message-bubble {
    max-width: 85%;
  }

  .ai-header {
    flex-direction: column;
    text-align: center;
  }
}
</style>
