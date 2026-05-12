sap.ui.define([], function () {
  "use strict";

  return {

    // ─── ABAP date (YYYYMMDD) → "DD MMM YYYY" ────────────────────
    formatDate: function (sAbapDate) {
      if (!sAbapDate || sAbapDate === "0000000000") { return "—"; }
      // ABAP date: "20250421"
      var sY = sAbapDate.substring(0, 4);
      var sM = sAbapDate.substring(5, 7);
      var sD = sAbapDate.substring(8, 10);
      try {
        var oDate = new Date(sY + "-" + sM + "-" + sD);
        return oDate.toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric"
        });
      } catch (e) { return sAbapDate; }
    },

    // ─── ABAP time (HHMMSS) → "HH:MM" ────────────────────────────
    formatTime: function (sAbapTime) {
      if (!sAbapTime || sAbapTime === "000000") { return "—"; }
      var sH = sAbapTime.substring(0, 2);
      var sM = sAbapTime.substring(2, 4);
      return sH + ":" + sM;
    },

    // ─── OData V2 /Date(ms)/ → locale datetime string ─────────────
    formatODataDateTime: function (sODataDate) {
      if (!sODataDate) { return "—"; }
      // Handle /Date(1745199000000)/
      var oMatch = /\/Date\((\d+)(?:[+-]\d+)?\)\//.exec(sODataDate);
      if (oMatch) {
        var oDate = new Date(parseInt(oMatch[1], 10));
        return oDate.toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        });
      }
      // ISO string fallback
      try {
        return new Date(sODataDate).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        });
      } catch (e) { return sODataDate; }
    },

    // ─── Progress pct → sap.ui.core.ValueState ────────────────────
    progressToState: function (iPct) {
      if (iPct === 100) { return "Success"; }
      if (iPct > 0) { return "None"; }
      return "None";
    },

    formatStatusTransition: function (sOld, sNew) {
      if (!sOld || sOld === "—") { return sNew || ""; }
      if (!sNew || sNew === "—") { return sOld || ""; }
      return sOld + "  →  " + sNew;
    },
    
    formatCurrency: function (fAmount, sCurrency) {
      if (fAmount == null || sCurrency == null) { return "—"; }
      try {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: sCurrency,
          minimumFractionDigits: 2
        }).format(fAmount);
      } catch (e) {
        return fAmount + " " + sCurrency;
      }   

    },

  };
});
