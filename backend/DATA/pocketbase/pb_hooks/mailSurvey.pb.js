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

    const answersHtml = answers.length
      ? answers
          .map((a) => {
            const label = escapeHtml(a?.label || a?.id || "Field");
            const rawValue = a?.value;

            let valueHtml = `<div style="font-size: 14px; line-height: 1.5;">-</div>`;

            if (Array.isArray(rawValue)) {
              valueHtml = rawValue.length
                ? `
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.5;">
              ${rawValue.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}
            </ul>
          `
                : `<div style="font-size: 14px; line-height: 1.5;">-</div>`;
            } else if (
              rawValue !== null &&
              rawValue !== undefined &&
              rawValue !== ""
            ) {
              const value =
                typeof rawValue === "object"
                  ? escapeHtml(JSON.stringify(rawValue, null, 2))
                  : escapeHtml(String(rawValue));

              valueHtml = `<div style="margin: 0; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${value}</div>`;
            }

            return `
        <section style="margin: 0 0 20px 0;">
          <h2 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600;">
            ${label}
          </h2>
          ${valueHtml}
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

        const htmlBody = `
          <!doctype html>
          <html>
            <body style="margin:0; padding:24px; font-family: Arial, Helvetica, sans-serif; color:#111;">
              <div style="max-width:640px;margin:0 auto;">
                <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
                  ${escapeHtml(intro)}
                </p>

                ${answersHtml}

                <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

                <div style="margin: 0 0 24px 0; font-size: 8px; line-height: 1.5;">
                  <div><strong>Form:</strong> ${escapeHtml(form.get("title") || form.id)}</div>
                  <div><strong>Form ID:</strong> ${escapeHtml(responseData.formId)}</div>
                  <div><strong>Response ID:</strong> ${escapeHtml(record.id)}</div>
                  ${responseData.languageId ? `<div><strong>Language ID:</strong> ${escapeHtml(responseData.languageId)}</div>` : ""}
                </div>
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
