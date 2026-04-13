/**
 * COUSINADE BOB 2026 - LOGIQUE FRONTEND
 */

const API_URL = "https://script.google.com/macros/s/AKfycbypy-rN0WCaD3WeD76BPZodSC6RR_ZgMDElstDzgoJmUh99KMnAZGCQB4UjXeHJl9Q/exec"; 
const DATE_COUSINADE = new Date("2026-05-09T12:00:00");

let plats = [];
let commentaires = [];
let listeParticipants = []; 
let idEnEditionModale = null;
let platEnEditionModale = null;

let browserId = localStorage.getItem('cousinade_id') || ('user_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('cousinade_id', browserId);

// --- 1. CHARGEMENT DES DONNÉES ---

async function chargerDonnees() {
    try {
        const [resPlats, resComs, resParts] = await Promise.all([
            fetch(`${API_URL}?action=getPlats&t=${Date.now()}`),
            fetch(`${API_URL}?action=getCommentaires&t=${Date.now()}`),
            fetch(`${API_URL}?action=getParticipants&t=${Date.now()}`)
        ]);

        plats = await resPlats.json();
        commentaires = await resComs.json();
        listeParticipants = await resParts.json();

        renderAll();
    } catch (e) { console.error("Erreur chargement:", e); }
}

function renderAll() {
    afficherPlats();
    afficherLivreDor();
    calculerStatsGlobales();
    verifierSiDejaInscrit();
}

async function ajouterParticipant() {
    
    const btn = document.getElementById('btnInscrire');
    const nom = document.getElementById('nomPersonne').value.trim();
    const convives = parseFloat(document.getElementById('nbConvives').value);
    const midi = document.getElementById('checkMidi').checked;
    const soir = document.getElementById('checkSoir').checked;
    const allergies = document.getElementById('allergieSaisie').value.trim();

    // 1. BLOCAGE : Prénom vide
    if (!nom) {
        alert("Veuillez saisir votre prénom.");
        return;
    }

    // 2. BLOCAGE : Nombre de participants absent ou égal à 0
    // On vérifie si c'est un nombre valide (isNaN) et s'il est supérieur à 0
    if (isNaN(convives) || convives <= 0) {
        alert("Veuillez indiquer combien de personnes seront présentes (ex: 1 ou 1.5).");
        return;
    }

    // 3. BLOCAGE : Aucune case cochée (Midi ET Soir sont faux)
    if (!midi && !soir) {
        alert("Veuillez cocher au moins un repas (Midi ou Soir) pour confirmer votre présence.");
        return;
    }

    // Si on arrive ici, c'est que toutes les conditions sont remplies
    const fields = {
        action: "insert",
        browserId: browserId,
        nom: nom,
        convives: convives,
        midi: midi,
        soir: soir,
        plat: "null",
        parts: 0,
        categorie: "autre",
        allergies: allergies
    };

    btn.disabled = true;
    btn.innerText = "Inscription en cours...";

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(fields) });
        if (response.ok) {
            await chargerDonnees();
            // Optionnel : un petit message de succès
            alert("Votre inscription a bien été enregistrée !");
        }
    } catch (e) { 
        alert("Erreur de connexion lors de l'inscription."); 
    } finally { 
        btn.disabled = false; 
        btn.innerText = "Valider mon inscription";
    }
}
// --- 2. STATISTIQUES ET AFFICHAGE ---

