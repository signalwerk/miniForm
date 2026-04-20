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
    const responseData = new DynamicModel({
      formId: "",
      languageId: "",
      answers: [],
    });

    record.unmarshalJSONField("data", responseData);

    if (!responseData.formId) {
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

    const settings = new DynamicModel({
      handlers: [],
    });
    form.unmarshalJSONField("settings", settings);

    const handlers = Array.isArray(settings.handlers) ? settings.handlers : [];
    const emailHandlers = handlers.filter((h) => h && h.type === "email");

    if (!emailHandlers.length) {
      processing.status = "skipped";
      processing.reason = "no email handlers configured";
      processing.finishedAt = new Date().toISOString();

      record.set("processing", processing);
      $app.save(record);
      return;
    }

    const answers = Array.isArray(responseData.answers)
      ? responseData.answers
      : [];

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    const answersText = answers
      .map((a) => {
        const label = a?.label || a?.id || "Field";
        const value =
          a?.value === null || a?.value === undefined || a?.value === ""
            ? "-"
            : typeof a.value === "object"
              ? JSON.stringify(a.value, null, 2)
              : String(a.value);

        return `${label}\n${value}`;
      })
      .join("\n\n");

    const answersHtml = answers.length
      ? answers
          .map((a) => {
            const label = escapeHtml(a?.label || a?.id || "Field");

            let value = "-";
            if (
              a?.value !== null &&
              a?.value !== undefined &&
              a?.value !== ""
            ) {
              value =
                typeof a.value === "object"
                  ? escapeHtml(JSON.stringify(a.value, null, 2))
                  : escapeHtml(String(a.value));
            }

            return `
            <section style="margin: 0 0 20px 0;">
              <h2 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600;">
                ${label}
              </h2>
              <div style="margin: 0; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">
                ${value}
              </div>
            </section>
          `;
          })
          .join("")
      : `<p style="margin: 0; font-size: 14px; line-height: 1.5;">No answers submitted.</p>`;

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

        const textBody = [
          intro,
          "",
          `Form: ${form.get("title") || form.id}`,
          `Form ID: ${responseData.formId}`,
          `Response ID: ${record.id}`,
          responseData.languageId
            ? `Language ID: ${responseData.languageId}`
            : null,
          "",
          answersText,
        ]
          .filter(Boolean)
          .join("\n");

        const htmlBody = `
          <!doctype html>
          <html>
            <body style="margin:0; padding:24px; font-family: Arial, Helvetica, sans-serif; color:#111;">
              <div style="max-width:640px;">
                <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
                  ${escapeHtml(intro)}
                </p>

                <div style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.5;">
                  <div><strong>Form:</strong> ${escapeHtml(form.get("title") || form.id)}</div>
                  <div><strong>Form ID:</strong> ${escapeHtml(responseData.formId)}</div>
                  <div><strong>Response ID:</strong> ${escapeHtml(record.id)}</div>
                  ${responseData.languageId ? `<div><strong>Language ID:</strong> ${escapeHtml(responseData.languageId)}</div>` : ""}
                </div>

                ${answersHtml}
              </div>
            </body>
          </html>
        `;

        const message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName,
          },
          to: [{ address: handler.to }],
          subject,
          text: textBody,
          html: htmlBody,
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
