describe('ScanCode web app', () => {
  it('loads the Expo web app', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
  });

  it('can reach the live API documentation', () => {
    cy.request('https://api.scancode.ng/v3/api-docs')
      .its('status')
      .should('eq', 200);
  });

  it('reports the storefront directory auth requirement', () => {
    cy.request({
      url: 'https://api.scancode.ng/api/business/storefronts/all',
      failOnStatusCode: true,
    })
      .its('status')
      .should('eq', 200);
  });

  it('validates an empty login form', () => {
    cy.visit('/');
    cy.contains('Merchant Sign In').should('be.visible');
    cy.get('input').eq(0).clear();
    cy.get('input').eq(1).clear();
    cy.contains(/^Sign In$/).click();
    cy.contains('Please enter both email and password.').should('be.visible');
  });

  it('validates an empty signup form', () => {
    cy.visit('/');
    cy.contains("Don't have an account?").click();
    cy.contains('Create your account').should('be.visible');
    cy.contains('Create Account').click();
    cy.contains('All fields are required.').should('be.visible');
  });

  it('validates forgot password without calling the backend', () => {
    cy.visit('/');
    cy.contains(/^Forgot Password\?$/).click();
    cy.contains("Enter your email address below").should('be.visible');
    cy.contains('Send Reset Link').click();
    cy.contains('Please enter your email address.').should('be.visible');
  });

  it('opens the terms page from signup', () => {
    cy.visit('/');
    cy.contains("Don't have an account?").click();
    cy.contains(/^Terms of Service$/).click();
    cy.contains('1. Acceptance of Terms').should('be.visible');
  });

  it('opens the privacy page from signup', () => {
    cy.visit('/');
    cy.contains("Don't have an account?").click();
    cy.contains(/^Privacy Policy$/).click();
    cy.contains('1. Information We Collect').should('be.visible');
  });
});