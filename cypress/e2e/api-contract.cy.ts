type SwaggerOperation = Record<string, unknown>;

const expectedOperations: Record<string, string[]> = {
  '/api/auth/login': ['post'],
  '/auth/register': ['post'],
  '/auth/verify-otp': ['post'],
  '/auth/resend-otp': ['post'],
  '/auth/forgot-password': ['post'],
  '/api/auth/me': ['get'],
  '/api/business/storefronts': ['post'],
  '/api/business/storefronts/all': ['get'],
  '/api/business/storefronts/my': ['get'],
  '/api/business/storefronts/{slug}': ['get'],
  '/api/business/storefronts/{id}/data': ['patch'],
  '/api/business/storefronts/{id}/logo': ['patch'],
  '/api/storefronts/{storefrontId}/products': ['get', 'post'],
  '/api/storefronts/{storefrontId}/products/all': ['get'],
  '/api/storefronts/{storefrontId}/products/popular': ['get'],
  '/api/storefronts/{storefrontId}/products/{productId}': ['put', 'delete'],
  '/api/storefronts/{storefrontId}/products/{productId}/view': ['post'],
  '/api/storefronts/{storefrontId}/products/{productId}/toggle-delist': ['patch'],
  '/api/storefronts/{storefrontId}/products/bulk': ['post'],
  '/api/storefronts/{storefrontId}/config': ['get', 'put'],
  '/api/storefronts/{storefrontId}/event-details': ['get', 'put'],
  '/api/storefronts/{storefrontId}/registration-form': ['get', 'put'],
  '/api/storefronts/{storefrontId}/guests': ['get', 'post'],
  '/api/storefronts/{storefrontId}/checkin': ['post'],
  '/api/storefronts/{storefrontId}/orders': ['get', 'post'],
  '/api/orders/{orderId}': ['get'],
  '/api/orders/{orderId}/status': ['patch'],
  '/api/storefronts/{storefrontId}/tables': ['get', 'post'],
  '/api/storefronts/{storefrontId}/tables/{tableId}': ['delete'],
  '/api/storefronts/{storefrontId}/tables/verify': ['get'],
  '/api/storefronts/{storefrontId}/waiter-calls': ['get', 'post'],
  '/api/storefronts/{storefrontId}/waiter-calls/{callId}/read': ['patch'],
  '/api/storefronts/{storefrontId}/waiter-calls/mark-all-read': ['post'],
  '/api/storefronts/{storefrontId}/requests': ['get', 'post'],
  '/api/storefronts/{storefrontId}/tips': ['get', 'post'],
  '/api/storefronts/{storefrontId}/feedbacks': ['get', 'post'],
  '/api/storefronts/{storefrontId}/access-content': ['get', 'post'],
  '/api/storefronts/{storefrontId}/access-content/all': ['get'],
  '/api/event-types': ['get'],
  '/api/event-types/{type}/template': ['get'],
  '/api/payments/initialize': ['post'],
  '/api/payments/verify': ['post'],
};

describe('live API contract', () => {
  it('exposes every route used by the app with the expected methods', () => {
    cy.request('https://api.scancode.ng/v3/api-docs').then(({ body }) => {
      const paths = body.paths as Record<string, Record<string, SwaggerOperation>>;

      Object.entries(expectedOperations).forEach(([path, methods]) => {
        expect(paths, `Swagger path ${path}`).to.have.property(path);
        methods.forEach((method) => {
          expect(paths[path], `${method.toUpperCase()} ${path}`).to.have.property(method);
        });
      });
    });
  });
});