/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      id: "mini_form_forms",
      name: "forms",
      type: "base",
      system: false,
      fields: [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "cascadeDelete": false,
          "collectionId": "_pb_users_auth_",
          "hidden": false,
          id: "forms_owner",
          "maxSelect": 1,
          "minSelect": 0,
          displayFields: ["name", "email"],
          name: "owner",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
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
          id: "forms_publish",
          name: "published",
          type: "bool",
          required: false,
          presentable: false,
          hidden: false,
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

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("forms");

    return app.delete(collection);
  },
);
