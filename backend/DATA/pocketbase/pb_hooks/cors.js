module.exports.applyPublicCors = function (c) {
  c.response.header().set("Access-Control-Allow-Origin", "*");
  c.response.header().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.response.header().set("Access-Control-Allow-Headers", "Content-Type");
};
