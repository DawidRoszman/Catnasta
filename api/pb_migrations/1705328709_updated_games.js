/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ppjz9sedpksupn0")

  // add
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
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ppjz9sedpksupn0")

  // remove
  collection.schema.removeField("zvnrnx96")

  return dao.saveCollection(collection)
})
