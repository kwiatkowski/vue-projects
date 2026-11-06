import { createRouter, createWebHistory } from 'vue-router'
import { config } from '@/config'
import HostsPage from '@/pages/HostsPage.vue'
import ProjectsPage from '@/pages/ProjectsPage.vue'

/**
 * The list, optionally of one category (/meden) – filter and search live in the query, so a filtered view can be
 * linked; /konta – the hosting accounts (the owner's only).
 */
const router = createRouter({
  history: createWebHistory(config.basePath),
  routes: [
    { path: '/konta', name: 'hosts', component: HostsPage, beforeEnter: () => config.canManage || { name: 'projects', params: {} } },
    { path: '/:category?', name: 'projects', component: ProjectsPage },
    { path: '/:pathMatch(.*)*', redirect: { name: 'projects', params: {} } },
  ],
})

export default router
