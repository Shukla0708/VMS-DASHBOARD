sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
  "use strict";

  return UIComponent.extend("com.yms.fiori.Component", {

    metadata: {
      manifest: "json"
    },

    init: function () {
      // Call parent init FIRST
      UIComponent.prototype.init.apply(this, arguments);

      // Device model
      var oDeviceModel = new JSONModel(Device);
      oDeviceModel.setDefaultBindingMode("OneWay");
      this.setModel(oDeviceModel, "device");

      // Initialize router
      this.getRouter().initialize();
    },

    destroy: function () {
      UIComponent.prototype.destroy.apply(this, arguments);
    }
    
  });
});
