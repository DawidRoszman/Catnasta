/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ppjz9sedpksupn0")

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_s48MZce` ON `games` (`gameId`)"
  ]

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zvnrnx96",
    "name": "gameId",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ppjz9sedpksupn0")

  collection.indexes = []

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zvnrnx96",
    "name": "gameId",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
})
