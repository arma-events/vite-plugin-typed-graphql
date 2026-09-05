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


export const SkippedUser = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SkippedUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SkippedUserQuery, SkippedUserQueryVariables>;