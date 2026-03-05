const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/leadController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/:leadId/retry', ctrl.retry);

module.exports = router;
