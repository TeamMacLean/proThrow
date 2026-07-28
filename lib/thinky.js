const config = require("../config.json");
const rethinkdbdash = require("rethinkdbdash");

// Create rethinkdb connection with explicit database
const r = rethinkdbdash({
  host: config.dbHost || "localhost",
  port: config.dbPort || 28015,
  db: config.dbName || "prothrow",
  silent: false,
});

const dbName = config.dbName || "prothrow";

/**
 * Schema bootstrap.
 *
 * Database, tables and indexes have to be created in that order, and each step
 * used to be fired off without anything awaiting it. Against an existing
 * database that was harmless; against an empty one - a fresh deployment, a CI
 * service container, a developer's first run - every step raced the one before
 * it. Tables were created before the database existed and indexes before their
 * tables, and because both failures were swallowed the result was a working app
 * with no secondary indexes at all, quietly full-table-scanning every lookup.
 */
/**
 * The exists-then-create check is not atomic, so two processes starting against
 * the same empty database - jest's parallel workers, or several app instances -
 * can both decide to create it and one will lose. Losing that race is success,
 * not failure.
 *
 * @param {Error} err
 * @returns {boolean}
 */
function isAlreadyExists(err) {
  return /already exists/i.test((err && err.message) || "");
}

const databaseReady = r
  .dbList()
  .contains(dbName)
  .do(function (dbExists) {
    return r.branch(dbExists, { created: 0 }, r.dbCreate(dbName));
  })
  .run()
  .catch((err) => {
    if (isAlreadyExists(err)) return { created: 0 };
    console.error("Database creation check error:", err);
    throw err;
  });

/** tableName -> promise resolving once that table exists. */
const tableReady = {};
/** Everything the schema bootstrap still has in flight. */
const schemaTasks = [databaseReady];

/**
 * Create a table once the database exists, memoised per table.
 *
 * @param {string} tableName
 * @returns {Promise<void>}
 */
function ensureTable(tableName) {
  if (!tableReady[tableName]) {
    tableReady[tableName] = databaseReady
      .then(() =>
        r
          .db(dbName)
          .tableList()
          .contains(tableName)
          .do((tableExists) =>
            r.branch(
              tableExists,
              { created: 0 },
              r.db(dbName).tableCreate(tableName)
            )
          )
          .run()
      )
      .catch((err) => {
        if (isAlreadyExists(err)) return { created: 0 };
        console.error(`Error creating table ${tableName}:`, err.message);
      });
    schemaTasks.push(tableReady[tableName]);
  }
  return tableReady[tableName];
}

/**
 * Resolve once the database, every table and every index is in place.
 *
 * Loops because requiring a model file registers more work, so the set can grow
 * while earlier entries are still being awaited.
 *
 * @returns {Promise<void>}
 */
async function ready() {
  let settled = 0;
  while (settled !== schemaTasks.length) {
    settled = schemaTasks.length;
    await Promise.all(schemaTasks);
  }

  // tableCreate resolves before the table can actually accept writes, so a
  // query issued immediately afterwards can still fail. This blocks until the
  // whole database is writable.
  try {
    await r.db(dbName).wait({ waitFor: "ready_for_writes" }).run();
  } catch (err) {
    console.error("Waiting for database readiness failed:", err.message);
  }
}

