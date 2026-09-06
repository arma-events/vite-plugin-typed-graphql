export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: unknown; output: unknown; }
};

export enum Role {
  Admin = 'ADMIN',
  User = 'USER'
}

export type Post = {
  __typename?: 'Post';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  role: Role;
  createdAt: Scalars['DateTime']['output'];
  posts: Array<Post>;
};

export type Query = {
  __typename?: 'Query';
  user?: Maybe<User>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  renameUser?: Maybe<User>;
};


export type MutationRenameUserArgs = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  userChanged?: Maybe<User>;
};


export type SubscriptionUserChangedArgs = {
  id: Scalars['ID']['input'];
};
