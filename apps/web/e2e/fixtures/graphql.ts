import { Page, Route } from '@playwright/test';

type GraphQLHandler = {
  operationName?: string;
  query?: string;
  response: Record<string, unknown>;
};

/**
 * Intercept GraphQL requests and return mock responses based on operation name or query content.
 * Multiple handlers can be registered; they are matched in order.
 */
export async function mockGraphQL(page: Page, handlers: GraphQLHandler[]) {
  await page.route('**/api/graphql', async (route: Route) => {
    const request = route.request();

    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    let body: { query?: string; operationName?: string };
    try {
      body = JSON.parse(request.postData() || '{}');
    } catch {
      await route.continue();
      return;
    }

    for (const handler of handlers) {
      // Match by operation name
      if (handler.operationName && body.operationName === handler.operationName) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(handler.response),
        });
        return;
      }

      // Match by query content substring
      if (handler.query && body.query?.includes(handler.query)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(handler.response),
        });
        return;
      }
    }

    // No handler matched — let it through
    await route.continue();
  });
}

/**
 * Intercept GraphQL requests and collect them for assertion.
 * Returns an array that accumulates captured requests.
 */
export async function captureGraphQL(page: Page): Promise<CapturedRequest[]> {
  const captured: CapturedRequest[] = [];

  await page.route('**/api/graphql', async (route: Route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      try {
        const body = JSON.parse(request.postData() || '{}');
        captured.push({
          query: body.query,
          variables: body.variables,
          operationName: body.operationName,
        });
      } catch {
        // ignore
      }
    }
    await route.continue();
  });

  return captured;
}

export type CapturedRequest = {
  query?: string;
  variables?: Record<string, unknown>;
  operationName?: string;
};

/**
 * Send a GraphQL request directly to the API (for API-level tests).
 */
export async function graphqlRequest(
  baseURL: string,
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseURL}/api/graphql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  return response.json();
}
