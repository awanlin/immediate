import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { RouterEntityProvider } from './RouterEntityProvider';

export const catalogModuleRouterProvider = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'router-entity-provider',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        scheduler: coreServices.scheduler,
        httpRouter: coreServices.httpRouter,
      },
      async init({ catalog, config, logger, scheduler, httpRouter }) {
        const provider = RouterEntityProvider.fromConfig(config, {
          logger: logger,
          scheduler,
        });

        catalog.addEntityProvider(provider);
        httpRouter.use(provider.getRouter());
        
        // Add for testing
        // httpRouter.addAuthPolicy({
        //   path: '/router',
        //   allow: 'unauthenticated',
        // });
      },
    });
  },
});
