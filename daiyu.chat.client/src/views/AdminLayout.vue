<template>
  <div class="admin-layout">
    <el-container>
      <el-header height="50px">
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          class="admin-menu"
          @select="handleSelect"
        >
          <el-menu-item index="users">
            <el-icon><User /></el-icon>
            <span>用户列表</span>
          </el-menu-item>
          <el-menu-item index="messages">
            <el-icon><ChatDotRound /></el-icon>
            <span>聊天记录</span>
          </el-menu-item>
        </el-menu>
      </el-header>
      <el-main>
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { User, ChatDotRound } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();

const activeMenu = computed(() => route.path.split('/').pop());

const handleSelect = (key) => {
  router.push(`/admin/${key}`);
};
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.el-container {
  height: 100%;
}

.el-header {
  padding: 0;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
}

.admin-menu {
  height: 100%;
}

.el-main {
  padding: 0;
  background-color: #f0f2f5;
}
</style> 