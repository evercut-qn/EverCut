import { Router } from 'express';

import * as mediaController from '../controllers/media.controller.js';
import authenticate, { authenticateOnboarding } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { checkUploadQuota } from '../middleware/entitlement.middleware.js';
import {
    attachGallerySchema,
    confirmUploadSchema,
    mediaIdParamSchema,
    uploadUrlSchema,
} from '../validators/media.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.post('/onboarding/upload-url', authenticateOnboarding, validate(uploadUrlSchema, 'body'), mediaController.requestOnboardingUploadUrl);
router.post('/onboarding/confirm', authenticateOnboarding, validate(confirmUploadSchema, 'body'), mediaController.confirmOnboardingUpload);

router.use(authenticate);

router.post('/upload-url', validate(uploadUrlSchema, 'body'), checkUploadQuota(), mediaController.requestUploadUrl);
router.post('/confirm', validate(confirmUploadSchema, 'body'), mediaController.confirmUpload);
router.post('/gallery', authorize(ROLES.BARBER), validate(attachGallerySchema, 'body'), mediaController.attachGallery);
router.get('/gallery', authorize(ROLES.BARBER), mediaController.getGallery);
router.get('/gallery/stats', authorize(ROLES.BARBER), mediaController.getGalleryStats);
router.get('/:id', validate(mediaIdParamSchema, 'params'), mediaController.getMedia);
router.delete('/:id', validate(mediaIdParamSchema, 'params'), mediaController.deleteMedia);

export default router;
