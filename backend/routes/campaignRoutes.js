const router = require('express').Router();
const ctrl = require('../controllers/campaignController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/toggle', ctrl.toggle);
router.post('/:id/test', ctrl.testConnection);

module.exports = router;
