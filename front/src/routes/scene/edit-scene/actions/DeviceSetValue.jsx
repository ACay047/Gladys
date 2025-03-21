import { Component } from 'preact';
import { connect } from 'unistore/preact';
import { Text, Localizer } from 'preact-i18n';
import cx from 'classnames';
import ColorPicker from '../../../../components/device/ColorPicker';

import SelectDeviceFeature from '../../../../components/device/SelectDeviceFeature';
import withIntlAsProp from '../../../../utils/withIntlAsProp';

import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '../../../../../../server/utils/constants';
import TextWithVariablesInjected from '../../../../components/scene/TextWithVariablesInjected';

import '../../../../components/boxs/device-in-room/device-features/style.css';
import style from './DeviceSetValue.css';
import ShutterButtons from '../../../../components/device/ShutterButtons';
import SelectPilotWireMode from '../../../../components/device/SelectPilotWireMode';

class DeviceSetValue extends Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {
      computed: props.action.evaluate_value !== undefined
    };
  }

  toggleType = () => this.setState({ computed: !this.state.computed });

  onDeviceFeatureChange = (deviceFeature, device) => {
    const deviceFeatureChanged = this.props.action.device_feature !== deviceFeature.selector;
    if (deviceFeature) {
      this.props.updateActionProperty(this.props.path, 'device_feature', deviceFeature.selector);
    } else {
      this.props.updateActionProperty(this.props.path, 'device_feature', null);
    }
    if (deviceFeatureChanged) {
      if (deviceFeature.type === DEVICE_FEATURE_TYPES.SWITCH.BINARY) {
        this.props.updateActionProperty(this.props.path, 'value', 0);
        this.props.updateActionProperty(this.props.path, 'evaluate_value', undefined);
      } else {
        this.props.updateActionProperty(this.props.path, 'value', undefined);
        this.props.updateActionProperty(this.props.path, 'evaluate_value', undefined);
      }
    }
    this.setState({ deviceFeature, device });
  };

  handleNewValue = e => {
    this.props.updateActionProperty(this.props.path, 'value', e.target.value);
    this.props.updateActionProperty(this.props.path, 'evaluate_value', undefined);
  };

  handleNewPureValue = value => {
    this.props.updateActionProperty(this.props.path, 'value', value);
    this.props.updateActionProperty(this.props.path, 'evaluate_value', undefined);
  };

  toggleBinaryValue = () => {
    const { action } = this.props;
    const previousValue = action.value !== undefined ? action.value : 0;
    const newValue = previousValue === 1 ? 0 : 1;
    this.props.updateActionProperty(this.props.path, 'value', newValue);
    this.props.updateActionProperty(this.props.path, 'evaluate_value', undefined);
  };

  handleNewEvalValue = text => {
    this.props.updateActionProperty(this.props.path, 'value', undefined);
    this.props.updateActionProperty(this.props.path, 'evaluate_value', text);
  };

  getDeviceFeatureControl = () => {
    if (!this.state.deviceFeature) {
      return null;
    }

    if (this.state.computed) {
      return (
        <div>
          <div className={style.explanationText}>
            <Text id="editScene.actionsCard.deviceSetValue.computedExplanationText" />
          </div>
          <div class="input-group">
            <Localizer>
              <TextWithVariablesInjected
                text={
                  this.props.action.value !== undefined
                    ? Number(this.props.action.value).toString()
                    : this.props.action.evaluate_value
                }
                triggersVariables={this.props.triggersVariables}
                actionsGroupsBefore={this.props.actionsGroupsBefore}
                variables={this.props.variables}
                path={this.props.path}
                updateText={this.handleNewEvalValue}
              />
            </Localizer>
            {this.state.deviceFeature.unit && (
              <span class="input-group-append" id="basic-addon2">
                <span class="input-group-text">
                  <Text id={`deviceFeatureUnitShort.${this.state.deviceFeature.unit}`} />
                </span>
              </span>
            )}
          </div>
        </div>
      );
    }

    if (this.state.deviceFeature.type === DEVICE_FEATURE_TYPES.SWITCH.BINARY) {
      return (
        <label class="custom-switch">
          <input
            type="radio"
            name={this.state.deviceFeature.id}
            value="1"
            class="custom-switch-input"
            checked={this.props.action.value === 1}
            onClick={this.toggleBinaryValue}
          />
          <span class="custom-switch-indicator" />
        </label>
      );
    }

    if (this.state.deviceFeature.type === DEVICE_FEATURE_TYPES.LIGHT.COLOR) {
      return <ColorPicker value={this.props.action.value} updateValue={this.handleNewPureValue} />;
    }

    if (
      [DEVICE_FEATURE_TYPES.SHUTTER.STATE, DEVICE_FEATURE_TYPES.CURTAIN.STATE].includes(
        this.state.deviceFeature.type
      ) &&
      [DEVICE_FEATURE_CATEGORIES.SHUTTER, DEVICE_FEATURE_CATEGORIES.CURTAIN].includes(this.state.deviceFeature.category)
    ) {
      return (
        <ShutterButtons
          value={this.props.action.value}
          category={this.state.deviceFeature.category}
          type={this.state.deviceFeature.type}
          updateValue={this.handleNewPureValue}
        />
      );
    }

    if (this.state.deviceFeature.type === DEVICE_FEATURE_TYPES.HEATER.PILOT_WIRE_MODE) {
      return (
        <SelectPilotWireMode
          category={this.state.deviceFeature.category}
          type={this.state.deviceFeature.type}
          updateValue={this.handleNewPureValue}
          value={this.props.action.value}
        />
      );
    }

    return (
      <div>
        <div className={style.explanationText}>
          <Text id="editScene.actionsCard.deviceSetValue.simpleExplanationText" />
        </div>
        <div class="input-group">
          <Localizer>
            <input
              type="text"
              placeholder={<Text id="editScene.actionsCard.deviceSetValue.valueLabel" />}
              class="form-control"
              onChange={this.handleNewValue}
              value={this.props.action.value}
            />
          </Localizer>
          {this.state.deviceFeature.unit && (
            <span class="input-group-append" id="basic-addon2">
              <span class="input-group-text">
                <Text id={`deviceFeatureUnitShort.${this.state.deviceFeature.unit}`} />
              </span>
            </span>
          )}
        </div>

        <input
          type="range"
          value={this.props.action.value}
          onChange={this.handleNewValue}
          class={cx('form-control custom-range', {
            'light-temperature': this.state.deviceFeature.type === DEVICE_FEATURE_TYPES.LIGHT.TEMPERATURE
          })}
          step="1"
          min={this.state.deviceFeature.min}
          max={this.state.deviceFeature.max}
        />
      </div>
    );
  };

  render(props, {}) {
    const { action } = props;
    return (
      <div>
        <div class="form-group">
          <p>
            <Text id="editScene.actionsCard.deviceSetValue.description" />
          </p>
        </div>
        <div class="form-group">
          <label class="form-label">
            <Text id="editScene.actionsCard.deviceSetValue.deviceLabel" />
            <span class="form-required">
              <Text id="global.requiredField" />
            </span>
          </label>
          <SelectDeviceFeature
            exclude_read_only_device_features
            value={action.device_feature}
            onDeviceFeatureChange={this.onDeviceFeatureChange}
          />
        </div>
        <div class="form-group">
          <div className={cx('nav-tabs', style.valueTypeTab)}>
            <span
              class={cx('nav-link', style.valueTypeLink, { active: !this.state.computed })}
              onClick={this.toggleType}
            >
              <Text id="editScene.actionsCard.deviceSetValue.valueTypeSimple" />
            </span>
            <span
              class={cx('nav-link', style.valueTypeLink, { active: this.state.computed })}
              onClick={this.toggleType}
            >
              <Text id="editScene.actionsCard.deviceSetValue.valueTypeComputed" />
            </span>
          </div>
        </div>
        <div class="form-group">{this.getDeviceFeatureControl()}</div>
      </div>
    );
  }
}

export default withIntlAsProp(connect('httpClient', {})(DeviceSetValue));