function calculerStatsGlobales() {
    console.log("Données brutes reçues :", listeParticipants);
    let stats = { midi: 0, soir: 0, totalParts: 0, apero: 0, entree: 0, platPrincipal: 0, dessert: 0 };

    // 1. CALCUL DES STATS (La barre de progression en haut)
    listeParticipants.forEach(p => {
        const nb = parseFloat(p.convives || 0);
        // On convertit les valeurs en booléen propre pour être sûr
        const estMidi = (p.midi === true || String(p.midi).toUpperCase() === "TRUE" || p.midi === "true");
        const estSoir = (p.soir === true || String(p.soir).toUpperCase() === "TRUE" || p.soir === "true");

        if (estMidi) stats.midi += nb;
        if (estSoir) stats.soir += nb;
    });

    plats.forEach(p => {
        if (p.plat && p.plat !== "null" && p.plat !== "") {
            const nbParts = parseFloat(p.parts || 0);
            stats.totalParts += nbParts;
            if (stats.hasOwnProperty(p.categorie)) stats[p.categorie] += nbParts;
        }
    });

    // Mise à jour des textes en haut
    const updateText = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
    updateText('stat-midi', stats.midi);
    updateText('stat-soir', stats.soir);
    updateText('stat-total', stats.totalParts);
    updateText('stat-apero', stats.apero);
    updateText('stat-entrees', stats.entree);
    updateText('stat-plats', stats.platPrincipal);
    updateText('stat-desserts', stats.dessert);

    // 2. AFFICHAGE DE LA LISTE DES PRÉSENTS (Les badges)
    const listeElem = document.getElementById('listePresents');
    if (listeElem) {
        listeElem.innerHTML = listeParticipants.map(p => {
            let labels = [];
            
            // LOGIQUE DE VALIDATION ROBUSTE
            const estMidi = (p.midi === true || String(p.midi).toUpperCase() === "TRUE" || p.midi === "true");
            const estSoir = (p.soir === true || String(p.soir).toUpperCase() === "TRUE" || p.soir === "true");
            const nbConvives = p.convives || 0;

            if (estMidi) labels.push("☀️M");
            if (estSoir) labels.push("🌙S");
            
            return `
                <div class="badge-present" style="background:white; padding:10px; border-radius:8px; margin:5px; display:inline-block; border:1px solid #feca57; min-width:120px;">
                    <strong>${p.nom || "Inconnu"}</strong> : ${nbConvives}<br>
                    <small>${labels.length > 0 ? labels.join(' / ') : 'Non précisé'}</small>
                    ${p.ownerId === browserId ? `<button onclick="ouvrirModifConvivesDepuisPart('${p.ownerId}')" class="btn-edit-small">✏️</button>` : ''}
                </div>`;
        }).join('');
    }
}

// CETTE FONCTION MANQUAIT POUR LE BOUTON ✏️
function ouvrirModifConvivesDepuisPart(oId) {
    // On cherche dans les participants d'abord
    const p = listeParticipants.find(x => x.ownerId === oId);
    if (!p) return;
    
    platEnEditionModale = p; // On stocke l'objet participant
    document.getElementById('titreModalConvives').innerText = p.nom;
    document.getElementById('editNbConvives').value = p.convives;
    document.getElementById('editCheckMidi').checked = (p.midi === true || p.midi === "true" || p.midi === "TRUE");
    document.getElementById('editCheckSoir').checked = (p.soir === true || p.soir === "true" || p.soir === "TRUE");
    document.getElementById('modalConvives').style.display = "block";
}

function afficherPlats() {
    const cats = [['aperoListe', 'apero', '🍹'], ['entreeListe', 'entree', '🥗'], ['platListe', 'platPrincipal', '🥘'], ['dessertListe', 'dessert', '🍰'], ['autreListe', 'autre', '📦']];
    cats.forEach(([elemId, key, icon]) => {
        const list = plats.filter(p => p.categorie === key && p.plat && p.plat !== "null" && p.plat !== "");
        const totalCat = list.reduce((s, p) => s + (parseFloat(p.parts) || 0), 0);
        const badge = document.getElementById(`total-${key}`);
        if(badge) { badge.innerText = totalCat; badge.style.display = totalCat > 0 ? "inline" : "none"; }

        document.getElementById(elemId).innerHTML = list.map(p => `
            <div class="plat-item" style="border-left-color: var(--${key})">
                <span>${icon} <strong>${p.nom}</strong><br>${p.plat} (${p.parts}p)</span>
                ${p.ownerId === browserId ? `
                    <div style="display:flex; gap:5px;">
                        <button onclick="ouvrirModifPlat(${p.id})" class="btn-action">✏️</button>
                        <button onclick="supprimerPlat(${p.id})" class="btn-action">🗑️</button>
                    </div>` : ''}
            </div>`).join('') || '<div style="color:gray; font-size:0.8em; padding:5px;">Rien pour le moment</div>';
    });
}

// --- 3. ACTIONS ---

