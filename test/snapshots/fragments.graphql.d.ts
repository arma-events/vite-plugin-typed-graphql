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
} from './schema.graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type UserFieldsFragment = { __typename?: 'User', id: string, name: string };

export declare const UserFields: DocumentNode<UserFieldsFragment, unknown>;