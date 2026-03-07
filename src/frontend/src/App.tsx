import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { LanguageProvider } from "./contexts/LanguageContext";
import AdminPage from "./pages/AdminPage";
import CreatePostPage from "./pages/CreatePostPage";
import DraftPreviewPage from "./pages/DraftPreviewPage";
import EditDraftPage from "./pages/EditDraftPage";
import EditPostPage from "./pages/EditPostPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import GroupsPage from "./pages/GroupsPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MyDraftsPage from "./pages/MyDraftsPage";
import PostDetailPage from "./pages/PostDetailPage";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";

// Root route that handles both protected and public routes
const rootRoute = createRootRoute({
  component: () => (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  ),
});

// Public login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

// Homepage is now public — unauthenticated users can view posts
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <Layout>
      <HomePage />
    </Layout>
  ),
});

// Post detail is publicly accessible (shows preview/teaser to unauthenticated users)
const postDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/post/$id",
  component: () => (
    <Layout>
      <PostDetailPage />
    </Layout>
  ),
});

const editPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/post/$id/edit",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <EditPostPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const createPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <CreatePostPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <AdminPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const draftsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/drafts",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <MyDraftsPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const editDraftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/draft/$id/edit",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <EditDraftPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const draftPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/draft/$id/preview",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <DraftPreviewPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <ProfilePage />
      </Layout>
    </ProtectedRoute>
  ),
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <UsersPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const groupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <GroupsPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const groupDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups/$id",
  component: () => (
    <ProtectedRoute>
      <Layout>
        <GroupDetailPage />
      </Layout>
    </ProtectedRoute>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  postDetailRoute,
  editPostRoute,
  createPostRoute,
  adminRoute,
  draftsRoute,
  editDraftRoute,
  draftPreviewRoute,
  profileRoute,
  usersRoute,
  groupsRoute,
  groupDetailRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
