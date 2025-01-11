<template>
  <div class="chat-room" 
       @drop.prevent="handleDrop"
       @dragover.prevent
       @dragenter.prevent>
    <div class="chat-container">
      <div class="chat-header">
        <h2>在线聊天室</h2>
      </div>
      
      <div class="messages" ref="messagesContainer">
        <div v-for="message in messages" 
             :key="message.timestamp" 
             :class="['message', {
               'own-message': message.isOwn,
               'system-message': message.type === 'system'
             }]"
        >
          <template v-if="message.type === 'system'">
            <div class="system-content">{{ message.content }}</div>
          </template>
          <template v-else>
            <div class="message-wrapper">
              <div class="username">{{ getShortId(message.userId) }}</div>
              <div class="message-content" v-html="message.content"></div>
            </div>
          </template>
        </div>
      </div>
      
      <div class="input-area">
        <el-upload
          class="upload-button"
          action="http://localhost:3030/upload"
          :show-file-list="false"
          :before-upload="handleFileUpload"
        >
          <el-button type="primary" :icon="Plus">文件</el-button>
        </el-upload>
        <el-input 
          v-model="inputMessage" 
          placeholder="输入消息..." 
          @keyup.enter="sendMessage"
          class="message-input"
        >
          <template #append>
            <el-button type="primary" @click="sendMessage">发送</el-button>
          </template>
        </el-input>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

const socket = ref(null);
const messages = ref([]);
const inputMessage = ref('');
const messagesContainer = ref(null);

// 辅助函数：从完整ID中提取短ID
const getShortId = (fullId) => {
    return fullId?.slice(-6).toLowerCase() || '';
};

const connectSocket = () => {
    socket.value = io('http://localhost:3030');
    
    socket.value.on('connect', () => {
        socket.value.emit('join', socket.value.id);
    });

    socket.value.on('newMessage', (message) => {
        message.isOwn = getShortId(message.userId) === getShortId(socket.value.id);
        messages.value.push(message);
        scrollToBottom();
    });

    socket.value.on('kicked', () => {
        ElMessageBox.alert('您已被管理员移出聊天室', '系统提示', {
            confirmButtonText: '确定',
            type: 'error',
            callback: () => {
                socket.value.disconnect();
                messages.value = [];
                inputMessage.value = '';
            }
        });
    });
};

const sendMessage = () => {
    if (!inputMessage.value.trim()) return;
    
    const message = {
        userId: socket.value.id,
        content: inputMessage.value,
        timestamp: Date.now(),
        type: 'user'
    };
    
    socket.value.emit('message', message);
    inputMessage.value = '';
};

const scrollToBottom = () => {
    if (messagesContainer.value) {
        setTimeout(() => {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }, 0);
    }
};

const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('http://localhost:3030/upload', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      socket.value.emit('message', {
        userId: socket.value.id,
        content: `<a href="${data.path}" target="_blank">[文件] ${file.name}</a>`,
        timestamp: Date.now()
      });
      ElMessage.success('文件上传成功');
    } else {
      ElMessage.error('文件上传失败');
    }
  } catch (error) {
    console.error('文件上传错误:', error);
    ElMessage.error('文件上传失败');
  }
  
  return false;
};

// 添加拖拽处理函数
const handleDrop = (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];  // 只处理第一个文件
    handleFileUpload(file);
  }
};

onMounted(() => {
    connectSocket();
});

onUnmounted(() => {
    if (socket.value) {
        socket.value.disconnect();
    }
});
</script>

<style scoped>
.chat-room {
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background-color: #f0f2f5;
}

/* 添加拖拽提示样式 */
.chat-room[data-dragging="true"] {
  background-color: #e6f1fc;
}

.chat-container {
  height: calc(100vh - 40px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.chat-header h2 {
  margin: 0;
  color: #303133;
  font-size: 18px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f6f6f6;
}

.message {
  margin-bottom: 12px;
}

.message-wrapper {
  display: inline-block;
  max-width: 70%;
}

.username {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
  padding-left: 4px;
}

.message-content {
  padding: 8px 12px;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  word-break: break-word;
}

.own-message {
  text-align: right;
}

.own-message .message-wrapper {
  text-align: right;
}

.own-message .message-content {
  background-color: #95ec69;
}

.system-content {
  display: inline-block;
  padding: 4px 12px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  font-size: 12px;
  color: #666;
  margin: 8px auto;
  text-align: center;
}

.system-message {
  text-align: center;
}

.time {
  display: none;
}

.input-area {
  padding: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  gap: 10px;
}

.message-input {
  flex: 1;
}

.upload-button {
  margin-right: 10px;
}

/* 适配移动端 */
@media screen and (max-width: 768px) {
  .chat-room {
    padding: 10px;
  }
  
  .chat-container {
    height: calc(100vh - 20px);
  }
  
  .message-content {
    max-width: 85%;
  }
}

.file-message {
  display: inline-block;
}

.file-link {
  color: #2d5af1;
  text-decoration: none;
}

.file-link:hover {
  text-decoration: underline;
}

.own-message .file-link {
  color: #2d5af1;
}

:deep(a) {
  color: #409EFF;
  text-decoration: none;
}

:deep(a:hover) {
  text-decoration: underline;
}

:deep(a:visited) {
  color: #409EFF;
}

.own-message :deep(a) {
  color: #409EFF;
}

.own-message :deep(a:visited) {
  color: #409EFF;
}
</style> 