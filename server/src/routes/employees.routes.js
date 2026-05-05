import { Router } from 'express';

import * as employeeController from '../controllers/employee.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { uploadEmployeePhoto } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { paginationSchema } from '../validators/common.validator.js';
import {
    addEmployeeSchema,
    employeeAvailabilityQuerySchema,
    employeeIdParamSchema,
    toggleEmployeeStatusSchema,
    updateEmployeeAvailabilitySchema,
    updateEmployeeSchema,
} from '../validators/employee.validator.js';

const router = Router();

router.use(authenticate);

router.get('/analytics/availability', authorize(ROLES.BARBER), employeeController.getStaffAvailability);

router.get(
    '/:id/availability',
    validate(employeeIdParamSchema, 'params'),
    validate(employeeAvailabilityQuerySchema, 'query'),
    employeeController.getEmployeeAvailability,
);

router.use(authorize(ROLES.BARBER));

router.get('/', validate(paginationSchema, 'query'), employeeController.getEmployees);
router.get('/:id', validate(employeeIdParamSchema, 'params'), employeeController.getEmployeeById);
router.post('/', uploadEmployeePhoto, validate(addEmployeeSchema, 'body'), employeeController.addEmployee);
router.patch('/:id', validate(employeeIdParamSchema, 'params'), uploadEmployeePhoto, validate(updateEmployeeSchema, 'body'), employeeController.updateEmployee);
router.patch('/:id/availability', validate(employeeIdParamSchema, 'params'), validate(updateEmployeeAvailabilitySchema, 'body'), employeeController.updateEmployeeAvailability);
router.patch('/:id/status', validate(employeeIdParamSchema, 'params'), validate(toggleEmployeeStatusSchema, 'body'), employeeController.toggleEmployeeStatus);
router.delete('/:id', validate(employeeIdParamSchema, 'params'), employeeController.deleteEmployee);

export default router;
