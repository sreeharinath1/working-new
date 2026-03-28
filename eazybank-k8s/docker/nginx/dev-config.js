// Local dev config — proxied through cors-proxy on port 8888
window.APP_CONFIG = {
  gatewayPath: '/eazybank',
  keycloakUrl: '/realms/master/protocol/openid-connect/token',
  clientId: 'eazybank-callcenter-cc',
  clientSecret: '',   // proxy handles auth — no secret needed in browser
  tokenRefreshInterval: 50000,
  services: {
    accounts: { port: 8080 },
    loans:    { port: 8090 },
    cards:    { port: 9000 },
    gateway:  { port: 8072 },
    keycloak: { port: 80   }
  }
};
