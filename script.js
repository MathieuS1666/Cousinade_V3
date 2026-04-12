/**
 * COUSINADE BOB 2026 - LOGIQUE FRONTEND
 * Ce fichier gère l'affichage, les calculs et les envois vers Google Sheets.
 */

const API_URL = "https://script.google.com/macros/s/AKfycbwB841Je6gB5wEAeWr6eHJLw2JwEUFelOR6GGi0Qh6Hfm6wzXu-Y7DOlTikKyiFY_vV/exec"; 
const DATE_COUSINADE = new Date("2026-05-09T12:00:00");

// Variables globales pour stocker les données chargées
let plats = [];
let commentaires = [];
let idEnEditionModale = null;
let platEnEditionModale = null;

// Identifiant unique du navigateur pour reconnaître qui est qui
let browserId = localStorage.getItem('cousinade_id') || ('user_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('cousinade_id', browserId);

// --- 1. CHARGEMENT DES DONNÉES ---

/**
 * Récupère les données depuis Google Apps Script
 */
async function chargerDonnees() {
    try {
        const [resPlats, resComs] = await Promise.all([
            fetch(`${API_URL}?action=getPlats&t=${Date.now()}`),
            fetch(`${API_URL}?action=getCommentaires&t=${Date.now()}`)
        ]);

        plats = await resPlats.json();
        commentaires = await resComs.json();

        renderAll();
    } catch (e) {
        console.error("Erreur de chargement :", e);
    }
}

/**
 * Lance toutes les fonctions de rendu visuel
 */
function renderAll() {
    afficherPlats();
    afficherLivreDor();
    calculerStatsGlobales();
    verifierSiDejaInscrit();
}

// --- 2. AFFICHAGE ET STATISTIQUES ---

/**
 * Calcule les totaux pour le bandeau d'info (Midi, Soir, Parts)
 */
function calculerStatsGlobales() {
    let totalMidi = 0, totalSoir = 0, totalConv = 0, totalParts = 0;
    const vus = new Set(); // Pour ne compter qu'une fois chaque participant

    plats.forEach(p => {
        // Stats de présence (liées au Participant)
        if (!vus.has(p.ownerId)) {
            const nb = parseFloat(p.convives || 0);
            if (p.midi === true || p.midi === "true") totalMidi += nb;
            if (p.soir === true || p.soir === "true") totalSoir += nb;
            totalConv += nb;
            vus.add(p.ownerId);
        }
        // Stats de nourriture (tous les plats comptent)
        if (p.plat && p.plat !== "null") {
            totalParts += parseInt(p.parts || 0);
        }
    });

    // Mise à jour des badges dans le bandeau header
    if(document.getElementById('stat-midi')) document.getElementById('stat-midi').innerText = totalMidi;
    if(document.getElementById('stat-soir')) document.getElementById('stat-soir').innerText = totalSoir;
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = totalParts;

    // Rendu de la liste des badges de présence (en bas de page)
    const unique = {};
    plats.forEach(p => { if (!unique[p.ownerId]) unique[p.ownerId] = p; });
    
    document.getElementById('listePresents').innerHTML = Object.values(unique).map(p => {
        let labels = [];
        if (p.midi === true || p.midi === "true") labels.push("☀️M");
        if (p.soir === true || p.soir === "true") labels.push("🌙S");
        return `
            <span class="badge-present">
                <strong>${p.nom}</strong> : ${p.convives}<br>
                <small>${labels.join(' / ')}</small>
                ${p.ownerId === browserId ? `<button onclick="ouvrirModifConvives(${p.id})" class="btn-edit-small">✏️</button>` : ''}
            </span>`;
    }).join('');
}

/**
 * Affiche les plats dans les 5 colonnes correspondantes
 */
function afficherPlats() {
    const cats = [
        ['aperoListe', 'apero', '🍹'],
        ['entreeListe', 'entree', '🥗'],
        ['platListe', 'platPrincipal', '🥘'],
        ['dessertListe', 'dessert', '🍰'],
        ['autreListe', 'autre', '📦']
    ];

    cats.forEach(([elemId, key, icon]) => {
        // 1. On filtre les plats qui appartiennent à cette catégorie ET qui ne sont pas vides
        const list = plats.filter(p => p.categorie === key && p.plat && p.plat !== "null" && p.plat !== "");
        
        // 2. CALCUL DU TOTAL DE LA CATÉGORIE (Correction ici)
        // On utilise parseFloat pour transformer le texte en nombre et on ajoute 0 si c'est vide
        const totalCat = list.reduce((s, p) => s + (parseFloat(p.parts) || 0), 0);
        
        // 3. Mise à jour du badge HTML (ex: total-apero)
        const badge = document.getElementById(`total-${key}`);
        if(badge) {
            badge.innerText = totalCat;
            // Optionnel : on cache le badge s'il est à 0 pour épurer
            badge.style.display = totalCat > 0 ? "inline" : "none";
        }

        // 4. Génération du HTML pour la liste
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

    // Gestion de l'affichage des allergies (doublons filtrés)
    const vusAll = new Set();
    const listeAllergies = plats.filter(p => {
        if (p.allergies && p.allergies.trim() !== "" && !vusAll.has(p.ownerId)) {
            vusAll.add(p.ownerId); return true;
        }
        return false;
    });
    document.getElementById('allergieListe').innerHTML = listeAllergies.map(p => `
        <div class="plat-item" style="border-left-color: #e74c3c;">
            <span>🚫 <strong>${p.nom}</strong><br>${p.allergies}</span>
        </div>`).join('') || '<div style="color:gray; font-size:0.8em; padding:5px;">Aucune allergie</div>';
}

// --- 3. ACTIONS PRINCIPALES (ENVOIS) ---

/**
 * Envoie une inscription ou un nouveau plat
 */
async function ajouterPlat() {
    const btn = document.getElementById('btnAjouter');
    const platSaisi = document.getElementById('nouveauPlat').value.trim();
    
    // On prépare l'objet pour le Backend
    const fields = {
        action: "insert",
        browserId: browserId,
        nom: document.getElementById('nomPersonne').value.trim(),
        convives: document.getElementById('nbConvives').value || 0,
        midi: document.getElementById('checkMidi').checked,
        soir: document.getElementById('checkSoir').checked,
        // Si vide, on envoie explicitement "null" pour ne pas créer de ligne dans la feuille Plats
        plat: platSaisi || "null", 
        parts: document.getElementById('nombreParts').value || 0,
        categorie: document.querySelector('input[name="categoriePlat"]:checked').value,
        allergies: document.getElementById('allergieSaisie').value.trim()
    };

    if (!fields.nom) return alert("Le prénom est requis !");

    btn.disabled = true;
    btn.innerText = "Envoi...";

    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(fields) });
        annulerEdition();
        await chargerDonnees();
    } catch (e) { alert("Erreur de connexion"); }
    finally { btn.disabled = false; btn.innerText = "Valider"; }
}

