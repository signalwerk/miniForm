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
    const form = $app.findRecordById("forms", id);

    if (!form || !form.getBool("published")) {
      return c.json(404, { error: "Form not found" });
    }

    let body = {};
    try {
      body = c.requestInfo().data || {};
    } catch (_) {
      return c.json(400, { error: "Invalid JSON body" });
    }

    if (body.formId && body.formId !== id) {
      return c.json(400, { error: "Form id mismatch" });
    }

    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return c.json(400, { error: "Answers are required" });
    }

    const responsesCollection = $app.findCollectionByNameOrId("responses");
    const response = new Record(responsesCollection);

    response.set("survey", form.id);
    response.set("data", {
      formId: id,
      languageId: body.languageId ?? null,
      answers: body.answers,
      submittedAt: (new Date()).toISOString(),
    });
    response.set("processing", {
      status: "pending",
      attempts: 0,
    });

    $app.save(response);

    return c.json(201, {
      success: true,
      id: response.id,
      success: true,
    });
  } catch (err) {
    console.log(err);
    return c.json(500, { error: "Failed to submit form" });
  }
});