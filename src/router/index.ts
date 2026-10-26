import { createRouter, createWebHistory } from 'vue-router'
import { config } from '@/config'
import ProjectsPage from '@/pages/ProjectsPage.vue'

/** One page – the list; filter and search live in the query, so a filtered view can be linked. */
const router = createRouter({
  history: createWebHistory(config.basePath),
  routes: [
    { path: '/', name: 'projects', component: ProjectsPage },
    { path: '/:pathMatch(.*)*', redirect: { name: 'projects' } },
  ],
})

export default router
