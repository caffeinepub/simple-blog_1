import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Post {
    id: bigint;
    status: PostStatus;
    title: string;
    content: string;
    ownerId: Principal;
    createdAt: Time;
    author: string;
    images: Array<Image>;
}
export type Image = Uint8Array;
export interface AuthorInfo {
    principal: Principal;
    displayName: string;
}
export interface UserProfile {
    name: string;
}
export enum PostStatus {
    published = "published",
    hidden = "hidden",
    draft = "draft"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / Add an admin (owner only)
     */
    addAdmin(principal: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Create a post (authenticated users only)
     */
    createPost(title: string, content: string, author: string, images: Array<Image>): Promise<bigint>;
    /**
     * / Delete a post (owner of post or admin)
     */
    deletePost(id: bigint): Promise<void>;
    /**
     * / Get all admins (owner only)
     */
    getAdmins(): Promise<Array<Principal>>;
    /**
     * / Get all posts regardless of status (admins only)
     */
    getAllPostsAdmin(): Promise<Array<Post>>;
    /**
     * / Get all published posts (public)
     */
    getAllPublishedPosts(): Promise<Array<Post>>;
    /**
     * / Get all unique authors and their display names (admins only)
     */
    getAuthors(): Promise<Array<AuthorInfo>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Get a single post by ID (public, but only published posts for non-admins)
     */
    getPost(id: bigint): Promise<Post>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    /**
     * / Check if a principal is an admin (any authenticated user can check their own status)
     */
    isAdmin(principal: Principal): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Remove an admin (owner only). The owner cannot be removed.
     */
    removeAdmin(principal: Principal): Promise<void>;
    /**
     * / Remove all posts belonging to an author (admins only)
     */
    removeAuthor(principal: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    /**
     * / Set a new owner (owner only)
     */
    setOwner(newOwner: Principal): Promise<void>;
    /**
     * / Update a post (owner of post or admin)
     */
    updatePost(id: bigint, title: string, content: string, author: string, status: PostStatus, images: Array<Image>): Promise<void>;
}
