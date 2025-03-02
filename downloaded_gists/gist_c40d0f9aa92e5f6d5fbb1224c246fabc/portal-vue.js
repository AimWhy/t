import Vue from 'vue';

function freeze(item) {
  return Array.isArray(item) || typeof item === 'object'
    ? Object.freeze(item)
    : item;
}

function stableSort(array, compareFn) {
  return array
    .map(function(v, idx) {
      return [idx, v];
    })
    .sort(function(a, b) {
      return compareFn(a[1], b[1]) || a[0] - b[0];
    })
    .map(function(c) {
      return c[1];
    });
}

function pick(obj, keys) {
  return keys.reduce(function(acc, key) {
    if (obj.hasOwnProperty(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

var Wormhole = Vue.extend({
  data: function data() {
    return {
      transports: {},
      targets: {},
      sources: {}
    };
  },
  methods: {
    open: function open(transport) {
      var to = transport.to;
      var from = transport.from;
      var passengers = transport.passengers;
      var order = transport.order || Infinity;

      if (!to || !from || !passengers) return;

      var newTransport = {
        to: to,
        from: from,
        passengers: freeze(passengers),
        order: order
      };
      var keys = Object.keys(this.transports);

      if (keys.indexOf(to) === -1) {
        Vue.set(this.transports, to, []);
      }

      // Copying the array here so that the PortalTarget change event will actually contain two distinct arrays
      var currentIndex = this._getTransportIndex(newTransport);
      var newTransports = this.transports[to].slice(0);

      if (currentIndex === -1) {
        newTransports.push(newTransport);
      } else {
        newTransports[currentIndex] = newTransport;
      }

      this.transports[to] = stableSort(newTransports, function(a, b) {
        return a.order - b.order;
      });
    },
    close: function close(transport, force = false) {
      var to = transport.to;
      var from = transport.from;

      if (!to || !this.transports[to] || (!from && force === false)) {
        return;
      }

      if (force) {
        this.transports[to] = [];
      } else {
        var index = this._getTransportIndex(transport);

        if (index > -1) {
          // Copying the array here so that the PortalTarget change event will actually contain two distinct arrays
          var newTransports = this.transports[to].slice(0);
          newTransports.splice(index, 1);
          this.transports[to] = newTransports;
        }
      }
    },
    registerTarget: function registerTarget(target, vm, force) {
      if (!force && this.targets[target]) {
        console.warn(`[portal-vue]: Target '${target}' already exists`);
      }
      this.$set(this.targets, target, Object.freeze([vm]));
    },
    unregisterTarget: function unregisterTarget(target) {
      this.$delete(this.targets, target);
    },
    registerSource: function registerSource(source, vm, force) {
      if (!force && this.sources[source]) {
        console.warn(`[portal-vue]: source '${source}' already exists`);
      }
      this.$set(this.sources, source, Object.freeze([vm]));
    },
    unregisterSource: function unregisterSource(source) {
      this.$delete(this.sources, source);
    },
    hasTarget: function hasTarget(to) {
      return !!(this.targets[to] && this.targets[to][0]);
    },
    hasSource: function hasSource(to) {
      return !!(this.sources[to] && this.sources[to][0]);
    },
    hasContentFor: function hasContentFor(to) {
      return !!this.transports[to] && !!this.transports[to].length;
    },
    _getTransportIndex: function _getTransportIndex(_ref) {
      return this.transports[_ref.to].findIndex(item => item.from === _ref.from);
    }
  }
});
var wormhole = new Wormhole();

var _id = 1;
var Portal = Vue.extend({
  name: 'portal',
  props: {
    disabled: {
      type: Boolean
    },
    name: {
      type: String,
      default: () => String(_id++)
    },
    order: {
      type: Number
    },
    slim: {
      type: Boolean
    },
    slotProps: {
      type: Object,
      default: () => ({})
    },
    tag: {
      type: String,
      default: 'DIV'
    },
    to: {
      type: String,
      default: () => String(Math.round(Math.random() * 10000000))
    }
  },
  created: function created() {
    this.$nextTick(function() {
      wormhole.registerSource(this.name, this);
    });
  },
  mounted: function mounted() {
    if (!this.disabled) {
      this.sendUpdate();
    }
  },
  updated: function updated() {
    if (this.disabled) {
      this.clear();
    } else {
      this.sendUpdate();
    }
  },
  beforeDestroy: function beforeDestroy() {
    wormhole.unregisterSource(this.name);
    this.clear();
  },
  watch: {
    to: function to(newValue, oldValue) {
      if (oldValue && oldValue !== newValue) {
        this.clear(oldValue);
      }
      this.sendUpdate();
    }
  },
  methods: {
    clear: function clear(target) {
      var closer = {
        from: this.name,
        to: target || this.to
      };
      wormhole.close(closer);
    },
    normalizeSlots: function normalizeSlots() {
      return this.$scopedSlots.default
        ? [this.$scopedSlots.default]
        : this.$slots.default;
    },
    normalizeOwnChildren: function normalizeOwnChildren(children) {
      return typeof children === 'function'
        ? children(this.slotProps)
        : children;
    },
    sendUpdate: function sendUpdate() {
      var slotContent = this.normalizeSlots();

      if (slotContent) {
        var transport = {
          from: this.name,
          to: this.to,
          passengers: Array.prototype.slice.call(slotContent, 0),
          order: this.order
        };
        wormhole.open(transport);
      } else {
        this.clear();
      }
    }
  },
  render: function render(h) {
    var children = this.$slots.default || this.$scopedSlots.default || [];
    var Tag = this.tag;

    if (children && this.disabled) {
      return children.length <= 1 && this.slim
        ? this.normalizeOwnChildren(children)[0]
        : h(Tag, [this.normalizeOwnChildren(children)]);
    }
    return this.slim
      ? h()
      : h(Tag, {
        class: {
          'v-portal': true
        },
        style: {
          display: 'none'
        },
        key: 'v-portal-placeholder'
      });
  }
});

var PortalTarget = Vue.extend({
  name: 'portalTarget',
  props: {
    multiple: {
      type: Boolean
    },
    name: {
      type: String,
      required: true
    },
    slim: {
      type: Boolean
    },
    slotProps: {
      type: Object,
      default: () => ({})
    },
    tag: {
      type: String,
      default: 'div'
    },
    transition: {
      type: [String, Object, Function]
    }
  },
  data: function data() {
    return {
      transports: wormhole.transports,
      firstRender: true
    };
  },
  computed: {
    ownTransports: function ownTransports() {
      var transports = this.transports[this.name] || [];

      if (this.multiple) {
        return transports;
      }

      return transports.length === 0 ? [] : [transports[transports.length - 1]];
    },
    passengers: function passengers() {
      return this.ownTransports.reduce((passengers, transport) => {
        var temp = transport.passengers[0];
        var newPassengers =
          typeof temp === 'function'
            ? temp(this.slotProps)
            : transport.passengers;
        return passengers.concat(newPassengers);
      }, []);
    }
  },
  watch: {
    ownTransports: function ownTransports() {
      this.$emit('change', this.children().length > 0);
    },
    name: function name(newVal, oldVal) {
      wormhole.unregisterTarget(oldVal);
      wormhole.registerTarget(newVal, this);
    }
  },
  methods: {
    // can't be a computed prop because it has to "react" to $slot changes.
    children: function children() {
      return this.passengers.length !== 0
        ? this.passengers
        : this.$scopedSlots.default
          ? this.$scopedSlots.default(this.slotProps)
          : this.$slots.default || [];
    },
    // can't be a computed prop because it has to "react" to this.children().
    noWrapper: function noWrapper() {
      var noWrapper = this.slim && !this.transition;

      if (noWrapper && this.children().length > 1) {
        console.warn(
          '[portal-vue]: PortalTarget with `slim` option received more than one child element.'
        );
      }

      return noWrapper;
    }
  },
  created: function created() {
    this.$nextTick(function() {
      wormhole.registerTarget(this.name, this);
    });
  },
  mounted: function mounted() {
    if (this.transition) {
      this.$nextTick(function() {
        // only when we have a transition, because it causes a re-render
        this.firstRender = false;
      });
    }
  },
  beforeDestroy: function beforeDestroy() {
    wormhole.unregisterTarget(this.name);
  },
  render: function render(h) {
    var noWrapper = this.noWrapper();
    var children = this.children();
    var Tag = this.transition || this.tag;
    return noWrapper
      ? children[0]
      : this.slim && !Tag
        ? h()
        : h(
          Tag,
          {
            props: {
              // if we have a transition component, pass the tag if it exists
              tag: this.transition && this.tag ? this.tag : undefined
            },
            class: {
              'vue-portal-target': true
            }
          },
          children
        );
  }
});

var _id$1 = 0;
var portalProps = [
  'disabled',
  'name',
  'order',
  'slim',
  'slotProps',
  'tag',
  'to'
];
var targetProps = ['multiple', 'transition'];
var MountingPortal = Vue.extend({
  name: 'MountingPortal',
  inheritAttrs: false,
  props: {
    append: {
      type: [Boolean, String]
    },
    bail: {
      type: Boolean
    },
    mountTo: {
      type: String,
      required: true
    },
    // Portal
    disabled: {
      type: Boolean
    },
    name: {
      // name for the portal
      type: String,
      default: function _default() {
        return 'mounted_' + String(_id$1++);
      }
    },
    order: {
      type: Number,
      default: 0
    },
    slim: {
      type: Boolean
    },
    slotProps: {
      type: Object,
      default: function _default() {
        return {};
      }
    },
    tag: {
      type: String,
      default: 'DIV'
    },
    to: {
      // name for the target
      type: String,
      default: function _default() {
        return String(Math.round(Math.random() * 10000000));
      }
    },
    // Target
    multiple: {
      type: Boolean,
      default: false
    },
    targetSlim: {
      type: Boolean
    },
    targetSlotProps: {
      type: Object,
      default: () => ({})
    },
    targetTag: {
      type: String,
      default: 'div'
    },
    transition: {
      type: [String, Object, Function]
    }
  },
  created: function created() {
    if (typeof document === 'undefined') {
      return;
    }
    var el = document.querySelector(this.mountTo);

    if (!el) {
      console.error(
        `[portal-vue]: Mount Point '${this.mountTo}' not found in document`
      );
      return;
    }

    var props = this.$props; // Target already exists

    if (wormhole.targets[props.name]) {
      if (props.bail) {
        console.warn(
          `[portal-vue]: Target '${props.name}' is already mounted.
          Aborting because 'bail: true' is set`
        );
      } else {
        this.portalTarget = wormhole.targets[props.name];
      }
      return;
    }

    var append = props.append;

    if (append) {
      var type = typeof append === 'string' ? append : 'DIV';
      var mountEl = document.createElement(type);
      el.appendChild(mountEl);
      el = mountEl;
    }

    // get props for target from $props
    // we have to rename a few of them
    var _props = pick(this.$props, targetProps);

    _props.slim = this.targetSlim;
    _props.tag = this.targetTag;
    _props.slotProps = this.targetSlotProps;
    _props.name = this.to;
    this.portalTarget = new PortalTarget({
      el: el,
      parent: this.$parent || this,
      propsData: _props
    });
  },
  beforeDestroy: function beforeDestroy() {
    var target = this.portalTarget;
    if (this.append) {
      var el = target.$el;
      el.parentNode.removeChild(el);
    }
    target.$destroy();
  },
  render: function render(h) {
    if (!this.portalTarget) {
      console.warn("[portal-vue] Target wasn't mounted");
      return h();
    }

    // if there's no "manual" scoped slot, so we create a <Portal> ourselves
    if (!this.$scopedSlots.manual) {
      var props = pick(this.$props, portalProps);
      return h(
        Portal,
        {
          props: props,
          attrs: this.$attrs,
          on: this.$listeners,
          scopedSlots: this.$scopedSlots
        },
        this.$slots.default
      );
    }

    // else, we render the scoped slot
    var content = this.$scopedSlots.manual({ to: this.to });

    // if user used <template> for the scoped slot
    // content will be an array
    if (Array.isArray(content)) {
      content = content[0];
    }

    return !content ? h() : content;
  }
});

function install(Vue$$1, options = {}) {
  Vue$$1.component(options.portalName || 'Portal', Portal);
  Vue$$1.component(options.portalTargetName || 'PortalTarget', PortalTarget);
  Vue$$1.component(
    options.MountingPortalName || 'MountingPortal',
    MountingPortal
  );
}

var index = {
  install: install
};

export default index;
export { Portal, PortalTarget, MountingPortal, wormhole as Wormhole };
