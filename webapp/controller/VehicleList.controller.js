sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "../model/formatter"
], function (Controller, JSONModel, MessageToast, MessageBox, formatter) {
  "use strict";

  return Controller.extend("com.yms.fiori.controller.VehicleList", {

    formatter: formatter,

    // ─── Lifecycle ────────────────────────────────────────────────
    onInit: function () {
      this._oRouter = this.getOwnerComponent().getRouter();

      // Local view model
      var oViewModel = new JSONModel({
        pageTitle: "Vehicles",
        manifestNo: "",
        vehicles: [],
        totalCount: 0
      });
      this.getView().setModel(oViewModel, "viewModel");

      // Register route match
      this._oRouter
        .getRoute("VehicleList")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    // ─── Route matched ────────────────────────────────────────────
    _onRouteMatched: function (oEvent) {
      var sManifestNo = decodeURIComponent(oEvent.getParameter("arguments").manifestNo);
      var oViewModel = this.getView().getModel("viewModel");

      oViewModel.setProperty("/manifestNo", sManifestNo);
      oViewModel.setProperty("/pageTitle", "Vehicles — " + sManifestNo);

      this._loadVehicles(sManifestNo);
    },

    // ─── Load vehicles via OData ──────────────────────────────────
    // Reads ZVM_MANIFEST_DETAIL filtered by zzmanifest_no
    // Only projects: zzunit_no, vguid, credat, cretim
    _loadVehicles: function (sManifestNo) {
      var oModel = this.getView().getModel();
      var oViewModel = this.getView().getModel("viewModel");
      var oTable = this.byId("vehicleTable");

      oTable.setBusy(true);

      // Navigate via association from ManifestHeader to _Vehicles
      var sPath = "/ManifestHeader(zzmanifest_no='" + sManifestNo + "')/_Vehicles";

      oModel.bindList(sPath, null, [], [], {
        $select: "zzunit_no,vguid,credat,cretim"
      }).requestContexts(0, 999).then(function (aContexts) {

        var aVehicles = aContexts.map(function (oCtx) {
          return oCtx.getObject();
        });

        oViewModel.setProperty("/vehicles", aVehicles);
        oViewModel.setProperty("/totalCount", aVehicles.length);
        this.byId("vehicleCountText").setText(aVehicles.length + " vehicle(s)");
        oTable.setBusy(false);

      }.bind(this)).catch(function (oErr) {
        oTable.setBusy(false);
        sap.m.MessageBox.error("Failed to load vehicles: " + oErr.message);
      });
    },

    // ─── Vehicle row press → VehicleJourney ──────────────────────
    onVehiclePress: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext("viewModel");
      var oVehicle = oCtx.getObject();
      var sManifestNo = this.getView().getModel("viewModel").getProperty("/manifestNo");

      // Store selected vehicle in component model for journey page
      this.getOwnerComponent().getModel("selectedVehicle") ||
        this.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel(), "selectedVehicle");
      this.getOwnerComponent().getModel("selectedVehicle").setData(oVehicle);

      this._oRouter.navTo("VehicleJourney", {
        manifestNo: encodeURIComponent(sManifestNo),
        vguid: encodeURIComponent(oVehicle.vguid)
      });
    },

    // ─── Back navigation ──────────────────────────────────────────
    onNavBack: function () {
      this._oRouter.navTo("ManifestList", {}, true);
    }

  });
});