/**
 * Supprime un plat (demande confirmation)
 */
async function supprimerPlat(id) {
    if(!confirm("Supprimer ce plat ?")) return;
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "delete", rowId: id, browserId: browserId }) });
    await chargerDonnees();
}

// --- 4. GESTION DES MODALES ---

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
    const p = plats.find(x => x.id === idEnEditionModale);
    const data = {
        action: "update",
        rowId: idEnEditionModale,
        browserId: browserId,
        nom: p.nom,
        convives: p.convives,
        midi: p.midi,
        soir: p.soir,
        plat: document.getElementById('editPlatNom').value,
        parts: document.getElementById('editPlatParts').value,
        categorie: document.getElementById('editPlatCat').value,
        allergies: p.allergies
    };
    document.getElementById('modalEdition').style.display = "none";
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    await chargerDonnees();
}

function ouvrirModifConvives(id) {
    const p = plats.find(x => x.id == id);
    if (!p) return;
    platEnEditionModale = p;
    document.getElementById('titreModalConvives').innerText = p.nom;
    document.getElementById('editNbConvives').value = p.convives;
    document.getElementById('editCheckMidi').checked = (p.midi === true || p.midi === "true");
    document.getElementById('editCheckSoir').checked = (p.soir === true || p.soir === "true");
    document.getElementById('modalConvives').style.display = "block";
}

