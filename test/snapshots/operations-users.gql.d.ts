/* eslint-disable */

/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { Role } from '../schema.graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export { Role };

export type GetFullUserQueryVariables = Exact<{
  id: string | number;
}>;


export type GetFullUserQuery = { user: { role: Role, id: string, name: string, posts: Array<{ id: string, title: string }> } | null };

export type FullUserFragment = { role: Role, id: string, name: string, posts: Array<{ id: string, title: string }> };

export type UserFieldsFragment = { id: string, name: string };

export type PostFieldsFragment = { id: string, title: string };

export type RenameUserMutationVariables = Exact<{
  id: string | number;
  name: string;
}>;


export type RenameUserMutation = { renameUser: { role: Role, id: string, name: string, posts: Array<{ id: string, title: string }> } | null };

export type UserChangedSubscriptionVariables = Exact<{
  id: string | number;
}>;


export type UserChangedSubscription = { userChanged: { id: string, name: string } | null };

export declare const UserFields: DocumentNode<UserFieldsFragment, unknown>;
export declare const PostFields: DocumentNode<PostFieldsFragment, unknown>;
export declare const FullUser: DocumentNode<FullUserFragment, unknown>;
export declare const GetFullUser: DocumentNode<GetFullUserQuery, GetFullUserQueryVariables>;
export declare const RenameUser: DocumentNode<RenameUserMutation, RenameUserMutationVariables>;
export declare const UserChanged: DocumentNode<UserChangedSubscription, UserChangedSubscriptionVariables>;