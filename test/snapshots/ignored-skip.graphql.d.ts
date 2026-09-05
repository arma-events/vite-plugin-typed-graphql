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
export type SkippedUserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SkippedUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string } | null };


export declare const SkippedUser: DocumentNode<SkippedUserQuery, SkippedUserQueryVariables>;