async function validerModifConvives() {
    const data = {
        action: "update",
        rowId: platEnEditionModale.id,
        browserId: browserId,
        nom: platEnEditionModale.nom,
        convives: document.getElementById('editNbConvives').value,
        midi: document.getElementById('editCheckMidi').checked,
        soir: document.getElementById('editCheckSoir').checked,
        plat: platEnEditionModale.plat,
        parts: platEnEditionModale.parts,
        categorie: platEnEditionModale.categorie,
        allergies: platEnEditionModale.allergies
    };
    document.getElementById('modalConvives').style.display = "none";
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    await chargerDonnees();
}

// --- 5. LIVRE D'OR ---

async function ajouterCommentaireDirect() {
    const txt = document.getElementById('commentaireSaisieSeule').value.trim();
    if(!txt) return;

    // IMPORTANT : On envoie "Message Livre d'Or" pour que le Backend n'écrase pas le profil Participant
    const data = {
        action: "insert",
        browserId: browserId,
        nom: document.getElementById('nomPersonne').value || "Anonyme",
        plat: "Message Livre d'Or", 
        commentaire: txt
    };
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    document.getElementById('commentaireSaisieSeule').value = "";
    await chargerDonnees();
}

function afficherLivreDor() {
    const container = document.getElementById('livreDor');
    container.innerHTML = commentaires.map(m => `
        <div class="com-card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative; margin-bottom:10px;">
            <p style="font-style:italic; margin-bottom:5px;">"${m.commentaire}"</p>
            <p style="text-align:right; font-weight:bold; color:var(--plat); margin:0;">— ${m.nom}</p>
        </div>
    `).reverse().join('');
}

// --- 6. UTILITAIRES ET LOGIQUE D'INTERFACE ---

/**
 * Masque les champs logistiques si le cousin est déjà reconnu
 */
function verifierSiDejaInscrit() {
    const inscrit = plats.find(p => p.ownerId === browserId);
    const boxConvives = document.getElementById('boxConvives');
    const boxRepas = document.querySelector('.repas-selection'); 
    const msgOk = document.getElementById('msgConvivesOk');
    const inputNom = document.getElementById('nomPersonne');
    const champAllergie = document.getElementById('allergieSaisie');
    
    if (inscrit) {
        // Masquer la présence (Midi/Soir) et le nombre
        if(boxConvives) boxConvives.style.display = "none";
        if(boxRepas) boxRepas.style.display = "none";
        
        msgOk.style.display = "block";
        inputNom.value = inscrit.nom;
        inputNom.readOnly = true;
        
        // Masquer le champ allergie si déjà rempli pour épurer le formulaire
        if(inscrit.allergies && champAllergie) {
             champAllergie.parentElement.style.display = "none";
        }
    } else {
        // Mode "Première visite" : On montre tout
        if(boxConvives) boxConvives.style.display = "block";
        if(boxRepas) boxRepas.style.display = "flex";
        msgOk.style.display = "none";
        inputNom.readOnly = false;
        if(champAllergie) champAllergie.parentElement.style.display = "block";
    }
}

function annulerEdition() {
    document.getElementById('nouveauPlat').value = "";
    document.getElementById('nombreParts').value = "";
}

function fermerModale() { document.getElementById('modalEdition').style.display = "none"; }
function fermerModaleConvives() { document.getElementById('modalConvives').style.display = "none"; }

function mettreAJourCompteARebours() {
    const diff = DATE_COUSINADE - new Date();
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
    document.getElementById("countdown").innerText = diff > 0 ? `J-${jours} avant la cousinade !` : "C'est le jour J ! 🎉";
}

/**
 * Fonction Admin sécurisée
 */
function ouvrirAdmin() {
    const mdp = prompt("Veuillez saisir le mot de passe administrateur :");
    if (mdp === "1234") {
        const urlSheet = "https://docs.google.com/spreadsheets/d/1F-Bx57myPupGgfFNAN79Pn8pQNON3aWg1pmF0jLFVNI/edit?usp=sharing"; 
        window.open(urlSheet, '_blank');
    } else if (mdp !== null) {
        alert("Mot de passe incorrect.");
    }
}

// Lancement automatique au chargement de la page
mettreAJourCompteARebours();
chargerDonnees();
