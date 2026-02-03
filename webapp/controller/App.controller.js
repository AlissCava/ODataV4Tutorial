sap.ui.define(
  [
    // Gestione centralizzata dei messaggi OData
    "sap/ui/core/Messaging",
    // Controller base MVC
    "sap/ui/core/mvc/Controller",
    // Modello JSON per stato UI
    "sap/ui/model/json/JSONModel",
    // Popup per messaggi di errore
    "sap/m/MessageBox",
    // Ordinamento liste
    "sap/ui/model/Sorter",
    // Filtri sui dati
    "sap/ui/model/Filter",
    // Operatori dei filtri
    "sap/ui/model/FilterOperator",
    // Tipo di filtro
    "sap/ui/model/FilterType",
  ],
  function (Messaging, Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator, FilterType, JSONModel) {
    "use strict";

    // Estensione del controller applicativo
    return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {
      // Inizializzazione controller
      onInit: function () {
        // Modello globale dei messaggi
        var oMessageModel = Messaging.getMessageModel(),
          // Binding solo per messaggi tecnici
          oMessageModelBinding = oMessageModel.bindList(
            "/",
            undefined,
            [],
            new Filter("technical", FilterOperator.EQ, true),
          ),
          // Modello locale per stato interfaccia
          oViewModel = new JSONModel({
            busy: false, // UI bloccata
            hasUIChanges: false, // Modifiche non salvate
            usernameEmpty: true, // Username vuoto
            order: 0, // Stato ordinamento
          });

        // Modello stato UI
        this.getView().setModel(oViewModel, "appView");

        // Modello messaggi
        this.getView().setModel(oMessageModel, "message");

        // Listener per errori backend
        oMessageModelBinding.attachChange(this.onMessageBindingChange, this);

        // Flag errori tecnici
        this._bTechnicalErrors = false;
      },

      // Ricerca utenti per cognome
      onSearch: function () {
        // Recupera vista e valore ricerca
        var oView = this.getView(),
          sValue = oView.byId("searchField").getValue(),
          // Filtro "contiene"
          oFilter = new Filter("LastName", FilterOperator.Contains, sValue);

        // Applica filtro al binding
        oView.byId("peopleList").getBinding("items").filter(oFilter, FilterType.Application);
      },

      // Ordinamento crescente/decrescente
      onSort: function () {
        // Recupera vista
        var oView = this.getView(),
          // Stati ordinamento
          aStates = [undefined, "asc", "desc"],
          // Testi informativi
          aStateTextIds = ["sortNone", "sortAscending", "sortDescending"],
          sMessage,
          // Stato attuale
          iOrder = oView.getModel("appView").getProperty("/order");

        // Cambia stato
        iOrder = (iOrder + 1) % aStates.length;
        var sOrder = aStates[iOrder];

        // Salva stato
        oView.getModel("appView").setProperty("/order", iOrder);

        // Applica ordinamento
        oView
          .byId("peopleList")
          .getBinding("items")
          .sort(sOrder && new Sorter("LastName", sOrder === "desc"));

        // Messaggio utente
        sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]);
        MessageToast.show(sMessage);
      },

      // Gestione errori tecnici dal backend
      onMessageBindingChange: function (oEvent) {
        // Context dei messaggi
        var aContexts = oEvent.getSource().getContexts(),
          aMessages,
          bMessageOpen = false;

        // Nessun messaggio → esce
        if (bMessageOpen || !aContexts.length) {
          return;
        }

        // Estrae messaggi
        aMessages = aContexts.map(function (oContext) {
          return oContext.getObject();
        });

        // Rimuove messaggi globali
        sap.ui.getCore().getMessageManager().removeMessages(aMessages);

        // Forza stato modifiche
        this._setUIChanges(true);

        // Segnala errore tecnico
        this._bTechnicalErrors = true;

        // Popup errore
        MessageBox.error(aMessages[0].message, {
          id: "serviceErrorMessageBox",

          onClose: function () {
            bMessageOpen = false;
          },
        });
        bMessageOpen = true;
      },

      // Creazione nuovo utente
      onCreate: function () {
        // Lista e binding
        var oList = this.byId("peopleList"),
          oBinding = oList.getBinding("items"),
          // Nuovo record vuoto
          oContext = oBinding.create({
            UserName: "",
            FirstName: "",
            LastName: "",
            Age: "18",
          });

        // Segnala modifiche
        this._setUIChanges();

        // Username non valido
        this.getView().getModel("appView").setProperty("/usernameEmpty", true);

        // Focus su nuova riga
        oList.getItems().some(function (oItem) {
          if (oItem.getBindingContext() === oContext) {
            oItem.focus();
            oItem.setSelected(true);
            return true;
          }
        });
      },

      // Gestione modifica input
      onInputChange: function (oEvt) {
        // ESC → annulla
        if (oEvt.getParameter("escPressed")) {
          this._setUIChanges();
        } else {
          // Segnala modifica
          this._setUIChanges(true);

          // Controlla username
          if (oEvt.getSource().getParent().getBindingContext().getProperty("UserName")) {
            this.getView().getModel("appView").setProperty("/usernameEmpty", false);
          }
        }
      },

      // Aggiornamento dati dal server
      onRefresh: function () {
        var oBinding = this.byId("peopleList").getBinding("items");

        // Blocca refresh se ci sono modifiche
        if (oBinding.hasPendingChanges()) {
          MessageBox.error(this._getText("refreshNotPossibleMessage"));
          return;
        }

        // Ricarica dati
        oBinding.refresh();

        // Messaggio successo
        MessageToast.show(this._getText("refreshSuccessMessage"));
      },

      // Annulla modifiche
      onResetChanges: function () {
        // Ripristina stato originale
        this.byId("peopleList").getBinding("items").resetChanges();

        // Reset errori
        this._bTechnicalErrors = false;
        this._setUIChanges();
      },

      // Reset del DataSource lato backend
      onResetDataSource : function () {     
        // Recupera il modello OData principale
        var oModel = this.getView().getModel(),
        // Binding verso l’operazione ResetDataSource (function/action OData)
        oOperation = oModel.bindContext("/ResetDataSource(...)");
        // Invoca l’operazione sul server
        oOperation.invoke().then(
          // Callback in caso di successo
          function () {
              // Aggiorna i dati dal backend
              oModel.refresh();
              // Messaggio di conferma
              MessageToast.show(this._getText("sourceResetSuccessMessage"));
          }.bind(this),
          // Callback in caso di errore
          function (oError) {
              // Mostra errore
              MessageBox.error(oError.message);
          }
        );
      },


      // Salvataggio modifiche (batch)
      onSave: function () {
        // Callback successo
        var fnSuccess = function () {
          this._setBusy(false);
          MessageToast.show(this._getText("changesSentMessage"));
          this._setUIChanges(false);
        }.bind(this);

        // Callback errore
        var fnError = function (oError) {
          this._setBusy(false);
          this._setUIChanges(false);
          MessageBox.error(oError.message);
        }.bind(this);

        // Blocca UI
        this._setBusy(true);

        // Invio batch
        this.getView().getModel().submitBatch("peopleGroup").then(fnSuccess, fnError);
        this._bTechnicalErrors = false;
      },

      // Recupero testi i18n
      getText: function (sTextId, aArgs) {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
      },

      // Gestione stato modifiche
      setUIChanges: function (bHasUIChanges) {
        // Errori → forza true
        if (this._bTechnicalErrors) {
          bHasUIChanges = true;
        } else if (bHasUIChanges === undefined) {
          // Controlla pending changes
          bHasUIChanges = this.getView().getModel().hasPendingChanges();
        }
        var oModel = this.getView().getModel("appView");
        oModel.setProperty("/hasUIChanges", bHasUIChanges);
      },

      // Gestione stato busy
      setBusy: function (bIsBusy) {
        var oModel = this.getView().getModel("appView");
        oModel.setProperty("/busy", bIsBusy);
      },
    });
  },
);

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