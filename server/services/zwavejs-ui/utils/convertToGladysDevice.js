const cleanNames = require('./cleanNames');

const { EXPOSES, PARAMS, COMMANDCLASS, PRODUCTID } = require('../lib/constants');
const getProperty = require('./getProperty');
const { refineCategory } = require('./refineCategory');
const { getDeviceFeatureName } = require('./getDeviceFeatureName');

const getDeviceFeatureId = (nodeId, commandClassName, endpoint, propertyName, propertyKeyName, featureName) => {
  const propertyKeyNameClean = cleanNames(propertyKeyName);
  return `zwavejs-ui:${nodeId}:${endpoint}:${cleanNames(commandClassName)}:${cleanNames(propertyName)}${
    propertyKeyNameClean !== '' ? `:${propertyKeyNameClean}` : ''
  }${featureName !== '' ? `:${featureName}` : ''}`;
};

/**
 * @description Cleanup features.
 * For example: remove a Binary Switch sent by a device on a
 * Multilevel Switch (we do manage a virtual one on Gladys).
 * @param {Array} features - Detected features on the node.
 * @param {object} zwaveJsDevice - The ZwaveJs device.
 * @returns {Array} The cleaned up features.
 * @example cleanupFeatures(features)
 */
function cleanupFeatures(features, zwaveJsDevice) {
  let localFeatures = features;
  // ------------------------------
  // Multilevel Switch special case
  // ------------------------------
  // Some Multilevel Switch device have an explicit Binary Switch
  // exposed some others not (Qubino vs Fibaro for example). As for
  // devices that do not expose any Binary Switch value, we manage
  // a virtual one through the Multilevel Switch. In order to improve
  // the user experience, we so cleanup any explicit Binary Switch
  // so the user doesn't see too many options when managing their device
  // (we keep the virtual one because it is correctly synchronized with
  // others features - state & position - and keeps code simpler)
  if (localFeatures.some((f) => f.command_class === COMMANDCLASS.MULTILEVEL_SWITCH)) {
    localFeatures = localFeatures.filter((f) => f.command_class !== COMMANDCLASS.BINARY_SWITCH);
  }

  // ----------------------------------------------
  // Fibaro Motion Sensor special case (FGMS-001)
  // ----------------------------------------------
  // Some Fibaro Motion Sensor have an explicit Binary Sensor General Purpose some others don't.
  // We so need to deal with those having the General Purpose and not rely on the "Any" feature.
  // On the other hand, those not exposing the General Purpose are correctly handled by the "Any" feature.
  // The alarm sensor seems not usefull, so we remove it.
  if (zwaveJsDevice.deviceId === PRODUCTID.FIBARO_FGMS001) {
    // Remove the Alarm Sensor
    localFeatures = localFeatures.filter((f) => f.command_class !== COMMANDCLASS.ALARM_SENSOR);

    // Remove the Any Binary Sensor if the General Purpose is present
    if (
      localFeatures.some(
        (f) => f.command_class === COMMANDCLASS.BINARY_SENSOR && cleanNames(f.property_name) === 'general_purpose',
      )
    ) {
      localFeatures = localFeatures.filter(
        (f) => !(f.command_class === COMMANDCLASS.BINARY_SENSOR && cleanNames(f.property_name) === 'any'),
      );
    }
  }

  // Add any other special cleanup necessary... Please, provide an explanation

  return localFeatures;
}

const convertToGladysDevice = (serviceId, zwaveJsDevice) => {
  const features = [];
  let params = [];

  // Foreach value, we check if there is a matching feature in Gladys
  Object.keys(zwaveJsDevice.values).forEach((valueKey) => {
    const value = zwaveJsDevice.values[valueKey];
    const {
      commandClass,
      commandClassName,
      propertyName,
      propertyKeyName,
      endpoint = 0,
      commandClassVersion = 1,
    } = value;

    let exposes =
      getProperty(EXPOSES, commandClassName, propertyName, propertyKeyName, zwaveJsDevice.deviceClass) ||
      // We try to get a higher EXPOSEd node (to handle Scene Controllers for example).
      getProperty(EXPOSES, commandClassName, propertyName, '', zwaveJsDevice.deviceClass);
    if (exposes) {
      if (!Array.isArray(exposes)) {
        exposes = [
          {
            name: '',
            feature: exposes,
          },
        ];
      }

      exposes.forEach((exposeFound) => {
        // Let's check we effectively found a valid EXPOSE and not
        // just a higher node
        if (!exposeFound.feature.category) {
          return;
        }

        const deviceFeatureId = getDeviceFeatureId(
          zwaveJsDevice.id,
          commandClassName,
          endpoint,
          propertyName,
          propertyKeyName,
          exposeFound.name,
        );

        refineCategory(exposeFound, value);

        features.push({
          ...exposeFound.feature,
          name: getDeviceFeatureName(exposeFound, value),
          external_id: deviceFeatureId,
          selector: deviceFeatureId,
          node_id: zwaveJsDevice.id,
          // These are custom properties only available on the object in memory (not in DB)
          command_class_version: commandClassVersion,
          command_class_name: commandClassName,
          command_class: commandClass,
          endpoint,
          property_name: propertyName,
          property_key_name: propertyKeyName,
          feature_name: exposeFound.name,
        });
      });
    }
    params = [{ name: PARAMS.LOCATION, value: zwaveJsDevice.loc }];
  });

  return {
    name: zwaveJsDevice.name || '',
    external_id: `zwavejs-ui:${zwaveJsDevice.id}`,
    selector: `zwavejs-ui:${zwaveJsDevice.id}`,
    service_id: serviceId,
    should_poll: false,
    features: cleanupFeatures(features, zwaveJsDevice),
    params,
  };
};

module.exports = {
  getDeviceFeatureId,
  convertToGladysDevice,
};
