import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ASSIGNMENT_MESSAGES } from 'src/crm/assignment/assignment-messages.constant';
import { ASSIGNMENT_ROUTE_TEXTS } from 'src/crm/assignment/assign-team-leads.front-component';
import { ASSIGNMENT_ROUTE_MESSAGES } from 'src/crm/assignment/assignment-route-messages.constant';
import {
  ASSIGNMENT_ANSWER_TEXTS,
  ASSIGNMENT_RUN_TEXTS,
  FILTER_ERROR_TEXTS,
  PLUG_FAILURE_TEXTS,
} from 'src/crm/assignment/front/team-assignment-filter.front-component';
import { ASSIGNMENT_ANSWER_MESSAGES } from 'src/crm/assignment/plug/assignment-answer-messages.constant';
import { FILTER_ERROR_MESSAGES } from 'src/shared/filter-editor/filter-error-messages.constant';
import { PLUG_FAILURE_MESSAGES } from 'src/shared/plug/plug-failure-messages.constant';

// The catalog filter errors are translated with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('assignment filter texts', () => {
  it('lists every filter error for the extractor, and the catalog holds each', () => {
    const messages = Object.values(FILTER_ERROR_MESSAGES);

    expect(FILTER_ERROR_TEXTS.map((descriptor) => descriptor.message)).toEqual(messages);
    expect(messages.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every text of the assignment run for the extractor, and the catalog holds each', () => {
    const messages = Object.values(ASSIGNMENT_MESSAGES);

    expect(ASSIGNMENT_RUN_TEXTS.map((descriptor) => descriptor.message)).toEqual(messages);
    expect(messages.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it.each([
    ['the assignment routes', ASSIGNMENT_ROUTE_TEXTS, ASSIGNMENT_ROUTE_MESSAGES],
    ['a failed plug call', PLUG_FAILURE_TEXTS, PLUG_FAILURE_MESSAGES],
    ["a refused plug answer", ASSIGNMENT_ANSWER_TEXTS, ASSIGNMENT_ANSWER_MESSAGES],
  ])('lists every text of %s for the extractor, and the catalog holds each', (_name, texts, constants) => {
    const messages: string[] = Object.values(constants);

    expect(texts.map((descriptor) => descriptor.message)).toEqual(messages);
    expect(messages.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