// Type system similar to thinky's
const type = {
  string: () => ({
    _type: "string",
    _required: false,
    _default: undefined,
    _min: undefined,
    _max: undefined,
    _enum: undefined,
    _schema: undefined,
    required: function () {
      this._required = true;
      return this;
    },
    default: function (val) {
      this._default = val;
      return this;
    },
    min: function (val) {
      this._min = val;
      return this;
    },
    max: function (val) {
      this._max = val;
      return this;
    },
    enum: function (values) {
      this._enum = values;
      return this;
    },
    schema: function (schema) {
      this._schema = schema;
      return this;
    },
    validate: function (value) {
      if (value === undefined || value === null) {
        if (this._required) throw new Error("Value is required");
        return this._default;
      }
      if (typeof value !== "string") {
        throw new Error("Value must be a string");
      }
      if (this._min !== undefined && value.length < this._min) {
        throw new Error(`String length must be at least ${this._min}`);
      }
      if (this._max !== undefined && value.length > this._max) {
        throw new Error(`String length must be at most ${this._max}`);
      }
      if (this._enum !== undefined && !this._enum.includes(value)) {
        throw new Error(`Value must be one of: ${this._enum.join(", ")}`);
      }
      return value;
    },
  }),

  number: () => ({
    _type: "number",
    _required: false,
    _default: undefined,
    _min: undefined,
    _max: undefined,
    required: function () {
      this._required = true;
      return this;
    },
    default: function (val) {
      this._default = val;
      return this;
    },
    min: function (val) {
      this._min = val;
      return this;
    },
    max: function (val) {
      this._max = val;
      return this;
    },
    validate: function (value) {
      if (value === undefined || value === null || value === "") {
        if (this._required) throw new Error("Value is required");
        return this._default;
      }
      let numValue = value;
      if (typeof value === "string") {
        numValue = parseFloat(value);
      }
      if (typeof numValue !== "number" || isNaN(numValue)) {
        throw new Error("Value must be a number");
      }
      if (this._min !== undefined && numValue < this._min) {
        throw new Error(`Number must be at least ${this._min}`);
      }
      if (this._max !== undefined && numValue > this._max) {
        throw new Error(`Number must be at most ${this._max}`);
      }
      return numValue;
    },
  }),

  boolean: () => ({
    _type: "boolean",
    _required: false,
    _default: undefined,
    required: function () {
      this._required = true;
      return this;
    },
    default: function (val) {
      this._default = val;
      return this;
    },
    validate: function (value) {
      if (value === undefined || value === null) {
        if (this._required) throw new Error("Value is required");
        return this._default;
      }
      if (typeof value !== "boolean") {
        throw new Error("Value must be a boolean");
      }
      return value;
    },
  }),

  date: () => ({
    _type: "date",
    _required: false,
    _default: undefined,
    required: function () {
      this._required = true;
      return this;
    },
    default: function (val) {
      this._default = val;
      return this;
    },
    validate: function (value) {
      if (value === undefined || value === null) {
        if (this._required) throw new Error("Value is required");
        if (typeof this._default === "function") {
          return this._default();
        }
        return this._default;
      }
      if (!(value instanceof Date) && typeof value !== "string") {
        throw new Error("Value must be a date");
      }
      return value instanceof Date ? value : new Date(value);
    },
  }),

  array: () => ({
    _type: "array",
    _required: false,
    _default: undefined,
    _schema: undefined,
    required: function () {
      this._required = true;
      return this;
    },
    default: function (val) {
      this._default = val;
      return this;
    },
    schema: function (schema) {
      this._schema = schema;
      return this;
    },
    validate: function (value) {
      if (value === undefined || value === null) {
        if (this._required) throw new Error("Value is required");
        return this._default;
      }
      if (!Array.isArray(value)) {
        throw new Error("Value must be an array");
      }
      return value;
    },
  }),

  object: () => ({
    _type: "object",
    _required: false,
    _default: undefined,
    required: function () {
      this._required = true;
      return this;
    },
    default: function (val) {
      this._default = val;
      return this;
    },
    validate: function (value) {
      if (value === undefined || value === null) {
        if (this._required) throw new Error("Value is required");
        return this._default;
      }
      if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Value must be an object");
      }
      return value;
    },
  }),
};

// Model registry
const models = {};

