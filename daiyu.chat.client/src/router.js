import { createRouter, createWebHistory } from 'vue-router';
import ChatRoom from './views/ChatRoom.vue';
import AdminLayout from './views/AdminLayout.vue';
import AdminLogin from './views/AdminLogin.vue';
import AdminUsers from './views/AdminUsers.vue';
import AdminMessages from './views/AdminMessages.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: ChatRoom
        },
        {
            path: '/admin/login',
            component: AdminLogin
        },
        {
            path: '/admin',
            component: AdminLayout,
            children: [
                {
                    path: 'users',
                    component: AdminUsers
                },
                {
                    path: 'messages',
                    component: AdminMessages
                },
                {
                    path: '',
                    redirect: '/admin/users'
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
                    next('/admin/login');
                }
            }
        }
    ]
});

export default router; 