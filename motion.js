/* Portail propriétaire — déclencheurs de mouvement. Ce script ne lit ni ne modifie les données,
   ne fait aucun appel réseau et n'altère pas le comportement de l'application. */
(function () {
  "use strict";
  var body = document.body, timer = 0;

  function pulse() {
    body.setAttribute("data-motion", "on");
    window.clearTimeout(timer);
    timer = window.setTimeout(function () { body.removeAttribute("data-motion"); }, 450);
  }

  // Première apparition du tableau (l'actualisation automatique ne rejoue pas l'animation).
  var dashboard = document.getElementById("dashboard"), shown = false;
  if (dashboard) {
    var reveal = function () {
      if (!shown && !dashboard.classList.contains("hidden")) { shown = true; pulse(); }
    };
    new MutationObserver(reveal).observe(dashboard, { attributes: true, attributeFilter: ["class"] });
    reveal();
  }

  // Actions de la personne : changement de période et bouton Actualiser.
  document.addEventListener("change", function (event) {
    if (event.target && event.target.id === "period") pulse();
  }, true);
  document.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest("#apply-period")) pulse();
  }, true);
})();


