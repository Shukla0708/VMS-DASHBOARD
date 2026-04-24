sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast"
], function (Controller, Filter, FilterOperator, MessageToast) {
  "use strict";

  return Controller.extend("com.yms.fiori.controller.ManifestList", {

    onInit: function () {
      this._oRouter = this.getOwnerComponent().getRouter();
    },

    // ← moved here from onInit
    onAfterRendering: function () {
      var oBinding = this.byId("manifestTable").getBinding("items");
      if (oBinding) {
        oBinding.attachDataReceived(this._updateCount, this);
      }
    },

    onSearch: function () {
      var sQuery   = this.byId("manifestSearch").getValue().trim();
      var oBinding = this.byId("manifestTable").getBinding("items");
      var aFilters = [];
      if (sQuery) {
        aFilters.push(new Filter("zzmanifest_no", FilterOperator.Contains, sQuery));
      }
      oBinding.filter(aFilters);
    },

    onRefresh: function () {
      this.byId("manifestTable").getBinding("items").refresh();
      MessageToast.show("Refreshed");
    },

    onManifestPress: function (oEvent) {
      var oItem = oEvent.getSource();
      var oCtx  = oItem.getBindingContext
                ? oItem.getBindingContext()
                : oItem.getParent().getBindingContext();
      if (!oCtx) return;

      var sManifestNo = oCtx.getProperty("zzmanifest_no");
      this._oRouter.navTo("VehicleList", {
        manifestNo: encodeURIComponent(sManifestNo)
      });
    },

    _updateCount: function () {
      var oBinding = this.byId("manifestTable").getBinding("items");
      var iCount   = oBinding ? oBinding.getLength() : 0;
      this.byId("manifestCountText").setText(iCount + " manifest(s)");
    }

  });
});