const { EVENTS, JOB_TYPES } = require('../../utils/constants');
const { eventFunctionWrapper } = require('../../utils/functionsWrapper');

// Categories of DeviceFeatures
const CameraManager = require('./camera');
const LightManager = require('./light');
const TemperatureSensorManager = require('./temperature-sensor');
const HumiditySensorManager = require('./humidity-sensor');
const SwitchManager = require('./switch');

// Functions
const { add } = require('./device.add');
const { addFeature } = require('./device.addFeature');
const { addParam } = require('./device.addParam');
const { create } = require('./device.create');
const { destroy } = require('./device.destroy');
const { init } = require('./device.init');
const { get } = require('./device.get');
const { getBySelector } = require('./device.getBySelector');
const { getDeviceFeaturesAggregates } = require('./device.getDeviceFeaturesAggregates');
const { getDeviceFeaturesAggregatesMulti } = require('./device.getDeviceFeaturesAggregatesMulti');
const { onPurgeStatesEvent } = require('./device.onPurgeStatesEvent');
const { purgeStates } = require('./device.purgeStates');
const { purgeStatesByFeatureId } = require('./device.purgeStatesByFeatureId');
const { poll } = require('./device.poll');
const { pollAll } = require('./device.pollAll');
const { saveState } = require('./device.saveState');
const { saveHistoricalState } = require('./device.saveHistoricalState');
const { saveStringState } = require('./device.saveStringState');
const { setParam } = require('./device.setParam');
const { setValue } = require('./device.setValue');
const { setupPoll } = require('./device.setupPoll');
const { newStateEvent } = require('./device.newStateEvent');
const { notify } = require('./device.notify');
const { checkBatteries } = require('./device.checkBatteries');
const { migrateFromSQLiteToDuckDb } = require('./device.migrateFromSQLiteToDuckDb');
const { getDuckDbMigrationState } = require('./device.getDuckDbMigrationState');
const { purgeAllSqliteStates } = require('./device.purgeAllSqliteStates');

const DeviceManager = function DeviceManager(
  eventManager,
  messageManager,
  stateManager,
  serviceManager,
  roomManager,
  variable,
  job,
  brain,
  user,
) {
  this.eventManager = eventManager;
  this.messageManager = messageManager;
  this.stateManager = stateManager;
  this.serviceManager = serviceManager;
  this.roomManager = roomManager;
  this.variable = variable;
  this.job = job;
  this.brain = brain;
  this.user = user;

  this.STATES_TO_PURGE_PER_DEVICE_FEATURE_CLEAN_BATCH = 1000;
  this.WAIT_TIME_BETWEEN_DEVICE_FEATURE_CLEAN_BATCH = 100;
  this.MAX_NUMBER_OF_STATES_ALLOWED_TO_DELETE_DEVICE = 5000;

  // initialize all types of device feature categories
  this.camera = new CameraManager(this.stateManager, messageManager, eventManager, serviceManager, this);
  this.lightManager = new LightManager(eventManager, messageManager, this);
  this.temperatureSensorManager = new TemperatureSensorManager(eventManager, messageManager, this);
  this.humiditySensorManager = new HumiditySensorManager(eventManager, messageManager, this);
  this.switchManager = new SwitchManager(eventManager, stateManager, messageManager, this);

  this.purgeStatesByFeatureId = this.job.wrapper(
    JOB_TYPES.DEVICE_STATES_PURGE_SINGLE_FEATURE,
    this.purgeStatesByFeatureId.bind(this),
  );

  this.purgeAllSqliteStates = this.job.wrapper(
    JOB_TYPES.DEVICE_STATES_PURGE_ALL_SQLITE_STATES,
    this.purgeAllSqliteStates.bind(this),
  );

  this.devicesByPollFrequency = {};

  this.migrateFromSQLiteToDuckDb = this.job.wrapper(
    JOB_TYPES.MIGRATE_SQLITE_TO_DUCKDB,
    this.migrateFromSQLiteToDuckDb.bind(this),
  );

  // listen to events
  this.eventManager.on(EVENTS.DEVICE.NEW_STATE, this.newStateEvent.bind(this));
  this.eventManager.on(EVENTS.DEVICE.NEW, eventFunctionWrapper(this.create.bind(this)));
  this.eventManager.on(EVENTS.DEVICE.ADD_FEATURE, eventFunctionWrapper(this.addFeature.bind(this)));
  this.eventManager.on(EVENTS.DEVICE.ADD_PARAM, eventFunctionWrapper(this.addParam.bind(this)));
  this.eventManager.on(EVENTS.DEVICE.PURGE_STATES, eventFunctionWrapper(this.onPurgeStatesEvent.bind(this)));
  this.eventManager.on(
    EVENTS.DEVICE.PURGE_STATES_SINGLE_FEATURE,
    eventFunctionWrapper(this.purgeStatesByFeatureId.bind(this)),
  );
  this.eventManager.on(EVENTS.DEVICE.CHECK_BATTERIES, eventFunctionWrapper(this.checkBatteries.bind(this)));
  this.eventManager.on(
    EVENTS.DEVICE.MIGRATE_FROM_SQLITE_TO_DUCKDB,
    eventFunctionWrapper(this.migrateFromSQLiteToDuckDb.bind(this)),
  );
  this.eventManager.on(
    EVENTS.DEVICE.PURGE_ALL_SQLITE_STATES,
    eventFunctionWrapper(this.purgeAllSqliteStates.bind(this)),
  );
};

DeviceManager.prototype.add = add;
DeviceManager.prototype.addFeature = addFeature;
DeviceManager.prototype.addParam = addParam;
DeviceManager.prototype.create = create;
DeviceManager.prototype.destroy = destroy;
DeviceManager.prototype.init = init;
DeviceManager.prototype.get = get;
DeviceManager.prototype.getBySelector = getBySelector;
DeviceManager.prototype.getDeviceFeaturesAggregates = getDeviceFeaturesAggregates;
DeviceManager.prototype.getDeviceFeaturesAggregatesMulti = getDeviceFeaturesAggregatesMulti;
DeviceManager.prototype.onPurgeStatesEvent = onPurgeStatesEvent;
DeviceManager.prototype.purgeStates = purgeStates;
DeviceManager.prototype.purgeStatesByFeatureId = purgeStatesByFeatureId;
DeviceManager.prototype.poll = poll;
DeviceManager.prototype.pollAll = pollAll;
DeviceManager.prototype.newStateEvent = newStateEvent;
DeviceManager.prototype.saveState = saveState;
DeviceManager.prototype.saveHistoricalState = saveHistoricalState;
DeviceManager.prototype.saveStringState = saveStringState;
DeviceManager.prototype.setParam = setParam;
DeviceManager.prototype.setupPoll = setupPoll;
DeviceManager.prototype.setValue = setValue;
DeviceManager.prototype.notify = notify;
DeviceManager.prototype.checkBatteries = checkBatteries;
DeviceManager.prototype.migrateFromSQLiteToDuckDb = migrateFromSQLiteToDuckDb;
DeviceManager.prototype.getDuckDbMigrationState = getDuckDbMigrationState;
DeviceManager.prototype.purgeAllSqliteStates = purgeAllSqliteStates;

module.exports = DeviceManager;
