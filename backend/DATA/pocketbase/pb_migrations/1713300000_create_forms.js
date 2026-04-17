migrate(
  (db) => {
    const collection = new Collection({
      id: "mini_form_forms",
      created: "2026-04-16 00:00:00.000Z",
      updated: "2026-04-16 00:00:00.000Z",
      name: "forms",
      type: "base",
      system: false,
      schema: [
        {
          system: false,
          id: "forms_owner",
          name: "owner",
          type: "relation",
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: "_pb_users_auth_",
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
            displayFields: ["name", "email"],
          },
        },
        {
          system: false,
          id: "forms_formid",
          name: "formId",
          type: "text",
          required: true,
          presentable: false,
          unique: true,
          options: {
            min: 1,
            max: 0,
            pattern: "",
          },
        },
        {
          system: false,
          id: "forms_title",
          name: "title",
          type: "text",
          required: true,
          presentable: true,
          unique: false,
          options: {
            min: 1,
            max: 0,
            pattern: "",
          },
        },
        {
          system: false,
          id: "forms_description",
          name: "description",
          type: "text",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: 0,
            max: 0,
            pattern: "",
          },
        },
        {
          system: false,
          id: "forms_data",
          name: "data",
          type: "json",
          required: true,
          presentable: false,
          unique: false,
          options: {
            maxSize: 0,
          },
        },
      ],
      indexes: ["CREATE INDEX `idx_forms_owner` ON `forms` (`owner`)"],
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != '' && owner = @request.auth.id",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
      options: {},
    });

    return Dao(db).saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("forms");

    return dao.deleteCollection(collection);
  },
);
