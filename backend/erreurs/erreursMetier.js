// Ce fichier définit les erreurs métier transmises au gestionnaire HTTP.
class ErreurMetier extends Error {
  constructor(message, statut = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statut = statut;
  }
}

// Ces classes donnent un statut HTTP clair aux erreurs courantes.
class DonneesInvalides extends ErreurMetier { constructor(message) { super(message, 400); } }
class Interdit extends ErreurMetier { constructor(message) { super(message, 403); } }
class NonTrouve extends ErreurMetier { constructor(message) { super(message, 404); } }
class Conflit extends ErreurMetier { constructor(message) { super(message, 409); } }

// Les couches métier importent ces types sans dépendre d'Express.
module.exports = { ErreurMetier, DonneesInvalides, Interdit, NonTrouve, Conflit };
