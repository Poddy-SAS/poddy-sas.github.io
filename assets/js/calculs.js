const VAT = 0.20;

const HOME_LAT = 45.7223;
const HOME_LON = 1.2458;

const pricingRules = {
  DPE: { base: 100, increment: 15 },
  GAZ: { base: 80, increment: 10 },
  ELEC: { base: 80, increment: 10 },
  PLOMB: { base: 90, increment: 10 },
  TERMITE: { base: 85, increment: 8 },
  AMIANTE: { base: 90, increment: 10 },
  MESURAGE: { base: 60, increment: 10 }
};

const diagnosticNames = {
  DPE: "Diagnostic de performance énergétique (DPE)",
  GAZ: "Diagnostic gaz",
  ELEC: "Diagnostic électricité",
  PLOMB: "Constat de risque d'exposition au plomb (CREP)",
  AMIANTE: "Repérage amiante",
  TERMITE: "État relatif à la présence de termites",
  MESURAGE: "Mesurage surface (Loi Carrez / Loi Boutin)"
};

function getPrice(rule, index) {
  return rule.base + (rule.increment * index);
}

function detectDiagnostics() {

  let diagnostics = [];

  const transaction = document.querySelector('input[name="transaction"]:checked').value;
  const constructionYear = parseInt(document.getElementById("constructionYear").value.trim());
  const gasAge = document.getElementById("gasAge").value;
  const elecAge = document.getElementById("elecAge").value;
  const termite = document.getElementById("termite").checked;

  diagnostics.push({code:"DPE", reason:"Diagnostic de performance énergétique obligatoire"});

  if (gasAge === "yes") {
    diagnostics.push({code:"GAZ", reason:"Installation gaz de plus de 15 ans"});
  }

  if (elecAge === "yes") {
    diagnostics.push({code:"ELEC", reason:"Installation électrique de plus de 15 ans"});
  }

  if (constructionYear < 1949) {
    diagnostics.push({code:"PLOMB", reason:"Permis de construire antérieur à 1949"});
  }

  if (constructionYear < 1997) {
    diagnostics.push({code:"AMIANTE", reason:"Permis de construire antérieur au 01/07/1997"});
  }

  if (termite) {
    diagnostics.push({code:"TERMITE", reason:"Zone termite potentielle"});
  }

  if (transaction === "vente") {
    diagnostics.push({code:"MESURAGE", reason:"Mesurage Loi Carrez (vente)"});
  }

  if (transaction === "location") {
    diagnostics.push({code:"MESURAGE", reason:"Mesurage Loi Boutin (location)"});
  }

  return diagnostics;
}

async function getDistance(lat1, lon1, lat2, lon2) {

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${lon1},${lat1};${lon2},${lat2}?overview=false`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    alert("Impossible de calculer la distance");
    return 0;
  }

  // meters → km
  return data.routes[0].distance / 1000;
}

async function getCoordinates(postalCode) {

  const url = `https://nominatim.openstreetmap.org/search?country=France&postalcode=${postalCode}&format=json&addressdetails=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.length === 0) {
    alert("Code postal introuvable");
    return null;
  }

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    city: data[0].address.city || 
        data[0].address.town || 
        data[0].address.village || 
        data[0].address.municipality || 
        postalCode
  };

}

