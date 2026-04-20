/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  const record = e.record;

  if (record.collection().name !== "responses") {
    return;
  }

  const processing = {
    startedAt: new Date().toISOString(),
    status: "pending",
    handlers: [],
  };

  try {
    const responseData = record.get("data");
    if (!responseData || !responseData.formId) {
      processing.status = "skipped";
      processing.reason = "missing data.formId";
      processing.finishedAt = new Date().toISOString();

      record.set("processing", processing);
      $app.save(record);

      console.log("responses hook: missing data.formId");
      return;
    }

    const form = $app.findRecordById("forms", responseData.formId);
    if (!form) {
      processing.status = "failed";
      processing.reason = `form not found: ${responseData.formId}`;
      processing.finishedAt = new Date().toISOString();

      record.set("processing", processing);
      $app.save(record);

      console.log("responses hook: form not found:", responseData.formId);
      return;
    }

    const settings = form.get("settings") || {};
    const handlers = Array.isArray(settings.handlers) ? settings.handlers : [];
    const emailHandlers = handlers.filter((h) => h && h.type === "email");

    if (!emailHandlers.length) {
      processing.status = "skipped";
      processing.reason = "no email handlers configured";
      processing.finishedAt = new Date().toISOString();

      record.set("processing", processing);
      $app.save(record);

      console.log("responses hook: no email handlers configured");
      return;
    }

    const answers = Array.isArray(responseData.answers)
      ? responseData.answers
      : [];

    const answersText = answers
      .map((a) => {
        const label = a?.label || a?.key || a?.id || "Field";
        const value =
          a?.value === null || a?.value === undefined || a?.value === ""
            ? "-"
            : typeof a.value === "object"
              ? JSON.stringify(a.value, null, 2)
              : String(a.value);

        return `${label}: ${value}`;
      })
      .join("\n");

    let successCount = 0;
    let failedCount = 0;

    for (const handler of emailHandlers) {
      const handlerResult = {
        id: handler.id || null,
        type: handler.type || "email",
        to: handler.to || null,
        subject: handler.subject || null,
        startedAt: new Date().toISOString(),
        status: "pending",
      };

      try {
        if (!handler.to) {
          throw new Error("missing recipient in handler.to");
        }

        const subject =
          handler.subject ||
          `New form response: ${form.get("title") || form.id}`;
        const intro = handler.message || "A new form response was submitted.";

        const body = [
          intro,
          "",
          `Form: ${form.get("title") || form.id}`,
          `Form ID: ${responseData.formId}`,
          `Response ID: ${record.id}`,
          responseData.languageId
            ? `Language ID: ${responseData.languageId}`
            : null,
          "",
          "Answers:",
          answersText || "-",
        ]
          .filter(Boolean)
          .join("\n");

        const message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName,
          },
          to: [{ address: handler.to }],
          subject: subject,
          text: body,
        });

        $app.newMailClient().send(message);

        handlerResult.status = "success";
        handlerResult.finishedAt = new Date().toISOString();
        successCount++;
      } catch (err) {
        handlerResult.status = "failed";
        handlerResult.finishedAt = new Date().toISOString();
        handlerResult.error = String(err);
        failedCount++;

        console.log(
          "responses hook: failed sending handler",
          handler.id || "(no id)",
          String(err),
        );
      }

      processing.handlers.push(handlerResult);

      // persist after each handler so partial progress is kept
      record.set("processing", {
        ...processing,
        status: "running",
        successCount,
        failedCount,
        updatedAt: new Date().toISOString(),
      });
      $app.save(record);
    }

    processing.successCount = successCount;
    processing.failedCount = failedCount;
    processing.finishedAt = new Date().toISOString();
    processing.status =
      failedCount === 0
        ? "success"
        : successCount === 0
          ? "failed"
          : "partial_success";

    record.set("processing", processing);
    $app.save(record);
  } catch (err) {
    processing.status = "failed";
    processing.error = String(err);
    processing.finishedAt = new Date().toISOString();

    try {
      record.set("processing", processing);
      $app.save(record);
    } catch (saveErr) {
      console.log(
        "responses hook: failed saving processing state:",
        String(saveErr),
      );
    }

    console.log("responses hook error:", String(err));
  }
}, "responses");
