import { Router } from 'express';

import * as serviceController from '../controllers/service.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import { addServiceSchema, serviceListQuerySchema, updateServiceSchema } from '../validators/service.validator.js';
import { searchServicesQuerySchema } from '../validators/shop.validator.js';

const router = Router();

router.get('/search', validate(searchServicesQuerySchema, 'query'), serviceController.searchServices);

router.use(authenticate, authorize(ROLES.BARBER));

router.get('/', validate(serviceListQuerySchema, 'query'), serviceController.getServices);
router.post('/', validate(addServiceSchema, 'body'), serviceController.addService);
router.put('/:id', validate(objectIdParamSchema, 'params'), validate(updateServiceSchema, 'body'), serviceController.updateService);
router.delete('/:id', validate(objectIdParamSchema, 'params'), serviceController.deleteService);

export default router;
