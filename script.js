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

function renderAll() {
    afficherPlats();
    afficherLivreDor();
    calculerStatsGlobales();
    verifierSiDejaInscrit();
}

// --- 2. AFFICHAGE ET STATISTIQUES ---

function calculerStatsGlobales() {
    let stats = {
        midi: 0,
        soir: 0,
        totalParts: 0,
        apero: 0,
        entree: 0,
        platPrincipal: 0,
        dessert: 0
    };
    
    const vus = new Set();

    plats.forEach(p => {
        if (!vus.has(p.ownerId)) {
            const nb = parseFloat(p.convives || 0);
            if (p.midi === true || p.midi === "true") stats.midi += nb;
            if (p.soir === true || p.soir === "true") stats.soir += nb;
            vus.add(p.ownerId);
        }

        if (p.plat && p.plat !== "null" && p.plat !== "") {
            const nbParts = parseFloat(p.parts || 0);
            stats.totalParts += nbParts;
            if (stats.hasOwnProperty(p.categorie)) {
                stats[p.categorie] += nbParts;
            }
        }
    });

    if(document.getElementById('stat-midi')) document.getElementById('stat-midi').innerText = stats.midi;
    if(document.getElementById('stat-soir')) document.getElementById('stat-soir').innerText = stats.soir;
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = stats.totalParts;
    if(document.getElementById('stat-apero'))    document.getElementById('stat-apero').innerText = stats.apero;
    if(document.getElementById('stat-entrees'))  document.getElementById('stat-entrees').innerText = stats.entree;
    if(document.getElementById('stat-plats'))    document.getElementById('stat-plats').innerText = stats.platPrincipal;
    if(document.getElementById('stat-desserts')) document.getElementById('stat-desserts').innerText = stats.dessert;

    // --- D. RENDU DE LA LISTE DES PRÉSENTS (Avec inserts à 70%) ---
    const unique = {};
    plats.forEach(p => { if (!unique[p.ownerId]) unique[p.ownerId] = p; });
    
    document.getElementById('listePresents').innerHTML = Object.values(unique).map(p => {
        let labels = [];
        if (p.midi === true || p.midi === "true") labels.push("☀️M");
        if (p.soir === true || p.soir === "true") labels.push("🌙S");
        
        return `
            <div class="badge-present" style="
                background-color: rgba(255, 255, 224, 0.7); 
                padding: 12px; 
                border-radius: 10px; 
                margin-bottom: 10px; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
                display: inline-block; 
                margin-right: 10px; 
                min-width: 130px; 
                border: 1px solid rgba(0,0,0,0.1);
                color: #2c3e50;
                text-align: center;
                vertical-align: top;
            ">
                <strong style="color: #660503; font-size: 1.1em;">${p.nom || "Anonyme"}</strong><br>
                <span style="font-size: 0.9em;">${p.convives} pers.</span><br>
                <small style="font-weight: bold;">${labels.join(' / ')}</small>
                ${p.ownerId === browserId ? `<br><button onclick="ouvrirModifConvives(${p.id})" class="btn-edit-small" style="margin-top:5px; cursor:pointer;">✏️</button>` : ''}
            </div>`;
    }).join('');
}

function afficherPlats() {
    const cats = [
        ['aperoListe', 'apero', '🍹'],
        ['entreeListe', 'entree', '🥗'],
        ['platListe', 'platPrincipal', '🥘'],
        ['dessertListe', 'dessert', '🍰'],
        ['autreListe', 'autre', '📦']
    ];

    cats.forEach(([elemId, key, icon]) => {
        const list = plats.filter(p => p.categorie === key && p.plat && p.plat !== "null" && p.plat !== "");
        const totalCat = list.reduce((s, p) => s + (parseFloat(p.parts) || 0), 0);
        const badge = document.getElementById(`total-${key}`);
        if(badge) {
            badge.innerText = totalCat;
            badge.style.display = totalCat > 0 ? "inline" : "none";
        }

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

async function ajouterPlat() {
    const btn = document.getElementById('btnAjouter');
    const platSaisi = document.getElementById('nouveauPlat').value.trim();
    const fields = {
        action: "insert",
        browserId: browserId,
        nom: document.getElementById('nomPersonne').value.trim(),
        convives: document.getElementById('nbConvives').value || 0,
        midi: document.getElementById('checkMidi').checked,
        soir: document.getElementById('checkSoir').checked,
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

// --- 5. LIVRE D'OR (Avec inserts à 70%) ---

async function ajouterCommentaireDirect() {
    const txt = document.getElementById('commentaireSaisieSeule').value.trim();
    if(!txt) return;
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
        <div class="com-card" style="
            background-color: rgba(255, 255, 224, 0.7); 
            padding: 15px; 
            border-radius: 10px; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
            border: 1px solid rgba(0,0,0,0.05);
            color: #2c3e50;
        ">
            <p style="font-style:italic; margin-bottom:8px;">"${m.commentaire}"</p>
            <p style="text-align:right; font-weight:bold; color: #660503; margin:0; font-size: 0.9em;">— ${m.nom}</p>
        </div>
    `).reverse().join('');
}

// --- 6. UTILITAIRES ET LOGIQUE D'INTERFACE ---

function verifierSiDejaInscrit() {
    const inscrit = plats.find(p => p.ownerId === browserId);
    const boxConvives = document.getElementById('boxConvives');
    const boxRepas = document.querySelector('.repas-selection'); 
    const msgOk = document.getElementById('msgConvivesOk');
    const inputNom = document.getElementById('nomPersonne');
    const champAllergie = document.getElementById('allergieSaisie');
    
    if (inscrit) {
        if(boxConvives) boxConvives.style.display = "none";
        if(boxRepas) boxRepas.style.display = "none";
        msgOk.style.display = "block";
        inputNom.value = inscrit.nom;
        inputNom.readOnly = true;
    } else {
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

function ouvrirAdmin() {
    const mdp = prompt("Veuillez saisir le mot de passe administrateur :");
    if (mdp === "1234") {
        const urlSheet = "https://docs.google.com/spreadsheets/d/1F-Bx57myPupGgfFNAN79Pn8pQNON3aWg1pmF0jLFVNI/edit?usp=sharing"; 
        window.open(urlSheet, '_blank');
    } else if (mdp !== null) {
        alert("Mot de passe incorrect.");
    }
}

mettreAJourCompteARebours();
chargerDonnees();
