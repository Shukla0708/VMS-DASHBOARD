sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "../model/formatter"
], function (Controller, formatter) {
  "use strict";

  return Controller.extend("com.yms.fiori.controller.ActionDetail", {

    formatter: formatter,

    onInit: function () {
      this._oRouter = this.getOwnerComponent().getRouter();

      // selectedAction and selectedVehicle are component-level
      // JSONModels set in VehicleJourney controller on row press.
      // They are available automatically — no extra setup needed.
    },

    onAfterRendering: function () {
      // Debug — log what's in the models so we can verify
      var oActionModel  = this.getOwnerComponent().getModel("selectedAction");
      var oVehicleModel = this.getOwnerComponent().getModel("selectedVehicle");

      if (oActionModel) {
        console.log("selectedAction data:", JSON.stringify(oActionModel.getData(), null, 2));
      } else {
        console.warn("selectedAction model is missing!");
      }

      if (oVehicleModel) {
        console.log("selectedVehicle data:", JSON.stringify(oVehicleModel.getData(), null, 2));
      } else {
        console.warn("selectedVehicle model is missing!");
      }
    },

    onNavBack: function () {
      history.go(-1);
    }

  });
});