// Helper function to process joins for a single instance
async function processJoins(instance, relations, Model) {
  if (!Model.relationships) return;

  // Process all relations in parallel for much better performance
  const relationPromises = Object.entries(relations).map(
    async ([relationName, relationConfig]) => {
      const nestedRelations =
        typeof relationConfig === "object" && !Array.isArray(relationConfig)
          ? relationConfig
          : null;

      let relationDef = null;
      let relationType = null;

      if (Model.relationships.hasMany) {
        relationDef = Model.relationships.hasMany.find((rel) => {
          return rel.relationName === relationName;
        });
        if (relationDef) relationType = "hasMany";
      }

      if (!relationDef && Model.relationships.belongsTo) {
        relationDef = Model.relationships.belongsTo.find((rel) => {
          return rel.relationName === relationName;
        });
        if (relationDef) relationType = "belongsTo";
      }

      if (!relationDef && Model.relationships.hasOne) {
        relationDef = Model.relationships.hasOne.find((rel) => {
          return rel.relationName === relationName;
        });
        if (relationDef) relationType = "hasOne";
      }

      if (!relationDef && Model.relationships.hasAndBelongsToMany) {
        relationDef = Model.relationships.hasAndBelongsToMany.find((rel) => {
          return rel.relationName === relationName;
        });
        if (relationDef) relationType = "hasAndBelongsToMany";
      }

      if (!relationDef) {
        console.warn(
          `No relationship found for ${relationName} in ${Model.tableName}`
        );
        return;
      }

      const relatedModel = relationDef.model;
      const localKey = relationDef.localKey;
      const foreignKey = relationDef.foreignKey;

      try {
        if (relationType === "hasMany") {
          // Use getAll with index for much faster lookups (O(log n) vs O(n))
          const lookupValue = instance[localKey];
          let relatedDocs;
          try {
            // Try using index first (requires index on foreignKey)
            relatedDocs = await r
              .table(relatedModel.tableName)
              .getAll(lookupValue, { index: foreignKey })
              .run();
          } catch (_indexErr) {
            // Fallback to filter if index doesn't exist
            relatedDocs = await r
              .table(relatedModel.tableName)
              .filter({ [foreignKey]: lookupValue })
              .run();
          }

          instance[relationName] = relatedDocs.map(
            (doc) => new relatedModel(doc)
          );

          if (nestedRelations) {
            // Process nested joins in parallel for better performance
            await Promise.all(
              instance[relationName].map((relatedInstance) =>
                processJoins(relatedInstance, nestedRelations, relatedModel)
              )
            );
          }
        } else if (relationType === "belongsTo" || relationType === "hasOne") {
          const relatedDoc = await r
            .table(relatedModel.tableName)
            .get(instance[foreignKey])
            .run();

          instance[relationName] = relatedDoc
            ? new relatedModel(relatedDoc)
            : null;

          if (nestedRelations && instance[relationName]) {
            await processJoins(
              instance[relationName],
              nestedRelations,
              relatedModel
            );
          }
        } else if (relationType === "hasAndBelongsToMany") {
          // For self-referential many-to-many relationships
          const linkValue = instance[localKey];
          if (linkValue) {
            let relatedDocs;
            try {
              // Try using index first
              relatedDocs = await r
                .table(relatedModel.tableName)
                .getAll(linkValue, { index: foreignKey })
                .run();
            } catch (_indexErr) {
              // Fallback to filter if index doesn't exist
              relatedDocs = await r
                .table(relatedModel.tableName)
                .filter({ [foreignKey]: linkValue })
                .run();
            }

            instance[relationName] = relatedDocs
              .filter((doc) => doc.id !== instance.id)
              .map((doc) => new relatedModel(doc));
          } else {
            instance[relationName] = [];
          }
        }
      } catch (err) {
        console.error(
          `Error loading relation ${relationName} for ${Model.tableName}:`,
          err
        );
      }
    }
  );

  await Promise.all(relationPromises);
}

