<template>
  <el-card class="message-card">
    <div class="card-header">
      <span>聊天记录</span>
    </div>
    <el-table :data="messages" style="width: 100%" v-loading="loading">
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column label="消息内容" min-width="300">
        <template #default="{ row }">
          <div v-html="row.content"></div>
        </template>
      </el-table-column>
      <el-table-column prop="time" label="时间" width="180" />
    </el-table>
  </el-card>
</template>

<style scoped>
.message-card {
  margin: 20px;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.system-user {
  color: #909399;
  font-style: italic;
}

:deep(a) {
  color: #409eff;
  text-decoration: none;
}

:deep(a:hover) {
  text-decoration: underline;
}
</style>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { io } from 'socket.io-client';

const messages = ref([]);
const loading = ref(true);
const socket = ref(null);
const SERVER_URL = 'http://localhost:3030';

// 辅助函数：从完整ID中提取短ID
const getShortId = (fullId) => {
    return fullId.slice(-6).toLowerCase();
};

// 连接 Socket.IO
const connectSocket = () => {
  socket.value = io(SERVER_URL, {
    withCredentials: true,
    auth: { admin: true }
  });

  socket.value.on('connect', () => {
    console.log('管理员socket连接成功');
  });

  // 监听新消息
  socket.value.on('newMessage', (msg) => {
    const formattedMessage = {
      id: msg.id,
      username: msg.type === 'system' ? 'system' : getShortId(msg.userId), // 使用短ID
      content: msg.content,
      time: new Date(msg.timestamp).toLocaleString('zh-CN')
    };
    messages.value.unshift(formattedMessage); // 新消息添加到顶部
  });
};

const fetchMessages = async () => {
  loading.value = true;
  try {
    const response = await fetch(`${SERVER_URL}/admin/messages`, {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      messages.value = data.data || [];
    } else {
      ElMessage.error('获取聊天记录失败');
    }
  } catch (error) {
    console.error('获取聊天记录错误:', error);
    ElMessage.error('获取聊天记录失败');
  } finally {
    loading.value = false;
  }
};

const handleDelete = async (message) => {
  try {
    const response = await fetch(`http://localhost:3030/admin/messages/${message.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (response.ok) {
      ElMessage.success('删除成功');
      fetchMessages(); // 重新获取消息列表
    } else {
      ElMessage.error('删除失败');
    }
  } catch (error) {
    console.error('删除消息错误:', error);
    ElMessage.error('删除失败');
  }
};

onMounted(() => {
  connectSocket();
  fetchMessages();
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});
</script> 