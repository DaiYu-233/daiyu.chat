<template>
  <div class="admin-login">
    <el-card class="login-card">
      <div class="login-header">管理员验证</div>
      <div class="login-form">
        <el-input
          v-model="password"
          type="password"
          placeholder="请输入管理员密码"
          :prefix-icon="Lock"
          @keyup.enter="handleLogin"
          :disabled="loading"
        />
        <div class="button-group">
          <el-button 
            type="primary" 
            @click="handleLogin" 
            :loading="loading"
          >
            {{ loading ? '验证中...' : '验证' }}
          </el-button>
          <el-button 
            @click="() => router.push('/')" 
            :disabled="loading"
          >
            返回
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Lock } from '@element-plus/icons-vue';

const router = useRouter();
const password = ref('');
const loading = ref(false);

const handleLogin = async () => {
  if (!password.value) {
    ElMessage.warning('请输入管理员密码');
    return;
  }

  loading.value = true;
  try {
    const response = await fetch('http://localhost:3030/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ password: password.value })
    });

    const data = await response.json();
    
    if (data.success) {
      ElMessage.success('验证成功');
      router.push('/admin/users');
    } else {
      ElMessage.error(data.error || '验证失败');
    }
  } catch (error) {
    console.error('登录请求失败:', error);
    ElMessage.error('验证失败，请重试');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.admin-login {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.login-card {
  width: 360px;
  padding: 0;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.login-header {
  text-align: center;
  padding: 20px 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.login-form {
  padding: 30px;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

.button-group {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.button-group .el-button {
  flex: 1;
  height: 36px;
}

/* 适配移动端 */
@media screen and (max-width: 768px) {
  .login-card {
    width: 90%;
    margin: 0 20px;
  }
}
</style> 