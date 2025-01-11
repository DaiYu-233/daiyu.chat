<template>
  <el-card class="user-card" :body-style="{ padding: '0' }">
    <div class="card-header">
      <span class="header-title">在线用户列表</span>
      <el-button type="primary" @click="fetchUsers">刷新</el-button>
    </div>
    
    <el-table 
      :data="users" 
      style="width: 100%"
      v-loading="loading"
    >
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="id" label="ID" width="280" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button 
            type="danger" 
            size="small"
            @click="handleKickUser(row.id)"
          >
            踢出
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { io } from 'socket.io-client';
import { useRouter } from 'vue-router';

const router = useRouter();
const users = ref([]);
const loading = ref(true);
const socket = ref(null);
const SERVER_URL = 'http://localhost:3030';

const connectSocket = () => {
  if (!socket.value) {
    socket.value = io(SERVER_URL, {
      withCredentials: true,
      auth: { admin: true }
    });

    socket.value.on('connect', () => {
      console.log('管理员socket连接成功');
      fetchUsers();
    });

    socket.value.on('connect_error', (error) => {
      console.error('Socket连接错误:', error);
      if (error.message === 'Unauthorized') {
        router.push('/admin/login');
      }
    });

    socket.value.on('userListUpdate', (updatedUsers) => {
      users.value = updatedUsers;
      loading.value = false;
    });
  }
};

const disconnectSocket = () => {
  if (socket.value) {
    socket.value.disconnect();
    socket.value = null;
  }
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const response = await fetch(`${SERVER_URL}/admin/users`, {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      users.value = Array.isArray(data.data) ? data.data : [];
      console.log('获取到的用户列表:', users.value);
    } else {
      ElMessage.error('获取用户列表失败');
    }
  } catch (error) {
    console.error('获取用户列表错误:', error);
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

const handleKickUser = async (userId) => {
  try {
    const response = await fetch(`${SERVER_URL}/admin/kick-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ userId })
    });

    if (response.ok) {
      ElMessage.success('用户已被移出聊天室');
      fetchUsers();
    } else {
      ElMessage.error('操作失败');
    }
  } catch (error) {
    console.error('踢出用户错误:', error);
    ElMessage.error('操作失败');
  }
};

onMounted(() => {
  connectSocket();
});

onUnmounted(() => {
  disconnectSocket();
});
</script>

<style scoped>
.user-card {
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

/* 适配移动端 */
@media screen and (max-width: 768px) {
  .user-card {
    margin: 10px;
  }
  
  .card-header {
    padding: 12px 16px;
  }
}
</style> 