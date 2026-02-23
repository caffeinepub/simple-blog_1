import { createRouter, RouterProvider, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import CreatePostPage from './pages/CreatePostPage';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Root route that handles both protected and public routes
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Public login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// Protected routes wrapped in ProtectedRoute and Layout
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <ProtectedRoute>
      <Layout>
        <HomePage />
      </Layout>
    </ProtectedRoute>
  ),
});

const postDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/post/$id',
  component: () => (
    <ProtectedRoute>
      <Layout>
        <PostDetailPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const createPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: () => (
    <ProtectedRoute>
      <Layout>
        <CreatePostPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  postDetailRoute,
  createPostRoute,
]);

const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
