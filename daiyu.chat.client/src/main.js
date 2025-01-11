import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import ChatRoom from './views/ChatRoom.vue'
import AdminLayout from './views/AdminLayout.vue'
import AdminLogin from './views/AdminLogin.vue'
import AdminUsers from './views/AdminUsers.vue'
import AdminMessages from './views/AdminMessages.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: ChatRoom,
            name: 'chat'
        },
        {
            path: '/admin/login',
            component: AdminLogin,
            name: 'adminLogin'
        },
        {
            path: '/admin',
            component: AdminLayout,
            children: [
                {
                    path: 'users',
                    name: 'adminUsers',
                    component: AdminUsers
                },
                {
                    path: 'messages',
                    name: 'adminMessages',
                    component: AdminMessages
                }
            ],
            beforeEnter: async (to, from, next) => {
                try {
                    const response = await fetch('http://localhost:3030/admin/check', {
                        credentials: 'include'
                    });

                    if (response.ok) {
                        next();
                    } else {
                        next('/admin/login');
                    }
                } catch (error) {
                    console.error('认证检查失败:', error);
                    next('/admin/login');
                }
            }
        }
    ]
})

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
app.mount('#app')

// 导出 router 供其他组件使用
export { router } 