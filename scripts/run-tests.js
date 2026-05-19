require('./mock-wx')
const test = require('../utils/test-utils')
const storage = require('../utils/storage')
const util = require('../utils/util')

function runAllTests() {
  testStorageModule()
  testUtilModule()
  testIdGeneration()
  testDataIntegrity()
}

function testStorageModule() {
  test.createSuite('Storage Module')

  storage.clearAllData()

  test.assertArrayLength(storage.getCharacters(), 0, 'Initial characters should be empty')
  test.assertArrayLength(storage.getContents(), 0, 'Initial contents should be empty')

  const char = storage.addCharacter({ name: '张三', nickname: '三哥', remark: '测试' })
  test.assertNotNull(char, 'Should add character')
  test.assertTrue(char.id && char.id.length > 5, 'Character should have valid id')
  test.assertEqual(char.name, '张三', 'Character name should be set')
  test.assertEqual(char.contentCount, 0, 'New character should have 0 content count')

  test.assertArrayLength(storage.getCharacters(), 1, 'Should have 1 character')
  test.assertNotNull(storage.getCharacterById(char.id), 'Should find character by id')
  test.assertEqual(storage.getCharacterById('nonexistent'), null, 'Should return null for invalid id')

  const updated = storage.updateCharacter(char.id, { nickname: '三爷', remark: '已更新' })
  test.assertEqual(updated.nickname, '三爷', 'Should update nickname')
  test.assertEqual(updated.remark, '已更新', 'Should update remark')
  test.assertEqual(updated.name, '张三', 'Unchanged field should remain')

  const content = storage.addContent({
    characterId: char.id,
    text: '这是一条测试语录',
    tags: ['经典'],
    images: []
  })
  test.assertNotNull(content, 'Should add content')
  test.assertEqual(content.text, '这是一条测试语录', 'Content text should be set')
  test.assertFalse(content.isFavorite, 'Content should not be favorite by default')

  const reloadedChar = storage.getCharacterById(char.id)
  test.assertEqual(reloadedChar.contentCount, 1, 'Character contentCount should be 1')

  test.assertArrayLength(storage.getContents(char.id), 1, 'Should get contents by characterId')
  test.assertArrayLength(storage.getContents('nonexistent'), 0, 'Should get empty for unknown character')

  const favResult = storage.toggleFavorite(content.id)
  test.assertTrue(favResult && favResult.isFavorite, 'Should toggle favorite to true')

  const favs = storage.getFavorites()
  test.assertArrayLength(favs, 1, 'Should have 1 favorite')

  storage.toggleFavorite(content.id)
  test.assertArrayLength(storage.getFavorites(), 0, 'Should have 0 favorites after untoggle')

  storage.deleteContent(content.id)
  test.assertArrayLength(storage.getContents(char.id), 0, 'Should delete content')

  const reloadedAfterDelete = storage.getCharacterById(char.id)
  test.assertEqual(reloadedAfterDelete.contentCount, 0, 'Character contentCount should reset')

  storage.deleteCharacter(char.id)
  test.assertArrayLength(storage.getCharacters(), 0, 'Should delete character')

  storage.clearAllData()

  test.getResults()
}

function testUtilModule() {
  test.createSuite('Util Module')

  test.assertEqual(util.formatTime(Date.now()), '刚刚', 'Just now should be "刚刚"')

  const oneHourAgo = Date.now() - 3600000 - 1000
  test.assertEqual(util.formatTime(oneHourAgo), '1小时前', 'One hour ago should be "1小时前"')

  test.assertEqual(util.getContentPreview('Hello World', 5), 'Hello...', 'Content preview should truncate')
  test.assertEqual(util.getContentPreview('Hi'), 'Hi', 'Short text should not truncate')

  test.assertEqual(util.getCharCount('hello'), 5, 'Char count should be correct')
  test.assertEqual(util.getCharCount(''), 0, 'Empty string should have 0 chars')

  const tags = util.getDefaultTags()
  test.assertTrue(tags.length > 5, 'Default tags should have items')
  test.assertTrue(tags.includes('经典语录'), 'Should include "经典语录"')

  test.getResults()
}

function testIdGeneration() {
  test.createSuite('ID Generation')

  const id1 = storage.generateId()
  const id2 = storage.generateId()

  test.assertTrue(id1.length > 10, 'ID should be long enough')
  test.assertTrue(id1 !== id2, 'IDs should be unique')

  test.getResults()
}

function testDataIntegrity() {
  test.createSuite('Data Integrity')

  storage.clearAllData()

  const char = storage.addCharacter({
    name: ' 测试用户 ',
    nickname: '  user  ',
    remark: '  备注  '
  })
  test.assertEqual(char.name, '测试用户', 'Name should be trimmed')
  test.assertEqual(char.nickname, 'user', 'Nickname should be trimmed')
  test.assertEqual(char.remark, '备注', 'Remark should be trimmed')

  test.assertThrows(() => storage.addCharacter({ name: '' }), 'Empty name should throw')
  test.assertThrows(() => storage.addCharacter({ name: 'A'.repeat(30) }), 'Too long name should throw')

  test.assertThrows(() => storage.addContent({ characterId: '' }), 'Empty characterId should throw')
  test.assertThrows(() => storage.addContent({ characterId: null }), 'Null characterId should throw')

  test.assertThrows(() => storage.savePassword('ab'), 'Short password should throw')

  const stats = storage.getStats()
  test.assertEqual(stats.characterCount, 1, 'Stats should reflect character count')

  const exportData = storage.exportAllData()
  test.assertTrue(exportData.indexOf('集英社') > -1, 'Export should contain app name')

  storage.clearAllData()
  test.assertTrue(storage.importData(exportData), 'Should import valid data')
  test.assertArrayLength(storage.getCharacters(), 1, 'Imported characters should restore')

  storage.clearAllData()

  test.getResults()
}

if (require.main === module) {
  runAllTests()
}

module.exports = { runAllTests }