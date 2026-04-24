sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/ui/core/Icon",
  "sap/m/HBox",
  "sap/m/VBox",
  "sap/m/Text",
  "../model/formatter"
], function (
  Controller, JSONModel, MessageBox,
  CoreIcon, HBox, VBox, MText, formatter
) {
  "use strict";

  // ── Real VMS action steps in order from your API data ─────────
  var JOURNEY_STEPS = [
    { key: "ZCRE",  label: "Create Unit"            },
    { key: "ZVIN",  label: "Assign VIN"             },
    { key: "ZCEQ",  label: "Equipment Assign"       },
    { key: "ZSOR",  label: "Sales Order"            },
    { key: "ZIPO",  label: "IC PO Assign"           },
    { key: "ZIID",  label: "IC Inbound Delivery"    },
    { key: "ZIGR",  label: "IC Goods Receipt"       },
    { key: "ZODE",  label: "Outbound Delivery"      },
    { key: "ZGOI",  label: "Goods Issue"            },
    { key: "ZIIN",  label: "IC Inbound Invoice"     }
  ];

  return Controller.extend("com.yms.fiori.controller.VehicleJourney", {

    formatter: formatter,

    onInit: function () {
      this._oRouter = this.getOwnerComponent().getRouter();

      this.getView().setModel(new JSONModel({
        pageTitle:     "Vehicle Journey",
        progressPct:   0,
        progressLabel: "0 of 0 steps",
        progressState: "None",
        actions:       []
      }), "journeyModel");

      this._oRouter
        .getRoute("VehicleJourney")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      var sVguid       = decodeURIComponent(oEvent.getParameter("arguments").vguid);
      var oVehicleData = this.getOwnerComponent().getModel("selectedVehicle")
                          ? this.getOwnerComponent().getModel("selectedVehicle").getData() : {};

      this.getView().getModel("journeyModel").setProperty(
        "/pageTitle", "Journey — " + (oVehicleData.zzunit_no || sVguid)
      );
      this._loadVehicleActivities(sVguid);
    },

    // ─── OData V2 call ────────────────────────────────────────────
    _loadVehicleActivities: function (sVguid) {
      var oView         = this.getView();
      var oVehicleModel = this.getOwnerComponent().getModel("vehicleModel");

      oView.setBusy(true);

      oVehicleModel.read("/A_VMSVehicle(guid'" + sVguid + "')", {
        urlParameters: { "$expand": "to_VMSVehicleHistory" },
        success: function (oData) {
          oView.setBusy(false);

          // Merge vehicle header into selectedVehicle model
          var oSelModel = this.getOwnerComponent().getModel("selectedVehicle");
          if (!oSelModel) {
            oSelModel = new JSONModel();
            this.getOwnerComponent().setModel(oSelModel, "selectedVehicle");
          }
          oSelModel.setData(Object.assign({}, oSelModel.getData() || {}, {
            VMSVehicleExternalID:              oData.VMSVehicleExternalID,
            VMSVehicleInternalID:              oData.VMSVehicleInternalID,
            Material:                          oData.Material,
            Equipment:                         oData.Equipment,
            Plant:                             oData.Plant,
            PlantName:                         oData.PlantName,
            VMSVehiclePrimaryStatus_Text:      oData.VMSVehiclePrimaryStatus_Text,
            VMSVehicleSecondaryStatus_Text:    oData.VMSVehicleSecondaryStatus_Text,
            VMSVehicleLocation_Text:           oData.VMSVehicleLocation_Text,
            VMSVehicleAvailabilityStatus_Text: oData.VMSVehicleAvailabilityStatus_Text,
            ConfigurationNumber:               oData.ConfigurationNumber
          }));

          var aHistory = (oData.to_VMSVehicleHistory && oData.to_VMSVehicleHistory.results)
                        ? oData.to_VMSVehicleHistory.results : [];

          this._processActivities(aHistory);
        }.bind(this),

        error: function (oErr) {
          oView.setBusy(false);
          MessageBox.warning("Could not load vehicle history.\n" + (oErr.message || ""));
          this._processActivities([]);
        }.bind(this)
      });
    },

    // ─── Transform history records → view model ───────────────────
    _processActivities: function (aRaw) {
      var oJourneyModel = this.getView().getModel("journeyModel");

      // Sort oldest → newest
      aRaw.sort(function (a, b) {
        return new Date(a.VMSVehicleActionDateTime) - new Date(b.VMSVehicleActionDateTime);
      });

      // Map of action code → latest record (for progress chips)
      var oPerformedMap = {};
      aRaw.forEach(function (o) { oPerformedMap[o.VMSVehicleAction] = o; });

      // Build display list — every history entry shows as one row
      var aActions = aRaw.map(function (o) {
        return {
          actionCode:   o.VMSVehicleAction,
          actionText:   o.VMSVehicleAction_Text             || o.VMSVehicleAction,
          timestamp:    formatter.formatODataDateTime(o.VMSVehicleActionDateTime),
          location:     o.VMSVehicleLocation_Text           || o.VMSVehicleLocation || "—",
          performedBy:  o.CreatedByUserName                 || "—",
          oldStatus:    o.VMSVehicleOldPrimaryStatus_Text   || "—",
          newStatus:    o.VMSVehicleNewPrimaryStatus_Text   || "—",
          oldSecStatus: o.VMSVehicleOldSecondaryStatus_Text || "—",
          newSecStatus: o.VMSVehicleNewSecondaryStatus_Text || "—",
          docType:      o.VMSVehicleActionDocType           || "—",
          configNo:     o.ConfigurationNumber               || "—",
          customer:     o.VMSVehicleCustomer                || "—",
          logicalSystem:o.LogicalSystem                     || "—",
          statusText:   "Completed",
          statusState:  "Success",
          icon:         this._iconForCode(o.VMSVehicleAction),
          iconBg:       "#f1fdf6",
          _raw:         o
        };
      }.bind(this));

      oJourneyModel.setProperty("/actions", aActions);

      // ── Progress ──────────────────────────────────────────────
      var iDone  = JOURNEY_STEPS.filter(function (s) { return !!oPerformedMap[s.key]; }).length;
      var iTotal = JOURNEY_STEPS.length;
      var iPct   = iTotal > 0 ? Math.round((iDone / iTotal) * 100) : 0;

      oJourneyModel.setProperty("/progressPct",   iPct);
      oJourneyModel.setProperty("/progressLabel", iDone + " of " + iTotal + " steps completed (" + iPct + "%)");
      oJourneyModel.setProperty("/progressState", iPct === 100 ? "Success" : "None");

      this._renderStepChips(oPerformedMap);
    },

    // ─── Render step chips: green tick = done, grey = pending ─────
    _renderStepChips: function (oPerformedMap) {
      var oBox = this.byId("stepChipsBox");
      if (!oBox) { return; }
      oBox.destroyItems();

      JOURNEY_STEPS.forEach(function (oStep) {
        var oRecord = oPerformedMap[oStep.key];
        var bDone   = !!oRecord;

        var oChip = new HBox({ alignItems: "Center" })
          .addStyleClass("sapUiTinyMarginEnd sapUiTinyMarginBottom")
          .addStyleClass(bDone ? "ymsDoneChip" : "ymsPendingChip");

        var oIcon = new CoreIcon({
          src:   bDone ? "sap-icon://accept" : "sap-icon://circle-task",
          color: bDone ? "#107e3e"           : "#8c8c8c",
          size:  "0.85rem"
        }).addStyleClass("sapUiTinyMarginEnd");

        var oInner = new VBox();

        // Step label
        oInner.addItem(
          new MText({ text: oStep.label }).addStyleClass("sapUiSmallFont")
        );

        // If done → show new status underneath in muted text
        if (bDone && oRecord.VMSVehicleNewPrimaryStatus_Text) {
          oInner.addItem(
            new MText({ text: oRecord.VMSVehicleNewPrimaryStatus_Text })
              .addStyleClass("sapUiSmallFont sapUiSmallMarginTop")
          );
        }

        oChip.addItem(oIcon);
        oChip.addItem(oInner);
        oBox.addItem(oChip);
      });
    },

    // ─── Icon map ─────────────────────────────────────────────────
    _iconForCode: function (sCode) {
      var m = {
        "ZCRE": "sap-icon://add-equipment",
        "ZVIN": "sap-icon://key",
        "ZCEQ": "sap-icon://wrench",
        "ZSOR": "sap-icon://sales-order",
        "ZIPO": "sap-icon://order-status",
        "ZIID": "sap-icon://inventory",
        "ZIGR": "sap-icon://shelf",
        "ZODE": "sap-icon://shipping-status",
        "ZGOI": "sap-icon://negative",
        "ZIIN": "sap-icon://customer-financial-fact-sheet"
      };
      return m[sCode] || "sap-icon://activity-items";
    },

    // ─── Action row press → ActionDetail ─────────────────────────
    onActionPress: function (oEvent) {
      var oCtx    = oEvent.getSource().getBindingContext("journeyModel");
      var oAction = oCtx.getObject();
      var iIdx    = oCtx.getPath().split("/").pop();

      var oActionModel = this.getOwnerComponent().getModel("selectedAction");
      if (!oActionModel) {
        oActionModel = new JSONModel();
        this.getOwnerComponent().setModel(oActionModel, "selectedAction");
      }
      oActionModel.setData(oAction);

      var sHash       = window.location.hash.replace("#", "");
      var aParts      = sHash.split("/");
      var sManifestNo = aParts[1] ? decodeURIComponent(aParts[1]) : "X";
      var sVguid      = aParts[3] ? decodeURIComponent(aParts[3]) : "X";

      this._oRouter.navTo("ActionDetail", {
        manifestNo: encodeURIComponent(sManifestNo),
        vguid:      encodeURIComponent(sVguid),
        actionId:   iIdx
      });
    },

    onNavBack: function () { history.go(-1); }

  });
});