// Create a model-like interface similar to thinky
function createModel(tableName, schema) {
  // Chained off the database bootstrap rather than fired immediately, so the
  // table is never created before the database it lives in.
  ensureTable(tableName);

  // Create a constructor function for the model
  function Model(data = {}) {
    const instance = Object.create(Model.prototype);

    // Validate and set default values based on schema
    Object.keys(schema).forEach((key) => {
      if (schema[key] && typeof schema[key].validate === "function") {
        try {
          instance[key] = schema[key].validate(data[key]);
        } catch (_err) {
          instance[key] = data[key];
        }
      } else {
        instance[key] = data[key];
      }
    });

    // Add any extra fields not in schema
    Object.keys(data).forEach((key) => {
      if (!(key in instance)) {
        instance[key] = data[key];
      }
    });

    return instance;
  }

  // Static methods
  Model.tableName = tableName;
  Model.schema = schema;

  Model.run = async function () {
    const docs = await r.table(tableName).run();
    return docs.map((doc) => new Model(doc));
  };

  Model.execute = Model.run;

  Model.get = function (id) {
    const runFn = async () => {
      const doc = await r.table(tableName).get(id).run();
      return doc ? new Model(doc) : null;
    };

    const query = {
      then: (resolve, reject) => {
        return runFn().then(resolve, reject);
      },
      catch: (reject) => {
        return runFn().catch(reject);
      },
      getJoin: (relations) => {
        const getJoinRunFn = async () => {
          const doc = await r.table(tableName).get(id).run();
          if (!doc) return null;

          const instance = new Model(doc);

          if (relations && Object.keys(relations).length > 0) {
            await processJoins(instance, relations, Model);
          }

          return instance;
        };

        return {
          run: getJoinRunFn,
          execute: getJoinRunFn,
          then: (resolve, reject) => {
            return getJoinRunFn().then(resolve, reject);
          },
          catch: (reject) => {
            return getJoinRunFn().catch(reject);
          },
        };
      },
    };

    return query;
  };

  Model.getAll = async function (...args) {
    const query = r.table(tableName).getAll(...args);
    return {
      run: async () => {
        const docs = await query.run();
        return docs.map((doc) => new Model(doc));
      },
    };
  };

  Model.filter = function (predicate) {
    const query = r.table(tableName).filter(predicate);
    const runFn = async () => {
      const docs = await query.run();
      return docs.map((doc) => new Model(doc));
    };

    return {
      run: runFn,
      execute: runFn,
      then: (resolve, reject) => {
        return runFn().then(resolve, reject);
      },
      catch: (reject) => {
        return runFn().catch(reject);
      },
      update: (updates) => ({
        run: () => query.update(updates).run(),
        execute: () => query.update(updates).run(),
      }),
      delete: () => ({
        run: () => query.delete().run(),
        execute: () => query.delete().run(),
      }),
      orderBy: (field) => {
        const orderByQuery = query.orderBy(field);
        const orderByRunFn = async () => {
          const docs = await orderByQuery.run();
          return docs.map((doc) => new Model(doc));
        };
        return {
          run: orderByRunFn,
          execute: orderByRunFn,
          then: (resolve, reject) => {
            return orderByRunFn().then(resolve, reject);
          },
          catch: (reject) => {
            return orderByRunFn().catch(reject);
          },
        };
      },
      count: () => ({
        run: () => query.count().run(),
        execute: () => query.count().run(),
      }),
      getJoin: (relations) => {
        const getJoinRunFn = async () => {
          const docs = await query.run();
          const instances = docs.map((doc) => new Model(doc));

          if (relations && Object.keys(relations).length > 0) {
            for (const instance of instances) {
              await processJoins(instance, relations, Model);
            }
          }

          return instances;
        };

        return {
          run: getJoinRunFn,
          execute: getJoinRunFn,
          then: (resolve, reject) => {
            return getJoinRunFn().then(resolve, reject);
          },
          catch: (reject) => {
            return getJoinRunFn().catch(reject);
          },
        };
      },
    };
  };

  Model.orderBy = function (...args) {
    const query = r.table(tableName).orderBy(...args);
    return {
      run: async () => {
        const docs = await query.run();
        return docs.map((doc) => new Model(doc));
      },
      execute: async () => {
        const docs = await query.run();
        return docs.map((doc) => new Model(doc));
      },
      limit: (n) => ({
        run: async () => {
          const docs = await query.limit(n).run();
          return docs.map((doc) => new Model(doc));
        },
        execute: async () => {
          const docs = await query.limit(n).run();
          return docs.map((doc) => new Model(doc));
        },
      }),
    };
  };

  Model.save = async function (doc) {
    const instance = new Model(doc);
    await Model.executePreHooks("save", instance);

    if (instance.id) {
      await r.table(tableName).get(instance.id).update(instance).run();
    } else {
      const result = await r.table(tableName).insert(instance).run();
      if (result.generated_keys && result.generated_keys.length > 0) {
        instance.id = result.generated_keys[0];
      }
    }

    await Model.executePostHooks("save", instance);
    return instance;
  };

  Model.delete = async function (id) {
    return r.table(tableName).get(id).delete().run();
  };

  Model.count = function () {
    const query = r.table(tableName).count();
    return {
      run: () => query.run(),
      execute: () => query.run(),
    };
  };

  Model.ensureIndex = function (indexName, indexFunction) {
    // Waits for the table. Previously this ran immediately, so on an empty
    // database it failed with "table does not exist" - swallowed and logged as
    // "might already exist", which read like success. The index was never
    // created and every filter() on it silently became a full table scan.
    const task = ensureTable(tableName)
      .then(() =>
        r
          .table(tableName)
          .indexList()
          .contains(indexName)
          .do((hasIndex) =>
            r.branch(
              hasIndex,
              { created: 0 },
              r.table(tableName).indexCreate(indexName, indexFunction)
            )
          )
          .run()
      )
      .catch((err) => {
        if (isAlreadyExists(err)) return { created: 0 };
        console.error(
          `Could not create index ${indexName} on ${tableName}:`,
          err.message
        );
      });
    schemaTasks.push(task);
    return Model;
  };

  // Relationship methods
  Model.belongsTo = function (otherModel, relationName, foreignKey, localKey) {
    if (!Model.relationships) Model.relationships = {};
    Model.relationships.belongsTo = Model.relationships.belongsTo || [];
    Model.relationships.belongsTo.push({
      model: otherModel,
      relationName: relationName,
      foreignKey: foreignKey,
      localKey: localKey || "id",
    });
    return Model;
  };

  Model.hasOne = function (otherModel, relationName, foreignKey, localKey) {
    if (!Model.relationships) Model.relationships = {};
    Model.relationships.hasOne = Model.relationships.hasOne || [];
    Model.relationships.hasOne.push({
      model: otherModel,
      relationName: relationName,
      foreignKey: foreignKey,
      localKey: localKey || "id",
    });
    return Model;
  };

  Model.hasMany = function (otherModel, relationName, localKey, foreignKey) {
    if (!Model.relationships) Model.relationships = {};
    Model.relationships.hasMany = Model.relationships.hasMany || [];
    Model.relationships.hasMany.push({
      model: otherModel,
      relationName: relationName,
      localKey: localKey || "id",
      foreignKey: foreignKey || localKey || "id",
    });
    return Model;
  };

  Model.hasAndBelongsToMany = function (
    otherModel,
    relationName,
    localKey,
    foreignKey
  ) {
    if (!Model.relationships) Model.relationships = {};
    Model.relationships.hasAndBelongsToMany =
      Model.relationships.hasAndBelongsToMany || [];
    Model.relationships.hasAndBelongsToMany.push({
      model: otherModel,
      relationName: relationName,
      localKey: localKey || "id",
      foreignKey: foreignKey || localKey || "id",
    });
    return Model;
  };

  Model.getJoin = function (relations) {
    const query = r.table(tableName);

    const runFn = async () => {
      const docs = await query.run();
      const instances = docs.map((doc) => new Model(doc));

      if (relations && Object.keys(relations).length > 0) {
        for (const instance of instances) {
          await processJoins(instance, relations, Model);
        }
      }

      return instances;
    };

    return {
      run: runFn,
      execute: runFn,
      then: (resolve, reject) => {
        return runFn().then(resolve, reject);
      },
      catch: (reject) => {
        return runFn().catch(reject);
      },
      filter: function (predicate) {
        const filteredQuery = query.filter(predicate);
        return {
          run: async () => {
            const docs = await filteredQuery.run();
            const instances = docs.map((doc) => new Model(doc));

            if (relations && Object.keys(relations).length > 0) {
              for (const instance of instances) {
                await processJoins(instance, relations, Model);
              }
            }

            return instances;
          },
        };
      },
    };
  };

  Model.define = function (propertyName, fn) {
    Model.prototype[propertyName] = fn;
  };

  // Hook methods
  Model.hooks = {
    pre: {},
    post: {},
  };

  Model.pre = function (operation, fn) {
    if (!Model.hooks.pre[operation]) {
      Model.hooks.pre[operation] = [];
    }
    Model.hooks.pre[operation].push(fn);
    return Model;
  };

  Model.post = function (operation, fn) {
    if (!Model.hooks.post[operation]) {
      Model.hooks.post[operation] = [];
    }
    Model.hooks.post[operation].push(fn);
    return Model;
  };

  Model.executePreHooks = async function (operation, context) {
    const hooks = Model.hooks.pre[operation] || [];
    for (const hook of hooks) {
      await new Promise((resolve, reject) => {
        if (hook.length === 1) {
          hook.call(context, (err) => {
            if (err) reject(err);
            else resolve();
          });
        } else {
          try {
            const result = hook.call(context);
            if (result && typeof result.then === "function") {
              result.then(resolve).catch(reject);
            } else {
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        }
      });
    }
  };

  Model.executePostHooks = async function (operation, context) {
    const hooks = Model.hooks.post[operation] || [];
    for (const hook of hooks) {
      await new Promise((resolve, reject) => {
        if (hook.length === 1) {
          hook.call(context, (err) => {
            if (err) reject(err);
            else resolve();
          });
        } else {
          try {
            const result = hook.call(context);
            if (result && typeof result.then === "function") {
              result.then(resolve).catch(reject);
            } else {
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        }
      });
    }
  };

  // Instance methods
  Model.prototype.save = async function () {
    await Model.executePreHooks("save", this);

    Object.keys(schema).forEach((key) => {
      if (
        (this[key] === undefined || this[key] === null) &&
        schema[key]._default !== undefined
      ) {
        if (typeof schema[key]._default === "function") {
          if (schema[key]._type === "date") {
            this[key] = new Date();
          }
        } else {
          this[key] = schema[key]._default;
        }
      }
    });

    if (this.id) {
      await r.table(tableName).get(this.id).update(this).run();
    } else {
      const result = await r.table(tableName).insert(this).run();
      if (result.generated_keys && result.generated_keys.length > 0) {
        this.id = result.generated_keys[0];
      }
    }

    await Model.executePostHooks("save", this);
    return this;
  };

  Model.prototype.delete = async function () {
    if (this.id) {
      return Model.delete(this.id);
    }
    throw new Error("Cannot delete document without id");
  };

  Model.prototype.validate = function () {
    Object.keys(schema).forEach((key) => {
      if (schema[key] && typeof schema[key].validate === "function") {
        this[key] = schema[key].validate(this[key]);
      }
    });
    return true;
  };

  // Register model
  models[tableName] = Model;

  return Model;
}

// Export the thinky-compatible interface
module.exports = {
  r,
  type,
  createModel,
  models,
  // Await this before the first query against a database that may be empty.
  ready,
};