async function ajouterPlat() {
    const btn = document.getElementById('btnAjouter');
    const nom = document.getElementById('nomPersonne').value.trim();
    const platNom = document.getElementById('nouveauPlat').value.trim();

    if (!nom) return alert("Veuillez d'abord saisir votre prénom.");
    if (!platNom) return alert("Quel plat souhaitez-vous apporter ?");

    const fields = {
        action: "insert",
        browserId: browserId,
        nom: nom,
        plat: platNom,
        parts: document.getElementById('nombreParts').value || 0,
        categorie: document.querySelector('input[name="categoriePlat"]:checked').value,
        // On récupère les infos de présence actuelles pour ne pas écraser avec du vide côté Google Script
        convives: document.getElementById('nbConvives').value || 0,
        midi: document.getElementById('checkMidi').checked,
        soir: document.getElementById('checkSoir').checked,
        allergies: document.getElementById('allergieSaisie').value.trim()
    };

    btn.disabled = true;
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(fields) });
        annulerEdition(); // Vide les champs du plat uniquement
        await chargerDonnees();
    } catch (e) { 
        alert("Erreur lors de l'ajout du plat"); 
    } finally { 
        btn.disabled = false; 
    }
}

async function validerModifConvives() {
    const data = {
        action: "update",
        rowId: platEnEditionModale.id, // L'ID de la ligne dans la feuille
        browserId: browserId,
        nom: platEnEditionModale.nom,
        convives: document.getElementById('editNbConvives').value,
        midi: document.getElementById('editCheckMidi').checked,
        soir: document.getElementById('editCheckSoir').checked,
        plat: platEnEditionModale.plat || "null",
        parts: platEnEditionModale.parts || 0,
        categorie: platEnEditionModale.categorie || "autre",
        allergies: platEnEditionModale.allergies || ""
    };
    document.getElementById('modalConvives').style.display = "none";
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    await chargerDonnees();
}

// --- 4. UTILITAIRES ---

function verifierSiDejaInscrit() {
    const inscrit = listeParticipants.find(p => String(p.ownerId).trim() === String(browserId).trim());
    const boxConvives = document.getElementById('boxConvives');
    const msgOk = document.getElementById('msgConvivesOk');
    const inputNom = document.getElementById('nomPersonne');

    if (inscrit) {
        if(boxConvives) boxConvives.style.display = "none";
        if(msgOk) msgOk.style.display = "block";
        inputNom.value = inscrit.nom;
        inputNom.readOnly = true;
        inputNom.style.background = "#f0f0f0";
    } else {
        if(boxConvives) boxConvives.style.display = "block";
        if(msgOk) msgOk.style.display = "none";
        inputNom.readOnly = false;
        inputNom.style.background = "white";
    }
}

function annulerEdition() {
    document.getElementById('nouveauPlat').value = "";
    document.getElementById('nombreParts').value = "";
}

function fermerModale() { document.getElementById('modalEdition').style.display = "none"; }
function fermerModaleConvives() { document.getElementById('modalConvives').style.display = "none"; }

async function supprimerPlat(id) {
    if(!confirm("Supprimer ce plat ?")) return;
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "delete", rowId: id, browserId: browserId }) });
    await chargerDonnees();
}

function afficherLivreDor() {
    const container = document.getElementById('livreDor');
    if(!container) return;
    container.innerHTML = commentaires.map(m => `
        <div class="com-card" style="background:rgba(255,255,224,0.7); padding:15px; border-radius:10px; margin-bottom:10px; position:relative;">
            <p style="font-style:italic;">"${m.commentaire}"</p>
            <p style="text-align:right; font-weight:bold; margin-bottom:0;">— ${m.nom}</p>
            
            ${m.ownerId === browserId ? `
                <button onclick="ouvrirModifCom('${m.messageId}')" 
                        style="position:absolute; top:5px; right:5px; width:auto; background:none; color:gray; font-size:0.8em; padding:5px;">
                    ✏️
                </button>` : ''}
        </div>`).reverse().join('');
}

function mettreAJourCompteARebours() {
    const diff = DATE_COUSINADE - new Date();
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
    if(document.getElementById("countdown")) document.getElementById("countdown").innerText = diff > 0 ? `J-${jours} avant la cousinade !` : "C'est le jour J ! 🎉";
}
// --- ÉDITION DES PLATS ---

