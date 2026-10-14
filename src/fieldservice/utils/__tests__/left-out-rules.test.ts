import { describe, it } from 'vitest';

// Rules the service records follow elsewhere that Twenty cannot hold yet; each waits for an owner answer.
describe('service locations', () => {
  it.todo('makes a new root location without an owner its own owner');
});

describe('unique names', () => {
  it.todo('refuses a second field service team with the same name');
  it.todo('refuses a second equipment with the same name');
});

describe('required order fields', () => {
  it.todo('refuses saving a service order without a location');
});
