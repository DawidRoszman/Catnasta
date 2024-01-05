/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ysaq9nokwm5lom6",
    "created": "2024-01-05 14:26:20.858Z",
    "updated": "2024-01-05 14:26:20.858Z",
    "name": "chat",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "s8ys15vu",
        "name": "username",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "zdhjtpnd",
        "name": "message",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ysaq9nokwm5lom6");

  return dao.deleteCollection(collection);
})
