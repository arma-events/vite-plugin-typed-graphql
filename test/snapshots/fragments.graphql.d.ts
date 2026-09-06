/* eslint-disable */

/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type UserFieldsFragment = { id: string, name: string };

export declare const UserFields: DocumentNode<UserFieldsFragment, unknown>;