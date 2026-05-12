sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/VBox",
  "sap/m/HBox",
  "sap/m/Label",
  "sap/m/Text",
  "sap/m/Title",
  "sap/m/Panel",
  "../model/formatter"
], function (Controller, JSONModel, MessageBox, VBox, HBox, Label, MText, Title, Panel, formatter) {
  "use strict";

  var JOURNEY_STEPS = [
    { key: "ZSOR", label: "_VMSVehicleSalesOrder" },
    { key: "ZIPO", label: "_VMSVehiclePurchaseOrder" },
    { key: "ZIID", label: "_VMSVehicleInboundDelivery" },
    { key: "ZIGR", label: "_VMSVehicleGR" },
    { key: "ZODE", label: "_VMSVehicleDelivery" },
    { key: "ZGOI", label: "_VMSVehicleGI" },
    { key: "ZIIN", label: "_VMSVehicleIncomingInvoice" }
  ];

  return Controller.extend("com.yms.fiori.controller.ActionDetail", {

    formatter: formatter,

    onInit: function () {
      this._oRouter = this.getOwnerComponent().getRouter();


      this._oRouter
        .getRoute("ActionDetail")
        .attachPatternMatched(this._onRouteMatched, this);

    },

    _onRouteMatched: function (oEvent) {
      var sVguid = decodeURIComponent(oEvent.getParameter("arguments").vguid);
      var sActionCode = decodeURIComponent(oEvent.getParameter("arguments").actionCode);

      this._loadActionData(sVguid, sActionCode);
    },

    _loadActionData: function (sVguid, sActionCode) {
      var oView = this.getView();
      var oVehicleModel = this.getOwnerComponent().getModel("vehicleModel");
      var sExpand = this._pathForCode(sActionCode);

      if (!sExpand) {
        var oContainer = this.byId("dynamicActionContainer");
        oContainer.destroyItems();
        return;
      }

      oView.setBusy(true);

      // 1. Build V4 Entity Path
      var sPath = "/ZEBM_C_VMSVEHICLE(" + sVguid + ")";
      var oContextBinding = oVehicleModel.bindContext(sPath, null, {
        $expand: sExpand
      });

      oContextBinding.requestObject().then(function (oData) {
        oView.setBusy(false);

        // // Get the specific expanded object (e.g., _VMSVehicleSalesOrder)
        // var oSpecificData = oData[sExpand][0];

        // // 2. Trigger Dynamic UI Building
        // this._buildDynamicUI(sActionCode, oSpecificData);

        var aHistoryRecords = oData[sExpand];

        if (!Array.isArray(aHistoryRecords) || aHistoryRecords.length === 0) {
          MessageBox.warning("No records found for this action.");
          return;
        }

        // Dynamic Search: Find the record where ANY field ending in 'DocType' matches sActionCode
        var oMatchedRecord = aHistoryRecords.find(function (oRecord) {
          return Object.keys(oRecord).some(function (sKey) {
            return sKey.toLowerCase().includes("doctype") && oRecord[sKey] === sActionCode;
          });
        });

        // Fallback: If no DocType match is found, take the first record
        var oFinalData = oMatchedRecord || aHistoryRecords[0];

        this._buildDynamicUI(sActionCode, oFinalData);

      }.bind(this)).catch(function (oErr) {
        oView.setBusy(false);
        MessageBox.error("Error loading document: " + oErr.message);
      }.bind(this));
    },

    _pathForCode: function (sCode) {
      var m = {
        "ZSOR": "_VMSVehicleSalesOrder",
        "ZIPO": "_VMSVehiclePurchaseOrder",
        "ZIID": "_VMSVehicleDelivery",
        "ZIGR": "_VMSVehicleGR",
        "ZODE": "_VMSVehicleDelivery",
        "ZGOI": "_VMSVehicleGI",
        "ZIIN": "_VMSVehicleIncomingInvoice"
      };
      return m[sCode] || null;
    },

    // Add "sap/ui/layout/Grid" to your sap.ui.define at the top
    // and "Grid" to your function arguments

    _buildDynamicUI: function (sActionCode, oData) {
      var oContainer = this.byId("dynamicActionContainer");
      oContainer.destroyItems();

      if (!oData) {
        oContainer.addItem(new MText({ text: "No data returned from backend." }));
        return;
      }

      // 1. Create a Responsive Grid
      var oGrid = new sap.ui.layout.Grid({
        defaultSpan: "L4 M6 S12" // 3 columns on Desktop, 2 on Tablet, 1 on Mobile
        // hSpacing: 1,
        // vSpacing: 1,
      }).addStyleClass("sapUiSmallMargin");

      // 2. Loop through every key in the OData object
      Object.keys(oData).forEach(function (sKey) {
        var vValue = oData[sKey];

        // 3. Filtering Logic
        // Skip metadata fields, internal GUIDs, or empty values
        if (sKey.startsWith("__") || sKey.startsWith("@") || sKey.includes("UUID") || !vValue || vValue === "") {
          return;
        }

        // 4. Clean up the label (e.g., "SalesOrderDate" -> "Sales Order Date")
        var sLabel = this._prettifyLabel(sKey);

        // 5. Add to Grid
        oGrid.addContent(this._createField(sLabel, vValue));
      }.bind(this));

      // 6. Wrap Grid in a Panel
      var oPanel = new Panel({
        headerText: "Document Details: " + sActionCode,
        width: "100%",
        content: [oGrid],
        expandable : true
      }).addStyleClass("sapUiSmallMarginBottom");

      oContainer.addItem(oPanel);
    },

    // New Helper to make technical keys readable
    _prettifyLabel: function (sKey) {
      // Adds a space before capital letters and capitalizes the start
      // Example: "NetAmount" -> "Net Amount"
      var sResult = sKey.replace(/([A-Z])/g, ' $1').trim();
      return sResult.charAt(0).toUpperCase() + sResult.slice(1);
    },

    _createField: function (sLabel, sValue) {
      // If the value is a date string, format it
      var sDisplayValue = sValue;
      if (typeof sValue === "string" && sValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        sDisplayValue = this.formatter.formatODataDateTime(sValue);
      }

      return new VBox({
        items: [
          new Label({ text: sLabel, design: "Bold" }),
          new MText({ text: sDisplayValue || "—" })
        ]
      }).addStyleClass("sapUiSmallMarginBottom");
    },

    onAfterRendering: function () {
      // Debug — log what's in the models so we can verify
      var oActionModel = this.getOwnerComponent().getModel("selectedAction");
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