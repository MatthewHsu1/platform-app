import { describe, it } from 'vitest';

// A rule the service records follow elsewhere that Twenty cannot hold yet; it waits for an owner answer.
describe('service locations', () => {
  it.todo('makes a new root location without an owner its own owner');
});

// A stage rule lists fields an order needs before it moves into a stage. Locations, equipment and workers have
// no stage in this app. A validation rule cannot read a list of link rows, so those two lists are checked after
// the save and the move is put back.
describe('stage rules', () => {
  it.todo('refuses a location, equipment or worker moving into a stage while a listed field is empty');
  it.todo('refuses, in the save itself, a move into a stage while the equipment or worker list is empty');
});
