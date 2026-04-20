/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/forms/public/{id}", (c) => {
  const id = c.request.pathValue("id");

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
