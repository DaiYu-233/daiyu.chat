<template>
  <div class="admin-panel">
    <el-container>
      <el-header>
        <h2>管理员面板</h2>
      </el-header>
      <el-main>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>在线用户</span>
                  <el-button type="primary" @click="refreshData">刷新</el-button>
                </div>
              </template>
              <el-table :data="users" style="width: 100%" v-loading="loading.users">
                <el-table-column prop="username" label="用户名" />
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button type="danger" size="small" @click="kickUser(scope.row.id)">
                      踢出
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="pagination">
                <el-pagination
                  v-model:current-page="usersPagination.page"
                  v-model:page-size="usersPagination.pageSize"
                  :total="usersPagination.total"
                  :page-sizes="[10, 20, 30, 50]"
                  layout="total, sizes, prev, pager, next"
                  @size-change="handleUsersSizeChange"
                  @current-change="handleUsersCurrentChange"
                />
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>聊天记录</span>
                </div>
              </template>
              <div class="chat-history" v-loading="loading.history">
                <div v-for="msg in chatHistory" :key="msg.timestamp" class="history-item">
                  <div class="time">{{ formatTime(msg.timestamp) }}</div>
                  <div class="content">
                    <template v-if="msg.type === 'system'">
                      <span class="system">{{ msg.content }}</span>
                    </template>
                    <template v-else>
                      <span class="username">{{ msg.username }}:</span>
                      {{ msg.content }}
                    </template>
                  </div>
                </div>
              </div>
              <div class="pagination">
                <el-pagination
                  v-model:current-page="historyPagination.page"
                  v-model:page-size="historyPagination.pageSize"
                  :total="historyPagination.total"
                  :page-sizes="[20, 50, 100]"
                  layout="total, sizes, prev, pager, next"
                  @size-change="handleHistorySizeChange"
                  @current-change="handleHistoryCurrentChange"
                />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const SERVER_URL = 'http://localhost:3030';
const users = ref([]);
const chatHistory = ref([]);
const loading = ref({
  users: false,
  history: false
});

const usersPagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
});

const historyPagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
});

const fetchUsers = async () => {
  loading.value.users = true;
  try {
    const { data } = await axios.get(`${SERVER_URL}/admin/users`, {
      params: {
        page: usersPagination.value.page,
        pageSize: usersPagination.value.pageSize
      }
    });
    users.value = data.data;
    usersPagination.value.total = data.total;
  } catch (error) {
    console.error('获取用户数据失败:', error);
    ElMessage.error('获取用户数据失败');
  } finally {
    loading.value.users = false;
  }
};

const fetchHistory = async () => {
  loading.value.history = true;
  try {
    const { data } = await axios.get(`${SERVER_URL}/admin/chat-history`, {
      params: {
        page: historyPagination.value.page,
        pageSize: historyPagination.value.pageSize
      }
    });
    chatHistory.value = data.data;
    historyPagination.value.total = data.total;
  } catch (error) {
    console.error('获取聊天记录失败:', error);
    ElMessage.error('获取聊天记录失败');
  } finally {
    loading.value.history = false;
  }
};

const handleUsersSizeChange = (val) => {
  usersPagination.value.pageSize = val;
  fetchUsers();
};

const handleUsersCurrentChange = (val) => {
  usersPagination.value.page = val;
  fetchUsers();
};

const handleHistorySizeChange = (val) => {
  historyPagination.value.pageSize = val;
  fetchHistory();
};

const handleHistoryCurrentChange = (val) => {
  historyPagination.value.page = val;
  fetchHistory();
};

const kickUser = async (userId) => {
  try {
    const { data } = await axios.post(`${SERVER_URL}/admin/kick-user`, { userId });
    if (data.success) {
      ElMessage.success('用户已被踢出');
      fetchUsers();
    } else {
      ElMessage.warning('用户可能已离线');
    }
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const refreshData = () => {
  fetchUsers();
  fetchHistory();
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

let refreshInterval;

onMounted(() => {
  refreshData();
  refreshInterval = setInterval(refreshData, 30000); // 每30秒自动刷新
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.admin-panel {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-history {
  max-height: 500px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.history-item {
  margin-bottom: 10px;
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.time {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.username {
  font-weight: bold;
  margin-right: 8px;
}

.system {
  color: #666;
  font-style: italic;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

:deep(.el-card__header) {
  padding: 15px 20px;
}

:deep(.el-table) {
  margin-bottom: 20px;
}
</style> 