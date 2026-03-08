import { test, expect } from '@playwright/test';

/**
 * API-level E2E tests for the Notes CRUD endpoint.
 * These send GraphQL requests directly to the backend API.
 * Requires the backend to be running (pnpm --filter api dev).
 *
 * Run with: pnpm test:e2e -- e2e/notes-api.spec.ts
 * Set PLAYWRIGHT_BASE_URL if backend is on a different host.
 */

const CREATE_NOTE = `
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      id
      title
      content
      isPublished
      createdAt
      updatedAt
    }
  }
`;

const GET_NOTES = `
  query {
    notes {
      id
      title
      content
      isPublished
      createdAt
      updatedAt
    }
  }
`;

const GET_NOTE = `
  query GetNote($id: String!) {
    note(id: $id) {
      id
      title
      content
      isPublished
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_NOTE = `
  mutation UpdateNote($id: String!, $input: UpdateNoteInput!) {
    updateNote(id: $id, input: $input) {
      id
      title
      content
      isPublished
      updatedAt
    }
  }
`;

const DELETE_NOTE = `
  mutation DeleteNote($id: String!) {
    deleteNote(id: $id)
  }
`;

async function graphqlRequest(
  baseURL: string,
  query: string,
  variables?: Record<string, unknown>,
) {
  const response = await fetch(`${baseURL}/api/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

test.describe('Notes CRUD API', () => {
  let baseURL: string;
  let createdNoteId: string;

  test.beforeAll(async () => {
    baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

    // Check if the API is reachable
    try {
      const result = await graphqlRequest(baseURL, '{ notes { id } }');
      if (result.errors || !result.data) {
        test.skip(true, 'Backend API is not available — skipping Notes API tests');
      }
    } catch {
      test.skip(true, 'Backend API is not available — skipping Notes API tests');
    }
  });

  test('create note — mutation returns created note with ID and timestamps', async () => {
    const result = await graphqlRequest(baseURL, CREATE_NOTE, {
      input: { title: 'E2E Test Note', content: 'Created by Playwright', isPublished: false },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createNote).toBeDefined();

    const note = result.data!.createNote as Record<string, unknown>;
    expect(note.id).toBeTruthy();
    expect(note.title).toBe('E2E Test Note');
    expect(note.content).toBe('Created by Playwright');
    expect(note.isPublished).toBe(false);
    expect(note.createdAt).toBeTruthy();
    expect(note.updatedAt).toBeTruthy();

    createdNoteId = note.id as string;
  });

  test('list notes — query returns all notes', async () => {
    const result = await graphqlRequest(baseURL, GET_NOTES);

    expect(result.errors).toBeUndefined();
    expect(result.data?.notes).toBeDefined();
    expect(Array.isArray(result.data!.notes)).toBe(true);
    expect((result.data!.notes as unknown[]).length).toBeGreaterThan(0);
  });

  test('get note by ID — query returns specific note', async () => {
    test.skip(!createdNoteId, 'Note creation failed');

    const result = await graphqlRequest(baseURL, GET_NOTE, { id: createdNoteId });

    expect(result.errors).toBeUndefined();
    const note = result.data?.note as Record<string, unknown>;
    expect(note).toBeDefined();
    expect(note.id).toBe(createdNoteId);
    expect(note.title).toBe('E2E Test Note');
  });

  test('update note — partial update changes only specified fields', async () => {
    test.skip(!createdNoteId, 'Note creation failed');

    const result = await graphqlRequest(baseURL, UPDATE_NOTE, {
      id: createdNoteId,
      input: { title: 'Updated E2E Note', isPublished: true },
    });

    expect(result.errors).toBeUndefined();
    const note = result.data?.updateNote as Record<string, unknown>;
    expect(note.title).toBe('Updated E2E Note');
    expect(note.isPublished).toBe(true);
    expect(note.content).toBe('Created by Playwright');
  });

  test('delete note — returns true, subsequent fetch returns null', async () => {
    test.skip(!createdNoteId, 'Note creation failed');

    const deleteResult = await graphqlRequest(baseURL, DELETE_NOTE, { id: createdNoteId });
    expect(deleteResult.errors).toBeUndefined();
    expect(deleteResult.data?.deleteNote).toBe(true);

    const getResult = await graphqlRequest(baseURL, GET_NOTE, { id: createdNoteId });
    expect(getResult.data?.note).toBeNull();
  });
});
