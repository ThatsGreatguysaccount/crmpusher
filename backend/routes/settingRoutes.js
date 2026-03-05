const router = require('express').Router();
const { getConnectionInfo } = require('../controllers/settingController');
const authenticate = require('../middleware/auth');

router.get('/connection', authenticate, getConnectionInfo);

module.exports = router;
