/// <reference path="../pb_data/types.d.ts" />

const applyPublicCors = (c) => {
  c.response.header().set("Access-Control-Allow-Origin", "*");
  c.response.header().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.response.header().set("Access-Control-Allow-Headers", "Content-Type");
};

routerAdd("OPTIONS", "/api/forms/public/{id}", (c) => {
  applyPublicCors(c);
  return c.noContent(204);
});

routerAdd("GET", "/api/forms/public/{id}", (c) => {
  const id = c.request.pathValue("id");

  applyPublicCors(c);

  try {
    // fetch the form record by id
    const record = $app.findRecordById("forms", id);

    // allow only published forms
    if (!record.getBool("published")) {
      return c.json(404, { error: "Form not found" });
    }

    // return only the JSON data field
    return c.json(200, record.get("data"));
  } catch (err) {
    return c.json(404, { error: "Form not found" });
  }
});

routerAdd("POST", "/api/forms/public/{id}", (c) => {
  const id = c.request.pathValue("id");

  applyPublicCors(c);

  try {
    const record = $app.findRecordById("forms", id);

    if (!record.getBool("published")) {
      return c.json(404, { error: "Form not found" });
    }

    return c.json(200, { success: true });
  } catch (err) {
    return c.json(404, { error: "Form not found" });
  }
});
