/**
 * COUSINADE BOB 2026 - LOGIQUE FRONTEND
 */

const API_URL = "https://script.google.com/macros/s/AKfycbzUMyuCJwqL6YZRJWflhi6XBuxHi2q8ybArgxYmWGDY0fOx4X0u9Wu54lIyIZCxV3Ha/exec"; 
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

// --- 2. STATISTIQUES ET AFFICHAGE ---

function calculerStatsGlobales() {
    let stats = { midi: 0, soir: 0, totalParts: 0, apero: 0, entree: 0, platPrincipal: 0, dessert: 0 };

    listeParticipants.forEach(p => {
        const nb = parseFloat(p.convives || 0);
        if (p.midi === true || p.midi === "true") stats.midi += nb;
        if (p.soir === true || p.soir === "true") stats.soir += nb;
    });

    plats.forEach(p => {
        if (p.plat && p.plat !== "null" && p.plat !== "") {
            const nbParts = parseFloat(p.parts || 0);
            stats.totalParts += nbParts;
            if (stats.hasOwnProperty(p.categorie)) stats[p.categorie] += nbParts;
        }
    });

    const updateText = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
    updateText('stat-midi', stats.midi);
    updateText('stat-soir', stats.soir);
    updateText('stat-total', stats.totalParts);
    updateText('stat-apero', stats.apero);
    updateText('stat-entrees', stats.entree);
    updateText('stat-plats', stats.platPrincipal);
    updateText('stat-desserts', stats.dessert);

    const listeElem = document.getElementById('listePresents');
    if (listeElem) {
        listeElem.innerHTML = listeParticipants.map(p => {
            let labels = [];
            if (p.midi === true || p.midi === "true") labels.push("☀️M");
            if (p.soir === true || p.soir === "true") labels.push("🌙S");
            
            return `
                <div class="badge-present" style="background:white; padding:10px; border-radius:8px; margin:5px; display:inline-block; border:1px solid #feca57; min-width:120px;">
                    <strong>${p.nom || "Inconnu"}</strong> : ${p.convives || 0}<br>
                    <small>${labels.join(' / ') || 'Non précisé'}</small>
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
    document.getElementById('editCheckMidi').checked = (p.midi === true || p.midi === "true");
    document.getElementById('editCheckSoir').checked = (p.soir === true || p.soir === "true");
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
    const fields = {
        action: "insert",
        browserId: browserId,
        nom: document.getElementById('nomPersonne').value.trim(),
        convives: document.getElementById('nbConvives').value || 0,
        midi: document.getElementById('checkMidi').checked,
        soir: document.getElementById('checkSoir').checked,
        plat: document.getElementById('nouveauPlat').value.trim() || "null", 
        parts: document.getElementById('nombreParts').value || 0,
        categorie: document.querySelector('input[name="categoriePlat"]:checked').value,
        allergies: document.getElementById('allergieSaisie').value.trim()
    };

    if (!fields.nom) return alert("Le prénom est requis !");
    btn.disabled = true;
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(fields) });
        annulerEdition();
        await chargerDonnees();
    } catch (e) { alert("Erreur de connexion"); }
    finally { btn.disabled = false; }
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
        <div class="com-card" style="background:rgba(255,255,224,0.7); padding:15px; border-radius:10px; margin-bottom:10px;">
            <p style="font-style:italic;">"${m.commentaire}"</p>
            <p style="text-align:right; font-weight:bold;">— ${m.nom}</p>
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
/**
async function ajouterCommentaireDirect() {
    const com = document.getElementById('commentaireSaisieSeule').value.trim();
    const nom = document.getElementById('nomPersonne').value.trim();

    if (!nom) return alert("Indiquez votre prénom en haut de page !");
    if (!com) return alert("Le message est vide...");

    const btn = document.getElementById('btnCom');
    btn.disabled = true;
    btn.innerText = "Envoi...";
    
    try {
        await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: "insertCommentaire", 
                nom: nom, 
                commentaire: com }) 
        });
        document.getElementById('commentaireSaisieSeule').value = "";
        await chargerDonnees();
    } catch (e) { alert("Erreur lors de l'envoi"); }
    finally { btn.disabled = false; }
}
**/
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
mettreAJourCompteARebours();
chargerDonnees();
