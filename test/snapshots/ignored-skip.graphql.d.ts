/* eslint-disable */

/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type SkippedUserQueryVariables = Exact<{
  id: string | number;
}>;


export type SkippedUserQuery = { user: { id: string } | null };


export declare const SkippedUser: DocumentNode<SkippedUserQuery, SkippedUserQueryVariables>;