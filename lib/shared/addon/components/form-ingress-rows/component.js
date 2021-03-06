import { get, set, computed, observer } from '@ember/object'
import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import C from 'shared/utils/constants';
import { alias } from '@ember/object/computed';

export default Component.extend({
  settings:                       service(),
  capabilities:                   service(),

  layout,

  mode: 'automatic',

  rule:                           null,
  rules:                          null,
  ingress:                        null,
  editing:                        true,
  existingHost:                   null,
  selectedProvider:               null,
  ingressControllersCapabilities: alias('capabilities.ingressCapabilities.ingressControllersCapabilities'),
  defaultProvider:                alias('capabilities.ingressCapabilities.defaultIngressProvider'),
  defaultBackend:                 alias('ingress.defaultBackend'),

  init() {
    this._super(...arguments);

    const xip  = get(this, `settings.${ C.SETTING.INGRESS_IP_DOMAIN }`);
    const host = get(this, 'rule.host');

    if (get(this, 'rule.defaultBackend')) {
      set(this, 'mode', 'default');
    } else if ( host && host === xip ) {
      set(this, 'mode', 'automatic');
    } else if ( !get(this, 'rule.new') ) {
      set(this, 'mode', 'existing');
      set(this, 'existingHost', host);
    }

    this.modeChanged();

    if (get(this, 'ingressControllersCapabilities.length') >= 1) {
      set(this, 'selectedProvider', get(this, 'ingressControllersCapabilities.firstObject.ingressProvider'));
    }
  },

  actions: {
    removeRule(rule) {
      if (this.removeRule) {
        this.removeRule(rule);
      }

      if ( rule.defaultBackend ) {
        set(this, 'ingress.defaultBackend', null);
      }
    },
  },

  modeChanged: observer('mode', function() {
    const {
      mode, rule, defaultBackend
    } = this;

    if ( mode === 'default' && !get(this, 'rule.defaultBackend') ) {
      set(rule, 'defaultBackend', true);
    } else if ( mode !== 'default' && defaultBackend && get(this, 'rule.defaultBackend') ){
      set(rule, 'defaultBackend', false);
      set(this, 'ingress.defaultBackend', null);
    }

    const xip          = get(this, `settings.${ C.SETTING.INGRESS_IP_DOMAIN }`);
    const existingHost = get(this, 'existingHost');

    switch (mode) {
    case 'automatic':
      set(rule, 'host', xip);
      break;
    case 'existing':
      set(rule, 'host', existingHost);
      break;
    default:
      if ( get(rule, 'host') === xip ) {
        set(rule, 'host', existingHost || '');
      }
      break;
    }
  }),

  isDefault: computed('mode', function() {
    return get(this, 'mode') === 'default';
  }),

  defaultDisabled: computed('ingress.defaultBackend', 'rule.defaultBackend', 'rules.@each.defaultBackend', function() {
    const { ingressControllersCapabilities, selectedProvider } = this;

    const def = get(this, 'ingress.defaultBackend');
    const me  = get(this, 'rule.defaultBackend');
    const cap = ingressControllersCapabilities.length >= 1 ? ingressControllersCapabilities.findBy('ingressProvider', selectedProvider) : null;

    // if we dont have capabilities at all we don't want to disable to ability to use the default backend
    var customDefaultBackend = true;

    if (cap !== null) {
      customDefaultBackend = get(cap, 'customDefaultBackend');
    }

    return ( !!def && !me ) || !customDefaultBackend;
  }),

});
