const VAT = 0.20;

const HOME_LAT = 45.7223;
const HOME_LON = 1.2458;

const pricingRules = {
  DPE: { base: 100, increment: 15 },
  GAZ: { base: 80, increment: 5 },
  ELEC: { base: 80, increment: 5 },
  PLOMB: { base: 80, increment: 10 },
  TERMITE: { base: 85, increment: 5 },
  AMIANTE: { base: 90, increment: 10 },
  MESURAGE: { base: 70, increment: 5 }
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

  const copro = document.getElementById("copropriete").checked;

if (transaction === "vente" && copro) {
diagnostics.push({code:"MESURAGE", reason:"Mesurage Loi Carrez (copropriété)"});
}

  if (transaction === "location") {
    diagnostics.push({code:"MESURAGE", reason:"Mesurage Loi Boutin (location)"});
  }

  return diagnostics;
}

function getDistance(lat1, lon1, lat2, lon2){

const R = 6371;

const dLat = (lat2-lat1) * Math.PI/180;
const dLon = (lon2-lon1) * Math.PI/180;

const a =
Math.sin(dLat/2) * Math.sin(dLat/2) +
Math.cos(lat1*Math.PI/180) *
Math.cos(lat2*Math.PI/180) *
Math.sin(dLon/2) *
Math.sin(dLon/2);

const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

return R * c;

}

function getCoordinates(postalCode){

if(!postalDB[postalCode]){
alert("Code postal non disponible hors ligne");
return null;
}

return postalDB[postalCode];

}

async function calculate() {

try {

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

  const distance = getDistance(
HOME_LAT,
HOME_LON,
coords.lat,
coords.lon
);

  const city = coords.city;

  const distanceCost = distance * 1;

const partnerDiscount = document.getElementById("partnerDiscount").checked;

totalHT += distanceCost;

breakdown.push({
name: "Déplacement",
reason: "Distance calculée jusqu'à " + city,
price: distanceCost
});

const diagnosticCount = diagnostics.filter(d => d.code !== "MESURAGE").length;

  let discountRate = 0;

if (diagnosticCount === 2) discountRate = 0.10;
if (diagnosticCount === 3) discountRate = 0.20;
if (diagnosticCount === 4) discountRate = 0.30;
if (diagnosticCount >= 5) discountRate = 0.40;
  const subtotal = totalHT;

const discountAmount = subtotal * discountRate;

totalHT = subtotal - discountAmount;

const vatAmount = totalHT * VAT;

  const totalTTC = totalHT * (1 + VAT);

  let html = "<h3>Détail du calcul</h3>";

html += "<table>";

breakdown.push({
name: "ERP (État des risques et pollution)",
reason: "Inclus gratuitement",
price: 0
});

breakdown.forEach(item => {

html += `
<tr>
<td>
<strong>${item.name}</strong><br>
<small>${item.reason}</small>
</td>
<td>${item.price === 0 ? "Offert" : item.price.toFixed(2) + " €"}</td>
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

if (partnerDiscount) {

html += `
<tr class="discount">
<td>Remise partenaire - Frais de déplacement offerts</td>
<td>- ${distanceCost.toFixed(2)} €</td>
</tr>
`;

}

html += `
<tr class="total-ht">
  <td><strong>Total HT</strong></td>
  <td><strong>${totalHT.toFixed(2)} €</strong></td>
</tr>

<tr class="vat">
  <td>TVA (20%)</td>
  <td>${vatAmount.toFixed(2)} €</td>
</tr>

<tr class="total-ttc">
  <td><strong>Total TTC</strong></td>
  <td><strong>${totalTTC.toFixed(2)} €</strong></td>
</tr>
`;

html += "</table>";

html += `
<p style="margin-top:15px;font-size:13px;color:#666;">
Estimation indicative calculée automatiquement.
Le tarif définitif peut être ajusté après analyse du bien et confirmation des diagnostics nécessaires.<br>
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

<div class="result-contact">

<p class="result-contact-text">
Besoin d'un devis précis ou d'un rendez-vous rapide ?
</p>

<div class="result-buttons">

<a href="javascript:void(0);" class="main-red-button" onclick="sendEstimate()">
Transformer cette estimation en devis
</a>

</div>

</div>
`;

document.getElementById("result").style.display = "block";
document.getElementById("result").innerHTML = html;

}

catch(error){

console.error("Calculation error:", error);

document.getElementById("result").innerHTML =
"<p style='color:red'>Une erreur est survenue pendant le calcul.</p>";

}

};

function sendEstimate(){

const resultBox = document.getElementById("result");

// clone the result so we can modify it without touching the page
const cleanResult = resultBox.cloneNode(true);

// remove explanation section
const explanations = cleanResult.querySelectorAll("ul");
explanations.forEach(el => el.remove());

// remove unwanted elements
const links = cleanResult.querySelectorAll("a");
links.forEach(el => el.remove());

const buttons = cleanResult.querySelectorAll("button");
buttons.forEach(el => el.remove());

const text = cleanResult.innerText;

localStorage.setItem("poddy_estimation", text);

window.location.href = "../index.html#contact";

}