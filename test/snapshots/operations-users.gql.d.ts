/* eslint-disable */

import {
  Maybe,
  InputMaybe,
  Exact,
  MakeOptional,
  MakeMaybe,
  MakeEmpty,
  Incremental,
  Scalars,
  Role,
  Post,
  User,
  Query,
  QueryUserArgs,
  Mutation,
  MutationRenameUserArgs,
  Subscription,
  SubscriptionUserChangedArgs
} from '../schema.graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type GetFullUserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetFullUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', role: Role, id: string, name: string, posts: Array<{ __typename?: 'Post', id: string, title: string }> } | null };

export type FullUserFragment = { __typename?: 'User', role: Role, id: string, name: string, posts: Array<{ __typename?: 'Post', id: string, title: string }> };

export type UserFieldsFragment = { __typename?: 'User', id: string, name: string };

export type PostFieldsFragment = { __typename?: 'Post', id: string, title: string };

export type RenameUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type RenameUserMutation = { __typename?: 'Mutation', renameUser?: { __typename?: 'User', role: Role, id: string, name: string, posts: Array<{ __typename?: 'Post', id: string, title: string }> } | null };

export type UserChangedSubscriptionVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserChangedSubscription = { __typename?: 'Subscription', userChanged?: { __typename?: 'User', id: string, name: string } | null };

export declare const UserFields: DocumentNode<UserFieldsFragment, unknown>;
export declare const PostFields: DocumentNode<PostFieldsFragment, unknown>;
export declare const FullUser: DocumentNode<FullUserFragment, unknown>;
export declare const GetFullUser: DocumentNode<GetFullUserQuery, GetFullUserQueryVariables>;
export declare const RenameUser: DocumentNode<RenameUserMutation, RenameUserMutationVariables>;
export declare const UserChanged: DocumentNode<UserChangedSubscription, UserChangedSubscriptionVariables>;