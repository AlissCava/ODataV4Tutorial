sap.ui.define([
	"sap/ui/core/Messaging",
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/model/json/JSONModel"
], function (Messaging, Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator,
	FilterType, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {

		/**
		 *  Hook for initializing the controller
		 */
		onInit : function () {
			var oMessageModel = Messaging.getMessageModel(),
				oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
					new Filter("technical", FilterOperator.EQ, true)),
				oViewModel = new JSONModel({
					busy : false,
					hasUIChanges : false,
					usernameEmpty : false,
					order : 0
				});

			this.getView().setModel(oViewModel, "appView");
			this.getView().setModel(oMessageModel, "message");

			oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
			this._bTechnicalErrors = false;
		},

		/**
		 * Create a new entry.
		 */
		onCreate : function () {
			var oList = this.byId("peopleList"),
				oBinding = oList.getBinding("items"),
				// Create a new entry through the table's list binding
				oContext = oBinding.create({Age : "18"});

			this._setUIChanges(true);
			this.getView().getModel("appView").setProperty("/usernameEmpty", true);

			// Select and focus the table row that contains the newly created entry
			oList.getItems().some(function (oItem) {
				if (oItem.getBindingContext() === oContext) {
					oItem.focus();
					oItem.setSelected(true);
					return true;
				}
			});
		},

		/**
		 * Delete an entry.
		 */
		onDelete : function () {
			var oContext,
				oPeopleList = this.byId("peopleList"),
				oSelected = oPeopleList.getSelectedItem(),
				sUserName;

			if (oSelected) {
				oContext = oSelected.getBindingContext();
				sUserName = oContext.getProperty("UserName");
				oContext.delete().then(function () {
					MessageToast.show(this._getText("deletionSuccessMessage", [sUserName]));
				}.bind(this), function (oError) {
					if (oContext === oPeopleList.getSelectedItem().getBindingContext()) {
						this._setDetailArea(oContext);
					}
					this._setUIChanges();
					if (oError.canceled) {
						MessageToast.show(this._getText("deletionRestoredMessage", [sUserName]));
						return;
					}
					MessageBox.error(oError.message + ": " + sUserName);
				}.bind(this));
				this._setDetailArea();
				this._setUIChanges();
			}
		},

		/**
		 * Lock UI when changing data in the input controls
		 * @param {sap.ui.base.Event} oEvent - Event data
		 */
		onInputChange : function (oEvent) {
			if (oEvent.getParameter("escPressed")) {
				this._setUIChanges();
			} else {
				this._setUIChanges(true);
				/**
				 * Check if the username in the changed table row is empty and set the appView
				 * property accordingly
				 */
				if (oEvent.getSource().getParent().getBindingContext().getProperty("UserName")) {
					this.getView().getModel("appView").setProperty("/usernameEmpty", false);
				}
			}
		},

		/**
		 * Refresh the data.
		 */
		onRefresh : function () {
			var oBinding = this.byId("peopleList").getBinding("items");

			if (oBinding.hasPendingChanges()) {
				MessageBox.error(this._getText("refreshNotPossibleMessage"));
				return;
			}
			oBinding.refresh();
			MessageToast.show(this._getText("refreshSuccessMessage"));
		},

		/**
		 * Reset any unsaved changes.
		 */
		onResetChanges : function () {
			this.byId("peopleList").getBinding("items").resetChanges();
			// If there were technical errors, cancelling changes resets them.
			this._bTechnicalErrors = false;
			this._setUIChanges(false);
		},

		/**
		 * Reset the data source.
		 */
		onResetDataSource : function () {
			var oModel = this.getView().getModel(),
				oOperation = oModel.bindContext("/ResetDataSource(...)");

			oOperation.invoke().then(function () {
					oModel.refresh();
					MessageToast.show(this._getText("sourceResetSuccessMessage"));
				}.bind(this), function (oError) {
					MessageBox.error(oError.message);
				}
			);
		},

		/**
		 * Save changes to the source.
		 */
		onSave : function () {
			var fnSuccess = function () {
					this._setBusy(false);
					MessageToast.show(this._getText("changesSentMessage"));
					this._setUIChanges(false);
				}.bind(this),
				fnError = function (oError) {
					this._setBusy(false);
					this._setUIChanges(false);
					MessageBox.error(oError.message);
				}.bind(this);

			this._setBusy(true); // Lock UI until submitBatch is resolved.
			this.getView().getModel().submitBatch("peopleGroup").then(fnSuccess, fnError);
			// If there were technical errors, a new save resets them.
			this._bTechnicalErrors = false;
		},

		/**
		 * Search for the term in the search field.
		 */
		onSearch : function () {
			var oView = this.getView(),
				sValue = oView.byId("searchField").getValue(),
				oFilter = new Filter("LastName", FilterOperator.Contains, sValue);

			oView.byId("peopleList").getBinding("items").filter(oFilter, FilterType.Application);
		},

		/**
		 * Sort the table according to the last name.
		 * Cycles between the three sorting states "none", "ascending" and "descending"
		 */
		onSort : function () {
			var oView = this.getView(),
				aStates = [undefined, "asc", "desc"],
				aStateTextIds = ["sortNone", "sortAscending", "sortDescending"],
				iOrder = oView.getModel("appView").getProperty("/order"),
				sOrder;

			// Cycle between the states
			iOrder = (iOrder + 1) % aStates.length;
			sOrder = aStates[iOrder];

			oView.getModel("appView").setProperty("/order", iOrder);
			oView.byId("peopleList").getBinding("items").sort(sOrder && new Sorter("LastName",
				sOrder === "desc"));

			MessageToast.show(this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]));
		},

		onMessageBindingChange : function (oEvent) {
			var aContexts = oEvent.getSource().getContexts(),
				aMessages,
				bMessageOpen = false;

			if (bMessageOpen || !aContexts.length) {
				return;
			}

			// Extract and remove the technical messages
			aMessages = aContexts.map(function (oContext) {
				return oContext.getObject();
			});
			Messaging.removeMessages(aMessages);

			this._setUIChanges(true);
			this._bTechnicalErrors = true;
			MessageBox.error(aMessages[0].message, {
				id : "serviceErrorMessageBox",
				onClose : function () {
					bMessageOpen = false;
				}
			});

			bMessageOpen = true;
		},

		onSelectionChange : function (oEvent) {
			this._setDetailArea(oEvent.getParameter("listItem").getBindingContext());
		},

		/* =========================================================== */
		/*           end: event handlers                               */
		/* =========================================================== */

		/**
		 * Convenience method for retrieving a translatable text.
		 * @param {string} sTextId - the ID of the text to be retrieved.
		 * @param {Array} [aArgs] - optional array of texts for placeholders.
		 * @returns {string} the text belonging to the given ID.
		 */
		_getText : function (sTextId, aArgs) {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId,
				aArgs);
		},

		/**
		 * Set hasUIChanges flag in View Model
		 * @param {boolean} [bHasUIChanges] - set or clear hasUIChanges
		 * if bHasUIChanges is not set, the hasPendingChanges-function of the OdataV4 model
		 * determines the result
		 */
		_setUIChanges : function (bHasUIChanges) {
			if (this._bTechnicalErrors) {
				// If there is currently a technical error, then force 'true'.
				bHasUIChanges = true;
			} else if (bHasUIChanges === undefined) {
				bHasUIChanges = this.getView().getModel().hasPendingChanges();
			}
			var oModel = this.getView().getModel("appView");

			oModel.setProperty("/hasUIChanges", bHasUIChanges);
		},

		/**
		 * Set busy flag in View Model
		 * @param {boolean} bIsBusy - set or clear busy
		 */
		_setBusy : function (bIsBusy) {
			var oModel = this.getView().getModel("appView");

			oModel.setProperty("/busy", bIsBusy);
		},

		 /**
         * Toggles the visibility of the detail area
         *
         * @param {object} [oUserContext] - the current user context
         */
      _setDetailArea : function (oUserContext) {         
        var oDetailArea = this.byId("detailArea"),
            oLayout = this.byId("defaultLayout"),
            oOldContext,
            oSearchField = this.byId("searchField");

        if (!oDetailArea) {
          return; // do nothing when running within view destruction
        }

        oOldContext = oDetailArea.getBindingContext();
        if (oOldContext) {
            oOldContext.setKeepAlive(false);
        }
        if (oUserContext) {
          oUserContext.setKeepAlive(true,
            // hide details if kept entity was refreshed but does not exists any more
            this._setDetailArea.bind(this));

        }
        oDetailArea.setBindingContext(oUserContext || null);
        // resize view
        oDetailArea.setVisible(!!oUserContext);
        oLayout.setSize(oUserContext ? "60%" : "100%");
        oLayout.setResizable(!!oUserContext);
        oSearchField.setWidth(oUserContext ? "40%" : "20%");
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

/*
Step 6
 * - Implementata la creazione di nuovi record tramite 'onCreate', con gestione del focus sulla nuova riga.
 * - Inserita la logica di salvataggio centralizzato 'onSave' che utilizza 'submitBatch' per inviare 
 * tutte le modifiche pendenti in un'unica richiesta al server.
 * - Aggiunto il metodo 'onResetChanges' per annullare le modifiche locali non salvate.
 * - Integrata la gestione degli errori tecnici tramite 'onMessageBindingChange' e il Messaging Model,
 * garantendo che i messaggi del backend vengano visualizzati correttamente all'utente.
 * - Coordinato lo stato dell'interfaccia (busy, hasUIChanges) per riflettere le operazioni di rete asincrone.
 */

/*
 Step 9
* - Implementata la cancellazione (Delete) con gestione asincrona e messaggi di ripristino.
* - Aggiunta un'area di dettaglio dinamica che sfrutta il ridimensionamento del layout
* e l'Element Binding per visualizzare i dati dell'utente selezionato.
* - Inserita la funzione di sistema 'onResetDataSource' per ripristinare il database
* tramite la chiamata a un'Action OData V4.
* - Ottimizzata la gestione dei messaggi tecnici e dei flag di stato (busy, hasUIChanges).
*/