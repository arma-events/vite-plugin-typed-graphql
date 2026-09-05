import { GetUser } from './queries.graphql';
import { GetFullUser, RenameUser, UserChanged } from './operations/users.gql';

// eslint-disable-next-line no-console
console.log(GetUser, GetFullUser, RenameUser, UserChanged);
