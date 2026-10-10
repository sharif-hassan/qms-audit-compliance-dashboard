const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");

function makeToken(role = "ADMIN", userId = 1) {
  return jwt.sign({ userId, role, email: `${role.toLowerCase()}@example.com` }, process.env.JWT_SECRET);
}

// Supertest client that sends a bearer token for the given role.
function api(role = "ADMIN") {
  const header = `Bearer ${makeToken(role)}`;
  return {
    get:    (url) => request(app).get(url).set("Authorization", header),
    post:   (url) => request(app).post(url).set("Authorization", header),
    patch:  (url) => request(app).patch(url).set("Authorization", header),
    delete: (url) => request(app).delete(url).set("Authorization", header),
  };
}

module.exports = { api, makeToken };
