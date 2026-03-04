import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ReactionCount {
    likes: bigint;
    dislikes: bigint;
}
export type Time = bigint;
export type CreatePostResult = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "imageTooLarge";
    imageTooLarge: null;
};
export interface AuthorInfo {
    principal: Principal;
    displayName: string;
}
export interface PublicProfile {
    principal: Principal;
    alias: string;
}
export interface Post {
    id: bigint;
    status: PostStatus;
    title: string;
    content: string;
    ownerId: Principal;
    createdAt: Time;
    likedBy: Array<Principal>;
    author: string;
    dislikedBy: Array<Principal>;
    images: Array<Image>;
}
export type Image = Uint8Array;
export interface UserProfile {
    preferredLanguage: string;
    country: string;
    name: string;
    email: string;
    phone: string;
}
export enum PostStatus {
    published = "published",
    hidden = "hidden",
    draft = "draft"
}
export enum UpdatePostResult {
    ok = "ok",
    postNotFound = "postNotFound",
    imageTooLarge = "imageTooLarge"
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
    createPost(title: string, content: string, author: string, images: Array<Image>): Promise<CreatePostResult>;
    /**
     * / Delete a post (owner of post or admin)
     */
    deletePost(id: bigint): Promise<void>;
    /**
     * / Dislike a post (authenticated users only). Toggles dislike; removes like if present.
     */
    dislikePost(postId: bigint): Promise<void>;
    /**
     * / Follow a user (authenticated users only)
     */
    followUser(target: Principal): Promise<void>;
    /**
     * / Get all admins (owner only)
     */
    getAdmins(): Promise<Array<Principal>>;
    /**
     * / Get all posts regardless of status (admins only)
     */
    getAllPostsAdmin(): Promise<Array<Post>>;
    /**
     * / List all profiles (admins only — profiles contain sensitive PII: email, phone, country)
     */
    getAllProfiles(): Promise<Array<UserProfile>>;
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
     * / Get list of users the caller follows (authenticated users only)
     */
    getFollowedUsers(): Promise<Array<Principal>>;
    /**
     * / Get follower count for a user (public)
     */
    getFollowerCount(target: Principal): Promise<bigint>;
    /**
     * / Get all drafts belonging to the caller (authenticated users only)
     */
    getMyDrafts(): Promise<Array<Post>>;
    /**
     * / Get a single post by ID (public, but only published posts for non-admins)
     */
    getPost(id: bigint): Promise<Post>;
    /**
     * / Get like/dislike counts for a post (public, no auth required)
     */
    getPostReactions(postId: bigint): Promise<ReactionCount>;
    /**
     * / Get the preferred language for the caller (authenticated users only)
     */
    getPreferredLanguage(): Promise<string>;
    /**
     * / Get all users who have a public profile (name only, must not be empty)
     */
    getPublicProfiles(): Promise<Array<PublicProfile>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    /**
     * / Check if a principal is an admin (any authenticated user can check their own status)
     */
    isAdmin(principal: Principal): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Check if user is following another user (authenticated users only)
     */
    isFollowing(target: Principal): Promise<boolean>;
    /**
     * / Like a post (authenticated users only). Toggles like; removes dislike if present.
     */
    likePost(postId: bigint): Promise<void>;
    /**
     * / Called by admin to promote a principal to user role
     */
    promoteUser(user: Principal): Promise<void>;
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
     * / Save a new draft (authenticated users only)
     */
    saveDraft(title: string, content: string, author: string, images: Array<Image>): Promise<bigint>;
    /**
     * / Set a new owner (owner only)
     */
    setOwner(newOwner: Principal): Promise<void>;
    /**
     * / Set the preferred language for the caller (authenticated users only)
     */
    setPreferredLanguage(language: string): Promise<void>;
    /**
     * / Unfollow a user (authenticated users only)
     */
    unfollowUser(target: Principal): Promise<void>;
    /**
     * / Update an existing draft (authenticated users only, owner of draft only)
     */
    updateDraft(id: bigint, title: string, content: string, author: string, images: Array<Image>): Promise<void>;
    /**
     * / Update a post (owner of post or admin)
     */
    updatePost(id: bigint, title: string, content: string, author: string, status: PostStatus, images: Array<Image>): Promise<UpdatePostResult>;
    updateUserProfile(profile: UserProfile): Promise<void>;
}
