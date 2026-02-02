sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
  "sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
], function (Controller, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {
		onInit : function () {
			var oJSONData = {
					busy : false,
				  order : 0
				},
				oModel = new JSONModel(oJSONData);

			this.getView().setModel(oModel, "appView");
		},

    onSearch : function () {
			var oView = this.getView(),
				sValue = oView.byId("searchField").getValue(),
				oFilter = new Filter("LastName", FilterOperator.Contains, sValue);

			oView.byId("peopleList").getBinding("items").filter(oFilter, FilterType.Application);
		},

		onSort : function () {
			var oView = this.getView(),
				aStates = [undefined, "asc", "desc"],
				aStateTextIds = ["sortNone", "sortAscending", "sortDescending"],
				sMessage,
				iOrder = oView.getModel("appView").getProperty("/order");

			iOrder = (iOrder + 1) % aStates.length;
			var sOrder = aStates[iOrder];

			oView.getModel("appView").setProperty("/order", iOrder);
			oView.byId("peopleList").getBinding("items").sort(sOrder && new Sorter("LastName", sOrder === "desc"));

			sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]);
			MessageToast.show(sMessage);
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

 /* 
 Step 4
 * Implementazione dei gestori eventi 'onSearch' e 'onSort'.
 * - onSearch: Applica un sap.ui.model.Filter al binding della tabella per filtrare i dati 
 * lato server in base al cognome inserito.
 * - onSort: Alterna ciclicamente l'ordinamento (nessuno, ASC, DESC) applicando un 
 * sap.ui.model.Sorter e aggiornando il modello tecnico 'appView'.
 */