async function calculate() {

const postalCode = document.getElementById("postalCode").value.trim();
const constructionYear = document.getElementById("constructionYear").value.trim();

const errorBox = document.getElementById("formError");
errorBox.innerText = "";

if (!postalCode) {
  errorBox.innerText = "Veuillez entrer un code postal.";
  return;
}

if (!constructionYear) {
  errorBox.innerText = "Veuillez entrer l'année du permis de construire.";
  return;
}

if (constructionYear < 1000 || constructionYear > new Date().getFullYear()) {
  errorBox.innerText = "Veuillez entrer une année de construction valide.";
  return;
}

if (postalCode.length !== 5) {
  errorBox.innerText = "Le code postal doit contenir 5 chiffres.";
  return;
}

const resultBox = document.getElementById("result");

resultBox.style.display = "block";
resultBox.innerHTML =
'<div class="loading-calculation">Calcul en cours...</div>';

resultBox.scrollIntoView({
  behavior: "smooth",
  block: "start"
});

  const index = parseInt(document.getElementById("propertyType").value);
  

  let totalHT = 0;

  const diagnostics = detectDiagnostics();

  let breakdown = [];

  diagnostics.forEach(d => {

  const price = getPrice(pricingRules[d.code], index);

  totalHT += price;

  breakdown.push({
  name: diagnosticNames[d.code],
  reason: d.reason,
  price: price
});

});

  const coords = await getCoordinates(postalCode);

  if (!coords) return;

  const distance = await getDistance(
    HOME_LAT,
    HOME_LON,
    coords.lat,
    coords.lon
  );

  const city = coords.city;

  const distanceCost = distance * 1;

  totalHT += distanceCost;

  breakdown.push({
  name: "Déplacement",
  reason: "Distance calculée jusqu'à " + city,
  price: distanceCost
});

  let discountRate = 0;

  if (diagnostics.length === 2) discountRate = 0.10;
  if (diagnostics.length === 3) discountRate = 0.20;
  if (diagnostics.length === 4) discountRate = 0.30;
  if (diagnostics.length >= 5) discountRate = 0.40;

  const subtotal = totalHT;

const discountAmount = subtotal * discountRate;

totalHT = subtotal - discountAmount;

  const totalTTC = totalHT * (1 + VAT);

  let html = "<h3>Détail du calcul</h3>";

html += "<table>";

breakdown.forEach(item => {

html += `
<tr>
<td>
<strong>${item.name}</strong><br>
<small>${item.reason}</small>
</td>
<td>${item.price.toFixed(2)} €</td>
</tr>
`;

});


html += `
<tr class="subtotal">
  <td><strong>Sous-total</strong></td>
  <td><strong>${subtotal.toFixed(2)} €</strong></td>
</tr>
`;

if (discountRate > 0) {

  html += `
<tr class="discount">
  <td>Remise (${discountRate * 100}%)</td>
  <td>- ${discountAmount.toFixed(2)} €</td>
</tr>
`;

}

html += `
<tr class="total-ht">
  <td><strong>Total HT</strong></td>
  <td><strong>${totalHT.toFixed(2)} €</strong></td>
</tr>

<tr class="total-ttc">
  <td><strong>Total TTC</strong></td>
  <td><strong>${totalTTC.toFixed(2)} €</strong></td>
</tr>
`;

html += "</table>";

html += `
<p style="margin-top:15px;font-size:13px;color:#666;">
Estimation indicatif calculé automatiquement.<br>
Les obligations réglementaires peuvent varier selon la situation du bien.<br>
Les prix affichés incluent la TVA au taux en vigueur (20%).
</p>

<div style="margin-top:20px;font-size:14px;color:#444;">
<strong>Comment est calculé le tarif ?</strong>
<ul style="margin-top:8px;">
<li>le type de bien (Studio à T24)</li>
<li>les diagnostics obligatoires selon l'année de construction</li>
<li>l'âge des installations gaz et électricité</li>
<li>la distance entre le bien et notre agence (1 € HT / km)</li>
<li>une remise appliquée selon le nombre de diagnostics (jusqu'à -40%)</li>
</ul>
</div>
`;

html += `
<div style="margin-top:25px;text-align:center;">
<p style="margin-bottom:10px;">
Pour un devis précis, contactez-nous.
</p>

<a href="../index.html#contact" class="main-red-button">
Demander un devis
</a>
</div>
`;

document.getElementById("result").style.display = "block";
document.getElementById("result").innerHTML = html;

}

const postalInput = document.getElementById("postalCode");

postalInput.addEventListener("input", function () {

  this.value = this.value.replace(/\D/g, "");

});