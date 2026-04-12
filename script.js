/**
 * COUSINADE BOB 2026 - LOGIQUE FRONTEND (Version Normalisée)
 */

const API_URL = "https://script.google.com/macros/s/AKfycbyCWzk4n0Rk0Heq83YaRUl_dk_SPxGarAfaBUAI4paceFFyExseFZ4s97iWuvYqZIMS/exec"; // <--- REMPLACE PAR TON URL DE DÉPLOIEMENT
const DATE_COUSINADE = new Date("2026-05-09T12:00:00");

let plats = [];
let commentaires = [];
let idEnEditionModale = null;
let platEnEditionModale = null;
let browserId = localStorage.getItem('cousinade_id') || ('user_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('cousinade_id', browserId);

// --- 1. CHARGEMENT ---

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

// --- 2. AFFICHAGE ET STATS ---

function calculerStatsGlobales() {
    let totalMidi = 0, totalSoir = 0, totalConv = 0, totalParts = 0;
    const vus = new Set();

    plats.forEach(p => {
        // Stats de présence (calculées une seule fois par utilisateur)
        if (!vus.has(p.ownerId)) {
            const nb = parseFloat(p.convives || 0);
            if (p.midi === true || p.midi === "true") totalMidi += nb;
            if (p.soir === true || p.soir === "true") totalSoir += nb;
            totalConv += nb;
            vus.add(p.ownerId);
        }
        // Stats de nourriture (tous les plats comptent)
        if (p.plat !== "Présence uniquement") {
            totalParts += parseInt(p.parts || 0);
        }
    });

    // Mise à jour des éléments HTML existants
    if(document.getElementById('stat-midi')) document.getElementById('stat-midi').innerText = totalMidi;
    if(document.getElementById('stat-soir')) document.getElementById('stat-soir').innerText = totalSoir;
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = totalParts;
    // Note: 'stat-convives' n'était pas dans ton HTML initial mais utile au cas où
    if(document.getElementById('stat-convives')) document.getElementById('stat-convives').innerText = totalConv;

    // Rendu Liste des Présents
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

function afficherPlats() {
    const cats = [
        ['aperoListe', 'apero', '🍹'],
        ['entreeListe', 'entree', '🥗'],
        ['platListe', 'platPrincipal', '🥘'],
        ['dessertListe', 'dessert', '🍰'],
        ['autreListe', 'autre', '📦']
    ];

    cats.forEach(([elemId, key, icon]) => {
        const list = plats.filter(p => p.categorie === key && p.plat !== "Présence uniquement");
        const totalCat = list.reduce((s, p) => s + parseInt(p.parts || 0), 0);
        
        // Mise à jour badge total catégorie
        const badge = document.getElementById(`total-${key}`);
        if(badge) badge.innerText = totalCat;

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

    // Allergies
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

// --- 3. ACTIONS ---

async function ajouterPlat() {
    const btn = document.getElementById('btnAjouter');
    const fields = {
        action: "insert",
        browserId: browserId,
        nom: document.getElementById('nomPersonne').value.trim(),
        convives: document.getElementById('nbConvives').value || 0,
        midi: document.getElementById('checkMidi').checked,
        soir: document.getElementById('checkSoir').checked,
        plat: document.getElementById('nouveauPlat').value.trim() || "Présence uniquement",
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

// --- 4. MODALES (Identiques à ton code original) ---

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
    const data = {
        action: "insert",
        browserId: browserId,
        nom: document.getElementById('nomPersonne').value || "Anonyme",
        plat: "Message Livre d'Or", // Marqueur pour le script Google
        commentaire: txt
    };
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    document.getElementById('commentaireSaisieSeule').value = "";
    await chargerDonnees();
}

function afficherLivreDor() {
    const container = document.getElementById('livreDor');
    container.innerHTML = commentaires.map(m => `
        <div class="com-card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative;">
            <p style="font-style:italic; margin-bottom:5px;">"${m.commentaire}"</p>
            <p style="text-align:right; font-weight:bold; color:var(--plat); margin:0;">— ${m.nom}</p>
        </div>
    `).reverse().join('');
}

// --- 6. UTILITAIRES ---

function verifierSiDejaInscrit() {
    const inscrit = plats.find(p => p.ownerId === browserId);
    const boxConvives = document.getElementById('boxConvives');
    // On cible la div qui contient les checkbox Midi/Soir
    const boxRepas = document.querySelector('.repas-selection'); 
    const msgOk = document.getElementById('msgConvivesOk');
    const inputNom = document.getElementById('nomPersonne');
    
    if (inscrit) {
        // Masquer les champs de présence globale
        if(boxConvives) boxConvives.style.display = "none";
        if(boxRepas) boxRepas.style.display = "none";
        
        msgOk.style.display = "block";
        inputNom.value = inscrit.nom;
        inputNom.readOnly = true;
        
        // Optionnel : on peut aussi masquer le champ allergie s'il est déjà rempli
        const champAllergie = document.getElementById('allergieSaisie');
        if(inscrit.allergies && champAllergie) {
             champAllergie.parentElement.style.display = "none";
        }
    } else {
        // Afficher les champs pour une première inscription
        if(boxConvives) boxConvives.style.display = "block";
        if(boxRepas) boxRepas.style.display = "flex";
        
        msgOk.style.display = "none";
        inputNom.readOnly = false;
    }
}
function annulerEdition() {
    document.getElementById('nouveauPlat').value = "";
    document.getElementById('nombreParts').value = "";
    document.getElementById('allergieSaisie').value = "";
}

function fermerModale() { document.getElementById('modalEdition').style.display = "none"; }
function fermerModaleConvives() { document.getElementById('modalConvives').style.display = "none"; }

function mettreAJourCompteARebours() {
    const diff = DATE_COUSINADE - new Date();
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
    document.getElementById("countdown").innerText = diff > 0 ? `J-${jours} avant la cousinade !` : "C'est le jour J ! 🎉";
}
/**
 * FONCTION ADMIN
 * Permet d'ouvrir le tableur après saisie d'un mot de passe
 */
function ouvrirAdmin() {
    const mdp = prompt("Veuillez saisir le mot de passe administrateur :");
    
    // Tu peux changer "Bob2026" par le mot de passe de ton choix
    if (mdp === "1234") {
        const urlSheet = "https://docs.google.com/spreadsheets/d/1F-Bx57myPupGgfFNAN79Pn8pQNON3aWg1pmF0jLFVNI/edit?usp=sharing"; 
        window.open(urlSheet, '_blank');
    } else if (mdp !== null) {
        alert("Mot de passe incorrect.");
    }
}
// Lancement
mettreAJourCompteARebours();
chargerDonnees();
