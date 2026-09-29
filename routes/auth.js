const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/signup/google', authController.signupGoogle);
router.post('/signup/microsoft', authController.signupMicrosoft);
router.post('/signin', authController.signin);
router.post('/signin/google', authController.signinGoogle);
router.post('/signin/microsoft', authController.signinMicrosoft);

module.exports = router;