function ouvrirModifPlat(id) {
    const p = plats.find(x => x.id === id);
    if (!p) return;

    idEnEditionModale = id;
    document.getElementById('editPlatNom').value = p.plat;
    document.getElementById('editPlatParts').value = p.parts;
    document.getElementById('editPlatCat').value = p.categorie;
    document.getElementById('modalEdition').style.display = "block";
}

async function validerModifModale() {
    const pOriginal = plats.find(x => x.id === idEnEditionModale);
    const data = {
        action: "update",
        rowId: idEnEditionModale,
        browserId: browserId,
        nom: pOriginal.nom,
        convives: pOriginal.convives,
        midi: pOriginal.midi,
        soir: pOriginal.soir,
        plat: document.getElementById('editPlatNom').value,
        parts: document.getElementById('editPlatParts').value,
        categorie: document.getElementById('editPlatCat').value,
        allergies: pOriginal.allergies
    };

    fermerModale();
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    await chargerDonnees();
}

// --- LIVRE D'OR ---

async function ajouterCommentaireDirect() {
    const com = document.getElementById('commentaireSaisieSeule').value.trim();
    const nom = document.getElementById('nomPersonne').value.trim();

    if (!nom) return alert("Indiquez votre prénom en haut de page !");
    if (!com) return alert("Le message est vide...");

    const btn = document.getElementById('btnCom');
    
    // 1. On stocke le texte actuel ("Publier" par exemple)
    const texteOriginal = btn.innerText; 
    
    // 2. On désactive et on change le texte
    btn.disabled = true;
    btn.innerText = "Envoi...";
    
    try {
        await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: "insertCommentaire", 
                nom: nom, 
                commentaire: com 
            }) 
        });
        document.getElementById('commentaireSaisieSeule').value = "";
        await chargerDonnees();
    } catch (e) { 
        alert("Erreur lors de l'envoi"); 
    } finally { 
        // 3. Quoi qu'il arrive, on réactive et on remet le texte d'origine
        btn.disabled = false; 
        btn.innerText = texteOriginal; 
    }
}

// 1. Ouvre la modale du Livre d'Or
function ouvrirModifCom(messageId) {
    const com = commentaires.find(c => c.messageId === messageId);
    if (!com) return;

    // On stocke l'ID du message pour savoir lequel mettre à jour
    idEnEditionModale = messageId; 
    
    document.getElementById('editCom').value = com.commentaire;
    document.getElementById('modalLivreDor').style.display = "block";
}

// 2. Envoie la modification au Google Script
async function validerModifCom() {
    const nouveauTexte = document.getElementById('editCom').value.trim();
    if (!nouveauTexte) return alert("Le message ne peut pas être vide.");

    const btn = document.querySelector("#modalLivreDor button");
    const texteOriginal = btn.innerText;

    btn.disabled = true;
    btn.innerText = "Mise à jour...";

    const data = {
        action: "updateCommentaire", // On crée une nouvelle action côté GS
        messageId: idEnEditionModale,
        browserId: browserId,
        commentaire: nouveauTexte
    };

    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        fermerModaleLivreDor();
        await chargerDonnees();
    } catch (e) {
        alert("Erreur lors de la modification");
    } finally {
        btn.disabled = false;
        btn.innerText = texteOriginal;
    }
}

function fermerModaleLivreDor() {
    document.getElementById('modalLivreDor').style.display = "none";
}
function ouvrirAdmin() {
    const pass = prompt("Accès réservé. Veuillez saisir le mot de passe :");
    
    // Remplace '2026' par le mot de passe de ton choix
    if (pass === "2026") {
        // Remplace 'TON_ID_SHEET' par l'identifiant réel de ton Google Sheet
        const urlSheet = "https://docs.google.com/spreadsheets/d/1F-Bx57myPupGgfFNAN79Pn8pQNON3aWg1pmF0jLFVNI/edit?usp=sharing";
        window.open(urlSheet, "_blank");
    } else if (pass !== null) { 
        // Si pass est null, c'est que l'utilisateur a cliqué sur "Annuler"
        alert("Mot de passe incorrect.");
    }
}

mettreAJourCompteARebours();
chargerDonnees();
