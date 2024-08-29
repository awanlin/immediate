import { SchedulerServiceTaskScheduleDefinitionConfig } from '@backstage/backend-plugin-api';

export interface Config {
  catalog?: {
    /**
     * List of provider-specific options and attributes
     */
    providers?: {
      /**
       * BackstageEntityProvider configuration
       */
      routerEntityProvider?: {
        /**
         * TaskScheduleDefinition for the refresh.
         */
        schedule: SchedulerServiceTaskScheduleDefinitionConfig;
      };
    };
  };
}
