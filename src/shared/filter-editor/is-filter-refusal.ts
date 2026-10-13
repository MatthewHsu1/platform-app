import { FilterError } from 'src/shared/filter-editor/to-twenty-filter';
import { GraphqlInputError } from 'src/shared/twenty-graphql';

// Whether an error says the filter itself cannot run: it cannot be turned into
// a search, or Twenty refuses the search it makes. Any other error (an outage,
// the rate limit, a bug) says nothing about the filter.
export const isFilterRefusal = (error: unknown) => error instanceof FilterError || error instanceof GraphqlInputError;
