import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { githubAuthenticator } from '@backstage/plugin-auth-backend-module-github-provider';
import {
  authProvidersExtensionPoint,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import fetch from 'node-fetch';

export default createBackendModule({
  // This ID must be exactly "auth" because that's the plugin it targets
  pluginId: 'auth',
  // This ID must be unique, but can be anything
  moduleId: 'custom-auth-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
        auth: coreServices.auth,
        discovery: coreServices.discovery,
        logger: coreServices.logger,
      },
      async init({ providers, auth, discovery, logger }) {
        providers.registerProvider({
          // This ID must match the actual provider config, e.g. addressing
          // auth.providers.github means that this must be "github".
          providerId: 'github',
          // Use createProxyAuthProviderFactory instead if it's one of the proxy
          // based providers rather than an OAuth based one
          factory: createOAuthProviderFactory({
            authenticator: githubAuthenticator,
            async signInResolver({ result: { fullProfile } }, ctx) {
              const name = fullProfile.id;

              const { token } = await auth.getPluginRequestToken({
                onBehalfOf: await auth.getOwnServiceCredentials(),
                targetPluginId: 'catalog',
              });

              const baseCatalogApiUrl = await discovery.getBaseUrl('catalog');
              const routerEntityProviderUrl = `${baseCatalogApiUrl}/router`;

              const response = await fetch(routerEntityProviderUrl, {
                headers: {
                  Accept: 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const message = await response.json();
                logger.info(
                  `Response from router entity provider was: ${JSON.stringify(
                    message,
                  )}`,
                );
              }

              return ctx.signInWithCatalogUser({
                entityRef: { name },
              });
            },
          }),
        });
      },
    });
  },
});
