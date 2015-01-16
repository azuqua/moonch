function ParseError(message) {
  this.name = 'ParseError';
  this.message = message || 'Unspecified error in parsing Moonch template';
}
ParseError.prototype = Error.prototype;
ParseError.prototype.constructor = ParseError;

module.exports.ParseError = ParseError;
