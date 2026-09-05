// Type-checked by test/typecheck.test.ts against the generated `.d.ts` files.
// Lines marked with @ts-expect-error must fail to compile, so a generated type
// that degrades to `any` is caught as an unused directive.
import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
import { GetUser } from './queries.graphql';
import { GetFullUser, RenameUser, UserChanged } from './operations/users.gql';
import { Role } from './schema.graphql';

export const getUserVariables: VariablesOf<typeof GetUser> = { id: '1' };
// @ts-expect-error `id` must be a string
export const wrongGetUserVariables: VariablesOf<typeof GetUser> = { id: 1 };
// @ts-expect-error `name` is required
export const missingRenameUserVariables: VariablesOf<typeof RenameUser> = { id: '1' };

declare const fullUser: ResultOf<typeof GetFullUser>;
export const role: Role | undefined = fullUser.user?.role;
export const postTitles: string[] | undefined = fullUser.user?.posts.map((post) => post.title);
// @ts-expect-error `email` is not part of the selection
export const email = fullUser.user?.email;

declare const changed: ResultOf<typeof UserChanged>;
export const changedName: string | undefined = changed.userChanged?.name;
// @ts-expect-error `role` was not selected in the subscription
export const changedRole = changed.userChanged?.role;
