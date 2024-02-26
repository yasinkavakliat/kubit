/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Kubit/Application';

/**
 * Database service provider
 */
export default class DatabaseServiceProvider {
  constructor(protected app: ApplicationContract) {}
  public static needsApplication = true

  /**
   * Register the database binding
   */
  private registerDatabase() {
    this.app.container.singleton('Kubit/Database', () => {
      const config = this.app.container.resolveBinding('Kubit/Config').get('database', {})
      const Logger = this.app.container.resolveBinding('Kubit/Logger')
      const Profiler = this.app.container.resolveBinding('Kubit/Profiler')
      const Emitter = this.app.container.resolveBinding('Kubit/Event')

      const { Database } = require('../src/Database')
      return new Database(config, Logger, Profiler, Emitter)
    })
  }

  /**
   * Registers ORM
   */
  private registerOrm() {
    this.app.container.singleton('Kubit/Orm', () => {
      const { Adapter } = require('../src/Orm/Adapter')
      const { scope } = require('../src/Helpers/scope')
      const decorators = require('../src/Orm/Decorators')
      const { BaseModel } = require('../src/Orm/BaseModel')
      const { ModelPaginator } = require('../src/Orm/Paginator')
      const { SnakeCaseNamingStrategy } = require('../src/Orm/NamingStrategies/SnakeCase')

      /**
       * Attaching adapter to the base model. Each model is allowed to define
       * a different adapter.
       */
      BaseModel.$adapter = new Adapter(this.app.container.resolveBinding('Kubit/Database'))
      BaseModel.$container = this.app.container

      return {
        BaseModel,
        ModelPaginator,
        SnakeCaseNamingStrategy,
        scope,
        ...decorators,
      }
    })
  }

  /**
   * Registers schema class
   */
  private registerSchema() {
    this.app.container.singleton('Kubit/Schema', () => {
      const { Schema } = require('../src/Schema')
      return Schema
    })
  }

  /**
   * Registers schema class
   */
  private registerFactory() {
    this.app.container.singleton('Kubit/Factory', () => {
      const { FactoryManager } = require('../src/Factory')
      return new FactoryManager()
    })
  }

  /**
   * Registers schema class
   */
  private registerBaseSeeder() {
    this.app.container.singleton('Kubit/Seeder', () => {
      const { BaseSeeder } = require('../src/BaseSeeder')
      return BaseSeeder
    })
  }

  /**
   * Registers the health checker
   */
  private registerHealthChecker() {
    /**
     * Do not register health checks in the repl environment
     */
    if (this.app.environment === 'repl') {
      return
    }

    this.app.container.withBindings(
      ['Kubit/HealthCheck', 'Kubit/Database'],
      (HealthCheck, Db) => {
        if (Db.hasHealthChecksEnabled) {
          HealthCheck.addChecker('lucid', 'Kubit/Database')
        }
      }
    )
  }

  /**
   * Register the migrator used for database migration
   */
  private registerMigrator() {
    this.app.container.bind('Kubit/Migrator', () => {
      const { Migrator } = require('../src/Migrator')
      return Migrator
    })
  }

  /**
   * Extends the validator by defining validation rules
   */
  private defineValidationRules() {
    /**
     * Do not register validation rules in the "repl" environment
     */
    if (this.app.environment === 'repl') {
      return
    }

    this.app.container.withBindings(
      ['Kubit/Validator', 'Kubit/Database', 'Kubit/Logger'],
      (Validator, Db, Logger) => {
        const { extendValidator } = require('../src/Bindings/Validator')
        extendValidator(Validator.validator, Db, Logger)
      }
    )
  }

  /**
   * Defines REPL bindings
   */
  private defineReplBindings() {
    if (this.app.environment !== 'repl') {
      return
    }

    this.app.container.withBindings(['Kubits/Repl'], (Repl) => {
      const { defineReplBindings } = require('../src/Bindings/Repl')
      defineReplBindings(this.app, Repl)
    })
  }

  /**
   * Define test utilities for database
   */
  private defineTestUtils() {
    this.app.container.withBindings(['Kubit/TestUtils', 'Kubit/Ace'], (testUtils, ace) => {
      const { defineTestUtils } = require('../src/Bindings/TestUtils')
      return new defineTestUtils(testUtils, ace)
    })
  }

  /**
   * Called when registering providers
   */
  public register(): void {
    this.registerDatabase()
    this.registerOrm()
    this.registerSchema()
    this.registerFactory()
    this.registerBaseSeeder()
    this.registerMigrator()
  }

  /**
   * Called when all bindings are in place
   */
  public boot(): void {
    this.registerHealthChecker()
    this.defineValidationRules()
    this.defineReplBindings()
    this.defineTestUtils()
  }

  /**
   * Gracefully close connections during shutdown
   */
  public async shutdown() {
    await this.app.container.resolveBinding('Kubit/Database').manager.closeAll()
  }
}