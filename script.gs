 /**

* COUSINADE 2026 - GESTION DU BACKEND

* Ce script traite les requêtes du site web et organise les données dans Google Sheets.

*/


const SS = SpreadsheetApp.getActiveSpreadsheet();


/**

* FONCTION DE LECTURE (GET)

* Appelée quand le site a besoin d'afficher les données.

*/

function doGet(e) {

const action = e.parameter.action;

// --- RÉCUPÉRATION DES PLATS ET DES INFOS PARTICIPANTS ---

if (action === "getPlats") {

const sheetPart = SS.getSheetByName("Participants");

const sheetPlat = SS.getSheetByName("Plats");

const parts = sheetPart.getDataRange().getValues();

const plats = sheetPlat.getDataRange().getValues();

let partMap = {};

for(let i = 1; i < parts.length; i++) {

partMap[parts[i][0]] = {

nom: parts[i][1],

convives: parts[i][2],

midi: parts[i][3],

soir: parts[i][4],

allergies: parts[i][5]

};

}

let result = [];

for(let j = 1; j < plats.length; j++) {

let pId = plats[j][1];

let info = partMap[pId] || {};

result.push({

id: j + 1,

ownerId: pId,

nom: info.nom || "Inconnu",

plat: plats[j][2],

parts: plats[j][3],

categorie: plats[j][4],

convives: info.convives,

midi: info.midi,

soir: info.soir,

allergies: info.allergies

});

}

return content(result);

}


// --- RÉCUPÉRATION DES COMMENTAIRES ---

if (action === "getCommentaires") {

const sheetCom = SS.getSheetByName("Commentaires");

const data = sheetCom.getDataRange().getValues();

let coms = data.slice(1).map(r => ({ nom: r[1], commentaire: r[2], ownerId: r[3], messageId: r[4] }));

return content(coms);

}


// --- RÉCUPÉRATION DES PARTICIPANTS (CORRIGÉE) ---

if (action === "getParticipants") {

const sheetPart = SS.getSheetByName("Participants");

const data = sheetPart.getDataRange().getValues();

// On renvoie TOUTES les colonnes nécessaires pour les badges

let participants = data.slice(1).map(r => ({

ownerId: r[0],

nom: r[1],

convives: (r[2] instanceof Date) ? r[2].getDate() + (r[2].getMonth()/10) : parseFloat(r[2] || 0),

midi: r[3], // Ajouté

soir: r[4], // Ajouté

allergies: r[5] // Ajouté

}));

return content(participants);

}

}


/**

* FONCTION D'ÉCRITURE (POST)

* Appelée quand quelqu'un clique sur "Valider" ou "Publier".

*/

function doPost(e) {

const data = JSON.parse(e.postData.contents);

const sheetPart = SS.getSheetByName("Participants");

const sheetPlat = SS.getSheetByName("Plats");

const sheetCom = SS.getSheetByName("Commentaires");


// --- 1. ACTION : INSERTION COMMENTAIRE ---

if (data.action === "insertCommentaire") {

sheetCom.appendRow([new Date(), data.nom, data.commentaire, data.browserId, Utils.uid()]);

return content({status: "ok_commentaire"});

}


// --- 2. ACTION : UPDATE COMMENTAIRE ---

if (data.action === "updateCommentaire") {

const dataCom = sheetCom.getDataRange().getValues();

for (let i = 1; i < dataCom.length; i++) {

if (dataCom[i][4] == data.messageId && dataCom[i][3] == data.browserId) {

sheetCom.getRange(i + 1, 3).setValue(data.commentaire);

break;

}

}

return content({status: "ok_update_com"});

}


// --- 3. GESTION PARTICIPANTS (INSERT OU UPDATE) ---

// On cherche si le browserId existe déjà

let allParts = sheetPart.getDataRange().getValues();

let partRow = -1;

for(let i = 0; i < allParts.length; i++) {

if(allParts[i][0] == data.browserId) {

partRow = i + 1;

break;

}

}


if(data.action === "insert" || data.action === "update") {

if(partRow === -1) {

sheetPart.appendRow([data.browserId, data.nom, data.convives, data.midi, data.soir, data.allergies]);

} else {

// On met à jour Nom, Convives, Midi, Soir, Allergies

sheetPart.getRange(partRow, 2, 1, 5).setValues([[data.nom, data.convives, data.midi, data.soir, data.allergies]]);

}

}


// --- 4. GESTION DES PLATS ---

if(data.action === "insert" && data.plat && data.plat !== "null") {

sheetPlat.appendRow([Utils.uid(), data.browserId, data.plat, data.parts, data.categorie]);

}

if(data.action === "update" && data.rowId) {

// On met à jour Nom du plat, Parts et Catégorie

sheetPlat.getRange(data.rowId, 3, 1, 3).setValues([[data.plat, data.parts, data.categorie]]);

}

if(data.action === "delete") {

sheetPlat.deleteRow(data.rowId);

}


// --- ACTION : MISE À JOUR ALLERGIES SEULE ---
  if (data.action === "updateAllergies") {
    let allParts = sheetPart.getDataRange().getValues();
    for (let i = 1; i < allParts.length; i++) {
      if (allParts[i][0] == data.browserId) {
        // La colonne 6 (index 5) correspond aux allergies
        sheetPart.getRange(i + 1, 6).setValue(data.allergies);
        break;
      }
    }
    return content({status: "ok_allergies"});
  }
// Réponse finale si aucune des réponses spécifiques ci-dessus n'a été renvoyée

return content({status: "ok"});
}
// Petits outils pratiques

const Utils = {

uid: () => "id_" + Math.random().toString(36).substr(2, 9) // Génère un ID unique

};


function content(obj) {

return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);

}
