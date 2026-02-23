import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Post {
    id: bigint;
    title: string;
    content: string;
    published: boolean;
    createdAt: Time;
    author: string;
}
export type Time = bigint;
export interface backendInterface {
    createPost(title: string, content: string, author: string): Promise<bigint>;
    deletePost(id: bigint): Promise<void>;
    getAllPublishedPosts(): Promise<Array<Post>>;
    getPost(id: bigint): Promise<Post>;
    updatePost(id: bigint, title: string, content: string, author: string, published: boolean): Promise<void>;
}
