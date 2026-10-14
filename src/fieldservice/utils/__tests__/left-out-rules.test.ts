import { describe, it } from 'vitest';

// A rule the service records follow elsewhere that Twenty cannot hold yet; it waits for an owner answer.
describe('service locations', () => {
  it.todo('makes a new root location without an owner its own owner');
});

// A stage rule lists fields an order needs before it moves into a stage. Locations, equipment and workers have
// no stage in this app, and Twenty saves a new row before its fields are typed, so a new order is not checked.
describe('stage rules', () => {
  it.todo('refuses a location, equipment or worker moving into a stage while a listed field is empty');
  it.todo('refuses a new order made straight into a stage while a listed field is empty');
  it.todo('lets staff list a field they added themselves, and the equipment and worker links of an order');
});
