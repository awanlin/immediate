import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  SchedulerService,
  SchedulerServiceTaskRunner,
  LoggerService,
  readSchedulerServiceTaskScheduleDefinitionFromConfig,
} from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { assertError } from '@backstage/errors';
import * as uuid from 'uuid';
import Router from 'express-promise-router';
import express from 'express';
import { errorHandler } from '@backstage/backend-common';

export class RouterEntityProvider implements EntityProvider {
  private readonly logger: LoggerService;
  private readonly scheduleFn: () => Promise<void>;
  private connection?: EntityProviderConnection;

  static fromConfig(
    config: Config,
    options: {
      logger: LoggerService;
      scheduler: SchedulerService;
    },
  ): RouterEntityProvider {
    const configSchedule = readSchedulerServiceTaskScheduleDefinitionFromConfig(
      config.getConfig('catalog.providers.routerEntityProvider.schedule'),
    );

    const taskRunner =
      options.scheduler.createScheduledTaskRunner(configSchedule);

    return new RouterEntityProvider(options.logger, taskRunner);
  }

  private constructor(
    logger: LoggerService,
    taskRunner: SchedulerServiceTaskRunner,
  ) {
    this.logger = logger.child({
      target: this.getProviderName(),
    });

    this.scheduleFn = this.createScheduleFn(taskRunner);
  }

  getProviderName(): string {
    return 'routerEntityProvider';
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    await this.scheduleFn();
  }

  private createScheduleFn(
    taskRunner: SchedulerServiceTaskRunner,
  ): () => Promise<void> {
    return async () => {
      const taskId = `${this.getProviderName()}:refresh`;
      return taskRunner.run({
        id: taskId,
        fn: async () => {
          const logger = this.logger.child({
            class: RouterEntityProvider.prototype.constructor.name,
            taskId,
            taskInstanceId: uuid.v4(),
          });

          try {
            await this.refresh(logger);
          } catch (error) {
            assertError(error);
            logger.error(
              `${this.getProviderName()} refresh failed, ${error}`,
              error,
            );
          }
        },
      });
    };
  }

  async refresh(logger: LoggerService) {
    if (!this.connection) {
      throw new Error('Not initialized');
    }

    logger.info(`Discovering entities for ${this.getProviderName()}`);

    const entities: Entity[] = [];

    if (entities.length > 0) {
        logger.info(
          `Attempting to apply mutations on ${
            entities.length
          } entities from the ${this.getProviderName()} provider`,
        );
        await this.connection.applyMutation({
          type: 'full',
          entities: entities.map(entity => ({
            entity,
            locationKey: this.getProviderName(),
          })),
        });
      } else {
        logger.warn(
          `No entities discovered by ${this.getProviderName()}, mutation not being attempted this run`,
        );
      }

    logger.info(
      `Completed refreshing entities for the ${this.getProviderName()} provider`,
    );
  }

  getRouter() {
    const router = Router();
    router.use(express.json());

    // http://localhost:7007/api/catalog/router
    router.get(`/router`, async (_req, res) => {
      res.status(200).json({ message: 'entity router provider' });
    });

    router.use(errorHandler());

    return router;
  }
}
