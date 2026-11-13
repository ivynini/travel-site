<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ChatError, isAbortError, streamChat } from '@/api/chat';
import type { ChatMessage } from '@/types';

/** 对话气泡：在消息本体之外，还带两个只用于渲染的标记 */
interface ChatEntry extends ChatMessage {
  isError?: boolean;
  streaming?: boolean;
}

const message = ref('');
const chatLog = ref<ChatEntry[]>([]);
const isStreaming = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

// 用户往上翻看历史时，不要把他拽回底部
const stickToBottom = ref(true);

const route = useRoute();
let abortController: AbortController | null = null;

// 从目的地详情页「让 AI 规划这条线路」跳过来时，把行程需求预填进输入框
// 只预填、不自动发送：避免用户还没确认就消耗一次模型调用
onMounted(() => {
  const prompt = String(route.query.prompt ?? '').trim();
  if (!prompt) return;
  message.value = prompt;
  inputRef.value?.focus();
});

// 离开页面时掐断流，避免后台还在收数据
onBeforeUnmount(() => abortController?.abort());

const quickQuestions = [
  '推荐几个热门旅游目的地',
  '巴厘岛有什么必体验的项目？',
  '预算5000元可以去哪里旅游？',
  '日本自由行需要准备什么？'
];

const handleScroll = () => {
  const el = chatContainer.value;
  if (!el) return;
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
};

const scrollToBottom = async () => {
  if (!stickToBottom.value) return;
  await nextTick();
  const el = chatContainer.value;
  if (el) el.scrollTop = el.scrollHeight;
};

// 监听条数变化 + 最后一条内容的变化：流式输出时长度不变、内容是持续增长的
watch(
  [() => chatLog.value.length, () => chatLog.value[chatLog.value.length - 1]?.content],
  scrollToBottom
);

// 把不同失败原因翻译成用户能看懂的话
const toErrorMessage = (error: unknown): string => {
  if (isAbortError(error)) return '已停止生成。';
  if (error instanceof ChatError) {
    if (error.status === 429) return '你问得有点快，休息一下再试试。';
    return error.message || '服务暂时不可用，请稍后再试。';
  }
  return '连不上后端服务，请先在另一个终端运行 npm run server。';
};

const sendMessage = async (text?: string) => {
  if (isStreaming.value) return;

  const content = (text ?? message.value).trim();
  if (!content) return;

  // 先取快照：错误提示气泡与占位气泡都不参与上下文
  const history = chatLog.value
    .filter((item) => !item.isError && !item.streaming)
    .map(({ role, content: value }) => ({ role, content: value }));

  chatLog.value.push({ role: 'user', content });
  chatLog.value.push({ role: 'assistant', content: '', streaming: true });

  // 拿到数组里的响应式代理对象，后续累加文本会触发更新
  const current = chatLog.value[chatLog.value.length - 1];

  message.value = '';
  isStreaming.value = true;
  stickToBottom.value = true;
  abortController = new AbortController();

  try {
    await streamChat({
      messages: [...history, { role: 'user', content }],
      signal: abortController.signal,
      onDelta: (delta) => {
        current.content += delta;
      }
    });
  } catch (error) {
    console.error('AI 请求失败:', error);
    if (isAbortError(error)) {
      if (!current.content) current.content = '已停止生成。';
    } else if (current.content) {
      // 已经吐出一部分内容：保留它，只追加中断提示，别把用户看到的东西抹掉
      current.content += '\n\n（生成中断，请重试）';
    } else {
      current.isError = true;
      current.content = toErrorMessage(error);
    }
  } finally {
    current.streaming = false;
    isStreaming.value = false;
    abortController = null;
  }
};

const stop = () => abortController?.abort();
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
      @scroll.passive="handleScroll"
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
        <div :class="['message-bubble', { 'is-error': msg.isError }]">
          <span v-if="msg.streaming && !msg.content" class="typing-indicator" role="status" aria-label="正在生成">
            <span></span><span></span><span></span>
          </span>
          <template v-else><span class="message-text">{{ msg.content }}</span><span v-if="msg.streaming" class="caret" aria-hidden="true"></span></template>
        </div>
        <div class="message-avatar" v-if="msg.role === 'user'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="input-area">
      <input
        ref="inputRef"
        v-model="message"
        type="text"
        placeholder="输入您的旅行问题..."
        aria-label="旅行问题输入框"
        :disabled="isStreaming"
        @keyup.enter="sendMessage()"
        class="chat-input"
      />
      <button
        v-if="isStreaming"
        class="send-btn stop-btn"
        aria-label="停止生成"
        @click="stop"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
      <button
        v-else
        class="send-btn"
        aria-label="发送"
        @click="sendMessage()"
        :disabled="!message.trim()"
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

/* 模型回复里带换行，必须保留，否则会挤成一段 */
.message-text {
  white-space: pre-wrap;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 1em;
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

/* ── 生成中 ── */
.stop-btn {
  background: #ef4444;
}

.stop-btn:hover {
  background: #dc2626;
  transform: scale(1.05);
}

/* 流式输出时的光标 */
.caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -0.15em;
  background: var(--primary);
  animation: caretBlink 1s steps(2, start) infinite;
}

@keyframes caretBlink {
  to {
    visibility: hidden;
  }
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
