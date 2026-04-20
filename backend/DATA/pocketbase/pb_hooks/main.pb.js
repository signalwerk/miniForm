/// <reference path="../pb_data/types.d.ts" />

routerAdd("OPTIONS", "/api/surveys/public/{id}", (c) => {
  const { applyPublicCors } = require(__hooks + "/cors.js");
  applyPublicCors(c);
  return c.noContent(204);
});

routerAdd("GET", "/api/surveys/public/{id}", (c) => {
  const { applyPublicCors } = require(__hooks + "/cors.js");
  applyPublicCors(c);

  const id = c.request.pathValue("id");

  try {
    const record = $app.findRecordById("surveys", id);

    // allow only published surveys
    if (!record.getBool("published")) {
      return c.json(404, { error: "Survey not found" });
    }

    // return only the JSON data field
    return c.json(200, record.get("data"));
  } catch (err) {
    return c.json(404, { error: "Survey not found" });
  }
});

routerAdd("POST", "/api/surveys/public/{id}", (c) => {
  const { applyPublicCors } = require(__hooks + "/cors.js");
  applyPublicCors(c);

  const id = c.request.pathValue("id");

  try {
    const survey = $app.findRecordById("surveys", id);

    if (!survey || !survey.getBool("published")) {
      return c.json(404, { error: "Survey not found" });
    }

    let body = {};
    try {
      body = c.requestInfo().body || {};
    } catch (_) {
      return c.json(400, { error: "Invalid JSON body" });
    }

    if (body.surveyId && body.surveyId !== id) {
      return c.json(400, { error: "Survey id mismatch" });
    }

    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return c.json(400, { error: "Answers are required" });
    }

    const responsesCollection = $app.findCollectionByNameOrId("responses");
    const response = new Record(responsesCollection);

    response.set("survey", survey.id);
    response.set("data", {
      surveyId: id,
      languageId: body.languageId ?? null,
      answers: body.answers,
      submittedAt: new Date().toISOString(),
    });
    response.set("processing", {
      status: "pending",
      attempts: 0,
    });

    $app.save(response);

    return c.json(201, {
      id: response.id,
      success: true,
    });
  } catch (err) {
    console.log(err);
    return c.json(500, { error: "Failed to submit survey" });
  }
});
