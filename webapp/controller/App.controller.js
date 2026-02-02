sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
], function (Controller, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {
		onInit : function () {
			var oJSONData = {
					busy : false
				},
				oModel = new JSONModel(oJSONData);

			this.getView().setModel(oModel, "appView");
		},
    onRefresh : function () {
      var oBinding = this.byId("peopleList").getBinding("items");

      if (oBinding.hasPendingChanges()) {
        MessageBox.error(this._getText("refreshNotPossibleMessage"));
        return;
      }
      oBinding.refresh();
      MessageToast.show(this._getText("refreshSuccessMessage"));
    },

    getText : function (sTextId, aArgs) {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);

    }
	});
});


/*
Step 2
 Aggiungiamo il gestore eventi 'onRefresh' al controller. 
 * In questo metodo, recuperiamo il data binding corrente della tabella 'peopleList'. 
 * Se il binding presenta modifiche non salvate (unsaved changes), visualizziamo un messaggio di errore tramite MessageBox. 
 * In caso contrario, chiamiamo il metodo refresh() per aggiornare i dati dal server e visualizziamo un messaggio di successo con MessageToast.
 */